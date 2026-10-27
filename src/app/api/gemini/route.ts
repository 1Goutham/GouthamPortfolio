import { NextRequest, NextResponse } from 'next/server';
import { answer, ProviderError } from '@/lib/gtalk';
import { MAX_QUESTION_CHARS, clientIp, parseHistory, rateLimited, upstreamError } from '@/lib/api-guards';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (rateLimited('gtalk', clientIp(req.headers))) {
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
    if (err instanceof ProviderError) {
      console.error(err.message);
      const { status, error, detail } = upstreamError(err);
      return NextResponse.json({ error, detail }, { status });
    }
    console.error('G-Talk error:', err);
    const message = err instanceof Error && /API_KEY|No provider configured/.test(err.message) ? 'Assistant is not configured.' : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
