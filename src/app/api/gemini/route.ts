import { NextRequest, NextResponse } from 'next/server';
import { answer, GeminiError, type Turn } from '@/lib/rag';

export const runtime = 'nodejs';

const MAX_QUESTION_CHARS = 500;
const MAX_HISTORY_TURNS = 8;

// Light per-IP rate limit so a stray script can't burn the API quota.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function parseHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is Turn =>
        t && typeof t === 'object' && (t.role === 'user' || t.role === 'model') && typeof t.text === 'string'
    )
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_QUESTION_CHARS * 2) }))
    .slice(-MAX_HISTORY_TURNS);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  let body: { question?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return NextResponse.json({ error: 'Missing "question"' }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json({ error: `Question is too long (max ${MAX_QUESTION_CHARS} characters)` }, { status: 400 });
  }

  try {
    const result = await answer(question, parseHistory(body.history));
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(err.message);
      const status = err.status === 429 || err.status === 403 ? err.status : 502;
      return NextResponse.json({ error: 'The assistant is unavailable right now.' }, { status });
    }
    console.error('G-Talk error:', err);
    const message = err instanceof Error && err.message.includes('GEMINI_API_KEY') ? 'Assistant is not configured.' : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
