import { createHash } from 'node:crypto';
import { KNOWLEDGE, type KnowledgeChunk } from '../data/knowledge';

/**
 * Retrieval-augmented answering for G-Talk, on the Gemini REST API.
 *
 *   question ──► embed ──► cosine search over the knowledge base ──► top-k
 *   chunks ──► Gemini writes an answer grounded in those chunks only.
 *
 * The chunk index is built lazily on the first request and cached in module
 * scope, keyed by a hash of the knowledge text, so edits are picked up after
 * a deploy without any manual rebuild step. If embeddings are unavailable the
 * search falls back to keyword overlap so the bot keeps working.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const EMBED_DIMS = 768;
const TOP_K = 4;
/** Chunks scoring within this margin of the best match are kept. */
const SCORE_MARGIN = 0.12;

export type Turn = { role: 'user' | 'model'; text: string };
export type Retrieved = KnowledgeChunk & { score: number };
export type Answer = { reply: string; sources: string[] };

type IndexedChunk = KnowledgeChunk & { vector: Float32Array | null; tokens: Set<string> };

const SYSTEM_PROMPT = `You are G-Talk, the assistant on Goutham Gopinath's portfolio website. Speak about Goutham in the third person, warmly and professionally.

Rules:
- Answer ONLY from the CONTEXT provided in each message. Do not invent facts, dates, employers, projects or contact details.
- If the context does not contain the answer, say so briefly and suggest asking about Goutham's skills, projects, experience or how to reach him.
- Keep answers short: one to three sentences, plain text, no headings or bullet lists. Markdown links are fine when a URL is in the context.
- If a visitor asks something unrelated to Goutham (general trivia, coding help, personal questions), politely steer back to his work.`;

// ---------------------------------------------------------------------------
// Gemini REST helpers
// ---------------------------------------------------------------------------

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return key;
}

async function gemini<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new GeminiError(res.status, `Gemini ${path} failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export class GeminiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type EmbedResponse = { embeddings: { values: number[] }[] };

async function embed(texts: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<Float32Array[]> {
  const data = await gemini<EmbedResponse>(`models/${EMBED_MODEL}:batchEmbedContents`, {
    requests: texts.map((text) => ({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: EMBED_DIMS,
    })),
  });
  return data.embeddings.map((e) => normalize(Float32Array.from(e.values)));
}

// ---------------------------------------------------------------------------
// Vector + keyword math (pure, exported for tests)
// ---------------------------------------------------------------------------

export function normalize(v: Float32Array): Float32Array {
  let sum = 0;
  for (const x of v) sum += x * x;
  const len = Math.sqrt(sum) || 1;
  return v.map((x) => x / len);
}

/** Dot product of two unit vectors == cosine similarity. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'of', 'to', 'in', 'on', 'and', 'or', 'what', 'who', 'how', 'do', 'does', 'did', 'his', 'he', 'i', 'you', 'me', 'about', 'tell', 'can', 'with', 'for', 'it', 'at']);

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP.has(t))
  );
}

/** Fraction of query tokens that appear in the chunk. */
export function keywordScore(query: Set<string>, chunk: Set<string>): number {
  if (query.size === 0) return 0;
  let hits = 0;
  for (const t of query) if (chunk.has(t)) hits++;
  return hits / query.size;
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

let index: { hash: string; chunks: IndexedChunk[] } | null = null;

function knowledgeHash(): string {
  return createHash('sha1').update(KNOWLEDGE.map((c) => c.id + c.text).join('\n')).digest('hex');
}

export async function getIndex(): Promise<IndexedChunk[]> {
  const hash = knowledgeHash();
  if (index && index.hash === hash) return index.chunks;

  let vectors: (Float32Array | null)[];
  try {
    vectors = await embed(KNOWLEDGE.map((c) => `${c.title}: ${c.text}`), 'RETRIEVAL_DOCUMENT');
  } catch (err) {
    console.error('Embedding the knowledge base failed; using keyword search only.', err);
    vectors = KNOWLEDGE.map(() => null);
  }

  const chunks = KNOWLEDGE.map((c, i) => ({ ...c, vector: vectors[i], tokens: tokenize(`${c.title} ${c.text}`) }));
  // Only cache a complete vector index; a keyword-only build is retried next time.
  if (vectors.every(Boolean)) index = { hash, chunks };
  return chunks;
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export async function retrieve(question: string, k = TOP_K): Promise<Retrieved[]> {
  const chunks = await getIndex();
  const qTokens = tokenize(question);

  let qVector: Float32Array | null = null;
  if (chunks.every((c) => c.vector)) {
    try {
      [qVector] = await embed([question], 'RETRIEVAL_QUERY');
    } catch (err) {
      console.error('Embedding the question failed; using keyword search only.', err);
    }
  }

  const scored = chunks.map((c) => {
    const kw = keywordScore(qTokens, c.tokens);
    // Blend: semantic similarity carries the score, keyword overlap nudges it.
    const score = qVector && c.vector ? 0.8 * cosine(qVector, c.vector) + 0.2 * kw : kw;
    return { id: c.id, title: c.title, text: c.text, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Keep the best chunk plus any close runners-up. A relative margin works
  // across embedding models, whose absolute cosine ranges differ a lot.
  const best = scored[0]?.score ?? 0;
  return scored.slice(0, k).filter((c, i) => i === 0 || c.score >= best - SCORE_MARGIN);
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

type GenerateResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
};

export async function answer(question: string, history: Turn[] = []): Promise<Answer> {
  const retrieved = await retrieve(question);
  const context = retrieved.map((c, i) => `[${i + 1}] (${c.title}) ${c.text}`).join('\n\n');

  const contents = [
    ...history.slice(-6).map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: 'user', parts: [{ text: `CONTEXT:\n${context}\n\nQUESTION: ${question}` }] },
  ];

  const data = await gemini<GenerateResponse>(`models/${CHAT_MODEL}:generateContent`, {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
  });

  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() || "I'm not sure how to answer that. Try asking about Goutham's skills, projects or experience.";

  const sources = [...new Set(retrieved.map((c) => c.title))];
  return { reply, sources };
}
