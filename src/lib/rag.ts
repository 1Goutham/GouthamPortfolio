import { KNOWLEDGE, type KnowledgeChunk } from '../data/knowledge';

/**
 * Retrieval for G-Talk and the site agent.
 *
 *   question ──► keyword score (BM25) ─┐
 *            └► embedding similarity ──┴─► blend ──► top k entries
 *
 * Keyword scoring always runs, so retrieval works with no API key at all.
 * When GEMINI_API_KEY is set, the knowledge base is embedded once per server
 * instance (one batch call, cached) and each question costs one more small
 * embedding call; the two scores are blended. If embedding fails for any
 * reason, keyword scores carry on alone and embedding is retried later.
 */

const API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const EMBED_TIMEOUT_MS = 8_000;
const RETRY_AFTER_MS = 5 * 60_000;
const DEFAULT_K = 6;
/** How much of the blended score comes from embeddings when they are available. */
const SEMANTIC_WEIGHT = 0.65;

/* ------------------------------------------------------------------ */
/*  Keyword scoring (BM25)                                              */
/* ------------------------------------------------------------------ */

const STOP = new Set(
  'a an and are as at be but by can do does for from has have he her him his how i in is it its me my of on or our so that the their them they this to us was we what when where which who why will with you your'.split(' ')
);

/** A rough stem, so "prices"/"price" and "studied"/"study" meet. */
function stem(t: string): string {
  if (t.length <= 3) return t;
  const s = t.replace(/ies$/, 'y').replace(/(ing|ed|es|s)$/, '').replace(/e$/, '').replace(/i$/, 'y');
  return s.length > 1 ? s : t;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}

// Everyday words visitors use for things the knowledge names differently.
// Only applied to the question, and only for keyword scoring; embeddings
// handle this on their own.
const SYNONYMS: Record<string, string[]> = {
  kit: ['skill', 'tool', 'stack'],
  stack: ['skill', 'tool'],
  tech: ['skill', 'stack'],
  study: ['education', 'degree'],
  college: ['education'],
  degree: ['education'],
  university: ['education'],
  story: ['beyond', 'journey'],
  journey: ['beyond'],
  cost: ['price', 'scope'],
  price: ['scope'],
  budget: ['price', 'scope'],
  charge: ['price'],
  hire: ['availability', 'freelance', 'works'],
  freelance: ['works', 'availability'],
  business: ['works', 'service'],
  website: ['web', 'service', 'works'],
  site: ['web'],
  reach: ['contact'],
  email: ['contact'],
  touch: ['contact'],
  draw: ['margin', 'drawing'],
  sketch: ['margin', 'drawing'],
  paint: ['margin'],
  game: ['arcade'],
  play: ['arcade', 'game'],
  job: ['experience', 'role'],
  career: ['experience', 'goal'],
};

const SYNONYMS_BY_STEM = new Map(Object.entries(SYNONYMS).map(([k, v]) => [stem(k), v]));

function expand(query: string): string {
  const extra = tokens(query).flatMap((t) => SYNONYMS_BY_STEM.get(t) ?? []);
  return extra.length ? `${query} ${extra.join(' ')}` : query;
}

const docText = (c: KnowledgeChunk) => `${c.title} ${c.title} ${c.text}`;
const DOCS = KNOWLEDGE.map((c) => tokens(docText(c)));
const AVG_LEN = DOCS.reduce((n, d) => n + d.length, 0) / DOCS.length;
const DF = new Map<string, number>();
for (const d of DOCS) for (const t of new Set(d)) DF.set(t, (DF.get(t) ?? 0) + 1);

function bm25(query: string): number[] {
  const q = [...new Set(tokens(query))];
  const k1 = 1.4;
  const b = 0.72;
  return DOCS.map((d) => {
    let score = 0;
    for (const t of q) {
      const df = DF.get(t);
      if (!df) continue;
      let tf = 0;
      for (const w of d) if (w === t) tf++;
      if (!tf) continue;
      const idf = Math.log(1 + (DOCS.length - df + 0.5) / (df + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.length) / AVG_LEN)));
    }
    return score;
  });
}

/* ------------------------------------------------------------------ */
/*  Embeddings (Gemini)                                                 */
/* ------------------------------------------------------------------ */

