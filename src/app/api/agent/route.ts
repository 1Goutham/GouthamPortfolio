import { NextRequest, NextResponse } from 'next/server';
import { plan } from '@/lib/agent';
import { MAX_QUESTION_CHARS, clientIp, parseHistory, rateLimited } from '@/lib/api-guards';

export const runtime = 'nodejs';

/**
 * The site agent. POST { question, history, path } and get back
 * { reply, actions } where every action names an entry in
 * src/data/site-map.ts. It always answers: if no model is available the
 * offline planner replies, flagged with `offline: true`.
 */
export async function POST(req: NextRequest) {
  if (rateLimited('agent', clientIp(req.headers))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  let body: { question?: unknown; history?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) return NextResponse.json({ error: 'Missing "question"' }, { status: 400 });
  if (question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json({ error: `Question is too long (max ${MAX_QUESTION_CHARS} characters)` }, { status: 400 });
  }
  const path = typeof body.path === 'string' && /^\/[\w\-/#]*$/.test(body.path) ? body.path.slice(0, 60) : '/';

  try {
    return NextResponse.json(await plan(question, parseHistory(body.history), path));
  } catch (err) {
    console.error('Agent error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
