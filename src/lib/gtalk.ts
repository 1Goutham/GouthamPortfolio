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

export async function answer(question: string, history: Turn[] = []): Promise<Answer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const contents = [
    ...history.slice(-HISTORY_TURNS).map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: 'user', parts: [{ text: question }] },
  ];

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/models/${CHAT_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new GeminiError(504, `Gemini request failed: ${reason}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new GeminiError(res.status, `Gemini ${CHAT_MODEL} failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as GenerateResponse;
  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  return { reply: reply || FALLBACK_REPLY };
}