type Vec = number[];
let docVectors: Promise<Vec[] | null> | null = null;
let failedAt = 0;

async function post(path: string, body: unknown): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('no key');
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`embedding failed (${res.status}): ${(await res.text().catch(() => '')).slice(0, 160)}`);
  return res.json();
}

function normalise(v: Vec): Vec {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

function embedDocs(): Promise<Vec[] | null> {
  if (docVectors) return docVectors;
  docVectors = (async () => {
    const data = (await post(`models/${EMBED_MODEL}:batchEmbedContents`, {
      requests: KNOWLEDGE.map((c) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: `${c.title}: ${c.text}` }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        title: c.title,
      })),
    })) as { embeddings?: { values?: Vec }[] };
    const vecs = data.embeddings?.map((e) => e.values ?? []) ?? [];
    if (vecs.length !== KNOWLEDGE.length || vecs.some((v) => !v.length)) throw new Error('embedding count mismatch');
    return vecs.map(normalise);
  })().catch((err) => {
    console.warn('RAG: document embeddings unavailable, using keyword retrieval.', err instanceof Error ? err.message : err);
    failedAt = Date.now();
    docVectors = null;
    return null;
  });
  return docVectors;
}

async function semantic(query: string): Promise<number[] | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  if (failedAt && Date.now() - failedAt < RETRY_AFTER_MS) return null;
  try {
    const [docs, q] = await Promise.all([
      embedDocs(),
      post(`models/${EMBED_MODEL}:embedContent`, {
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: query }] },
        taskType: 'RETRIEVAL_QUERY',
      }) as Promise<{ embedding?: { values?: Vec } }>,
    ]);
    const qv = q.embedding?.values;
    if (!docs || !qv?.length) return null;
    const n = normalise(qv);
    return docs.map((d) => d.reduce((s, x, i) => s + x * (n[i] ?? 0), 0));
  } catch (err) {
    console.warn('RAG: query embedding failed, using keyword retrieval.', err instanceof Error ? err.message : err);
    failedAt = Date.now();
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Retrieval                                                           */
/* ------------------------------------------------------------------ */

const scale = (xs: number[]) => {
  const max = Math.max(...xs);
  const min = Math.min(...xs);
  return xs.map((x) => (max > min ? (x - min) / (max - min) : 0));
};

/** Entries that always ride along: who Goutham is, so no answer starts cold. */
const ANCHORS = new Set(['bio']);

/**
 * The `k` entries most relevant to `query`, best first. `context` (the last
 * few turns) is mixed in at low weight so follow-ups like "and the second
 * one?" still retrieve the right thing.
 */
export async function retrieve(query: string, context = '', k = DEFAULT_K): Promise<KnowledgeChunk[]> {
  const words = bm25(expand(query));
  const ctx = context ? bm25(context) : null;
  const keyword = scale(words.map((s, i) => s + (ctx ? ctx[i] * 0.35 : 0)));
  const sem = await semantic(context ? `${context}\n${query}` : query);
  const blended = keyword.map((kw, i) => (sem ? SEMANTIC_WEIGHT * sem[i] + (1 - SEMANTIC_WEIGHT) * kw : kw));

  const ranked = blended
    .map((score, i) => ({ score, i }))
    .sort((a, b) => b.score - a.score)
    .filter((r, n) => n < k && (sem || r.score > 0));
  const picked = new Set(ranked.map((r) => r.i));
  KNOWLEDGE.forEach((c, i) => ANCHORS.has(c.id) && picked.add(i));
  // Nothing matched by keyword alone: hand over the overview entries instead.
  if (!sem && ranked.length === 0) KNOWLEDGE.forEach((c, i) => ['positioning', 'site-map', 'contact'].includes(c.id) && picked.add(i));

  const order = [...ranked.map((r) => r.i), ...[...picked].filter((i) => !ranked.some((r) => r.i === i))];
  return order.map((i) => KNOWLEDGE[i]);
}

/** Retrieved entries as a block for a system prompt. */
export function asContext(chunks: KnowledgeChunk[]): string {
  return chunks.map((c) => `[${c.title}] ${c.text}`).join('\n\n');
}
