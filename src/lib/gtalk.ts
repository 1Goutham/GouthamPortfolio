import { KNOWLEDGE } from '../data/knowledge';

/**
 * G-Talk answering, kept deliberately simple:
 *
 *   question ──► Gemini (knowledge base in the system prompt) ──► reply
 *
 * The knowledge base is small enough to hand to the model whole, so there is
 * no embedding step, no index to build and exactly one API call per question.
 */

const API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash';
const TIMEOUT_MS = 25_000;
const HISTORY_TURNS = 6;

export type Turn = { role: 'user' | 'model'; text: string };
export type Answer = { reply: string };

export class GeminiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const FALLBACK_REPLY = "I'm not sure how to answer that. Try asking about Goutham's skills, projects or experience.";

/** The whole knowledge base, grouped by section, as one block of text. */
function knowledgeText(): string {
  const bySection = new Map<string, string[]>();
  for (const chunk of KNOWLEDGE) {
    const list = bySection.get(chunk.title) ?? [];
    list.push(chunk.text);
    bySection.set(chunk.title, list);
  }
  return [...bySection].map(([title, texts]) => `## ${title}\n${texts.join('\n')}`).join('\n\n');
}

const SYSTEM_PROMPT = `You are G-Talk, the assistant on Goutham Gopinath's portfolio website. Speak about Goutham in the third person, warmly and professionally.

Rules:
- Answer ONLY from the KNOWLEDGE below. Do not invent facts, dates, employers, projects or contact details.
- If the knowledge does not contain the answer, say so briefly and suggest asking about Goutham's skills, projects, experience or how to reach him.
- Keep answers short: one to three sentences, plain text, no headings or bullet lists. Markdown links are fine when a URL is in the knowledge.
- If a visitor asks something unrelated to Goutham (general trivia, coding help, personal questions), politely steer back to his work.

KNOWLEDGE:
${knowledgeText()}`;

type GenerateResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
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
    throw new GeminiError(504, `Gemini request failed: ${reason}`);
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

export async function answer(question: string, history: Turn[] = []): Promise<Answer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const contents = [
    ...history.slice(-HISTORY_TURNS).map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: 'user', parts: [{ text: question }] },
  ];
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
  };

  let model = discoveredModel ?? CHAT_MODEL;
  let res = await generate(key, model, body);

  // The configured model is gone for this key: find one that works and retry once.
  if (res.status === 404 && !process.env.GEMINI_CHAT_MODEL) {
    const found = await discoverModel(key);
    if (found && found !== model) {
      model = found;
      res = await generate(key, model, body);
    }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new GeminiError(res.status, `Gemini ${model} failed (${res.status}): ${geminiMessage(detail)}`);
  }

  const data = (await res.json()) as GenerateResponse;
  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  return { reply: reply || FALLBACK_REPLY };
}
