import { NextRequest, NextResponse } from 'next/server';
import { answer, GeminiError, type Turn } from '@/lib/gtalk';

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

/**
 * Map an upstream Gemini failure to what the visitor should see. Gemini's own
 * message rides along as `detail` (it never contains the key) so the cause is
 * visible in the browser as well as the server log.
 */
function upstreamError(err: GeminiError): { status: number; error: string; detail: string } {
  const detail = err.message.replace(/^Gemini .*? failed \(\d+\): /, '');
  const keyRejected = err.status === 403 || (err.status === 400 && /api key/i.test(err.message));
  if (keyRejected) return { status: 403, error: 'The assistant is not configured correctly.', detail };
  if (err.status === 429) return { status: 429, error: 'Too many questions right now. Give it a moment.', detail };
  if (err.status === 504) return { status: 504, error: 'The assistant took too long to reply. Please try again.', detail };
  return { status: 502, error: 'The assistant is unavailable right now.', detail };
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
      const { status, error, detail } = upstreamError(err);
      return NextResponse.json({ error, detail }, { status });
    }
    console.error('G-Talk error:', err);
    const message = err instanceof Error && err.message.includes('GEMINI_API_KEY') ? 'Assistant is not configured.' : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
