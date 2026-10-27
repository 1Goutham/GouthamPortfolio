import { asContext, retrieve } from './rag';

/**
 * G-Talk answering, by retrieval:
 *
 *   question ──► retrieve the closest knowledge entries (src/lib/rag.ts)
 *            ──► Grok or Gemini, with only those entries in the prompt ──► reply
 *
 * Two providers are wired in: xAI's Grok (OpenAI-compatible chat completions)
 * and Google's Gemini. Whichever keys are set are used; when both are, the
 * first one is tried and the other answers if it fails. GTALK_PROVIDER picks
 * which goes first ("grok" or "gemini"); unset, Grok goes first when its key
 * is present. `complete()` is the shared entry point; the site agent
 * (src/lib/agent.ts) uses it too.
 */

const API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash';
const XAI_API_BASE = process.env.XAI_API_BASE || 'https://api.x.ai/v1';
const XAI_CHAT_MODEL = process.env.XAI_CHAT_MODEL || 'grok-4-fast';
const TIMEOUT_MS = 25_000;
const HISTORY_TURNS = 6;

export type Turn = { role: 'user' | 'model'; text: string };
export type Provider = 'grok' | 'gemini';
export type Answer = { reply: string; provider: Provider };
/** `json`: ask the model for a single JSON object instead of prose. */
export type CompleteOptions = { json?: boolean; temperature?: number };

/** An upstream model call that failed. `provider` names which one. */
export class ProviderError extends Error {
  status: number;
  provider: Provider;
  constructor(provider: Provider, status: number, message: string) {
    super(message);
    this.status = status;
    this.provider = provider;
  }
}
/** Kept for callers that still import the old name. */
export const GeminiError = ProviderError;

const FALLBACK_REPLY = "I'm not sure how to answer that. Try asking about Goutham's skills, projects or experience.";

/** Shared voice and guardrails for both G-Talk and the site agent. */
export const VOICE_RULES = `- Answer ONLY from the KNOWLEDGE below. Do not invent facts, dates, employers, clients, prices, projects or contact details.
- If the knowledge does not contain the answer, say so briefly and suggest asking about Goutham's skills, projects, experience, 1G-works or how to reach him.
- If a visitor asks something unrelated to Goutham (general trivia, coding help, personal questions), politely steer back to his work.
- Never name the AI model, company or API you run on. If asked what powers you, say you are G-Talk, an assistant Goutham built for this site, and leave it there.
- Use British English spelling (personalised, optimise, centre).
- Be precise about depth: distinguish professional experience, hands-on projects, experiments and current learning. Never claim mastery of every technology listed, and describe unconfirmed features as planned or experimental.
- Do not share personal details that are irrelevant to the question.`;

const gtalkPrompt = (knowledge: string) => `You are G-Talk, the assistant on Goutham Gopinath's portfolio website. Speak about Goutham in the third person, warmly and professionally.

Rules:
${VOICE_RULES}
- Keep answers short: one to three sentences, plain text, no headings or bullet lists. Markdown links are fine when a URL is in the knowledge.

KNOWLEDGE (the entries most relevant to this question):
${knowledge}`;

type GenerateResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

type ModelList = { models?: { name: string; supportedGenerationMethods?: string[] }[] };

/** Pull Gemini's human-readable message out of an error body, if there is one. */
export function geminiMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    /* not JSON */
  }
  return body.slice(0, 200);
}

async function call(key: string, path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_BASE}/${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new ProviderError('gemini', 504, `Gemini request failed: ${reason}`);
  }
}

/**
 * Model names get retired. When the configured one 404s, ask Gemini which
 * models this key can use and pick the newest Flash model that supports
 * generateContent. The choice is cached for the life of the function instance.
 */
let discoveredModel: string | null = null;

async function discoverModel(key: string): Promise<string | null> {
  if (discoveredModel) return discoveredModel;
  const res = await call(key, 'models?pageSize=200', { method: 'GET' });
  if (!res.ok) return null;
  const data = (await res.json()) as ModelList;
  const candidates = (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /flash/i.test(n) && !/lite|preview|exp|image|tts|live|audio|8b/i.test(n))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  discoveredModel = candidates[0] ?? null;
  if (discoveredModel) console.warn(`G-Talk: ${CHAT_MODEL} is unavailable; using ${discoveredModel} instead.`);
  return discoveredModel;
}

async function generate(key: string, model: string, body: unknown): Promise<Response> {
  return call(key, `models/${model}:generateContent`, { method: 'POST', body: JSON.stringify(body) });
}

/** Visible text of the first candidate (thought parts, when present, are skipped). */
function replyText(data: GenerateResponse): string {
  return (
    data.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('')
      .trim() ?? ''
  );
}

async function askGemini(system: string, question: string, history: Turn[], opts: CompleteOptions): Promise<Answer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const contents = [
    ...history.slice(-HISTORY_TURNS).map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: 'user', parts: [{ text: question }] },
  ];

  // On the current Flash models the output budget is shared with the model's
  // hidden "thinking" tokens, so a small cap cuts the visible answer off
  // mid-sentence. Give it room, and ask the model not to think out loud for
  // what is a short factual reply. Older models reject thinkingConfig (and
  // some reject JSON mode), so drop whichever a 400 names and retry.
  let thinking = true;
  let json = Boolean(opts.json);
  const makeBody = (maxOutputTokens: number) => ({
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
      ...(thinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  });

  let model = discoveredModel ?? CHAT_MODEL;
  let res = await generate(key, model, makeBody(1024));

  for (let tries = 0; res.status === 400 && tries < 2; tries++) {
    const detail = await res.clone().text().catch(() => '');
    if (thinking && /thinking/i.test(detail)) thinking = false;
    else if (json && /mime|json/i.test(detail)) json = false;
    else break;
    res = await generate(key, model, makeBody(1024));
  }

  // The configured model is gone for this key: find one that works and retry once.
  if (res.status === 404 && !process.env.GEMINI_CHAT_MODEL) {
    const found = await discoverModel(key);
    if (found && found !== model) {
      model = found;
      res = await generate(key, model, makeBody(1024));
    }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ProviderError('gemini', res.status, `Gemini ${model} failed (${res.status}): ${geminiMessage(detail)}`);
  }

  let data = (await res.json()) as GenerateResponse;

  // Ran out of budget anyway (a model that insists on thinking): retry once
  // with a much larger cap rather than hand back half a sentence.
  if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    const retry = await generate(key, model, makeBody(4096));
    if (retry.ok) data = (await retry.json()) as GenerateResponse;
  }

  const reply = replyText(data);
  return { reply: reply || FALLBACK_REPLY, provider: 'gemini' };
}

/* ------------------------------------------------------------------ */
/*  Grok (xAI)                                                          */
/* ------------------------------------------------------------------ */

type ChatCompletion = {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
};

async function askGrok(system: string, question: string, history: Turn[], opts: CompleteOptions): Promise<Answer> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error('XAI_API_KEY is not set');

  const messages = [
    { role: 'system', content: system },
    ...history.slice(-HISTORY_TURNS).map((t) => ({ role: t.role === 'model' ? 'assistant' : 'user', content: t.text })),
    { role: 'user', content: question },
  ];
  const body = (max_tokens: number) => ({
    model: XAI_CHAT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens,
    stream: false,
    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
  });

  const post = async (max_tokens: number): Promise<Response> => {
    try {
      return await fetch(`${XAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body(max_tokens)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new ProviderError('grok', 504, `Grok request failed: ${reason}`);
    }
  };

  let res = await post(1024);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ProviderError('grok', res.status, `Grok ${XAI_CHAT_MODEL} failed (${res.status}): ${geminiMessage(detail)}`);
  }
  let data = (await res.json()) as ChatCompletion;

  // Same guard as Gemini: never hand back half a sentence.
  if (data.choices?.[0]?.finish_reason === 'length') {
    res = await post(4096);
    if (res.ok) data = (await res.json()) as ChatCompletion;
  }

  const reply = data.choices?.[0]?.message?.content?.trim() ?? '';
  return { reply: reply || FALLBACK_REPLY, provider: 'grok' };
}

/* ------------------------------------------------------------------ */
/*  Provider selection                                                  */
/* ------------------------------------------------------------------ */

/** Providers with a key set, in the order to try them. */
export function providerOrder(): Provider[] {
  const hasGrok = Boolean(process.env.XAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const preferred = (process.env.GTALK_PROVIDER || '').toLowerCase();
  const order: Provider[] = preferred === 'gemini' ? ['gemini', 'grok'] : ['grok', 'gemini'];
  return order.filter((p) => (p === 'grok' ? hasGrok : hasGemini));
}

const ASK: Record<Provider, typeof askGrok> = { grok: askGrok, gemini: askGemini };

/**
 * Run one prompt with the first configured provider; if it fails upstream
 * (bad key, quota, outage, timeout) and another is configured, run it with
 * that one instead. Only the last failure is thrown.
 */
export async function complete(system: string, question: string, history: Turn[] = [], opts: CompleteOptions = {}): Promise<Answer> {
  const order = providerOrder();
  if (order.length === 0) throw new Error('No provider configured: set XAI_API_KEY and/or GEMINI_API_KEY');

  let lastError: unknown;
  for (const provider of order) {
    try {
      return await ASK[provider](system, question, history, opts);
    } catch (err) {
      lastError = err;
      if (!(err instanceof ProviderError)) throw err;
      console.error(`G-Talk: ${provider} failed, ${order.indexOf(provider) < order.length - 1 ? 'trying the next provider' : 'no provider left'}:`, err.message);
    }
  }
  throw lastError;
}

/** The last couple of visitor turns, used to steer retrieval for follow-ups. */
export function recentContext(history: Turn[]): string {
  return history
    .filter((t) => t.role === 'user')
    .slice(-2)
    .map((t) => t.text)
    .join('\n');
}

/** G-Talk: retrieve what's relevant to the question, then answer from it. */
export async function answer(question: string, history: Turn[] = []): Promise<Answer> {
  if (providerOrder().length === 0) throw new Error('No provider configured: set XAI_API_KEY and/or GEMINI_API_KEY');
  const chunks = await retrieve(question, recentContext(history));
  return complete(gtalkPrompt(asContext(chunks)), question, history);
}
