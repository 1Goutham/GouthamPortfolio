import { NextRequest, NextResponse } from 'next/server';
import { clientIp, rateLimited } from '@/lib/api-guards';
import { MAX_BYTES, isAdmin, latest, pin, rejectReason, unpin, wallConfigured } from '@/lib/margin-wall';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const notSetUp = () => NextResponse.json({ configured: false, sketches: [] }, { headers: { 'Cache-Control': 'no-store' } });

/** GET: the latest sketches, newest first. With the admin key, more and uncached. */
export async function GET(req: NextRequest) {
  if (!wallConfigured()) return notSetUp();
  const admin = isAdmin(req.headers.get('x-margin-key'));
  if (req.headers.get('x-margin-key') && !admin) return NextResponse.json({ error: 'Wrong key' }, { status: 401 });
  try {
    const sketches = await latest(admin ? 300 : 40);
    return NextResponse.json(
      { configured: true, sketches },
      // The CDN keeps the public list for a few seconds, so a busy page
      // doesn't list the store on every visit.
      { headers: { 'Cache-Control': admin ? 'no-store' : 'public, s-maxage=15, stale-while-revalidate=60' } },
    );
  } catch (err) {
    console.error('Margin wall list failed:', err);
    return NextResponse.json({ configured: true, sketches: [], error: 'Wall unavailable' }, { status: 502 });
  }
}

/** POST an image body (PNG or WebP) to pin it to the wall. */
export async function POST(req: NextRequest) {
  if (!wallConfigured()) return NextResponse.json({ error: 'The wall is not set up yet.' }, { status: 503 });
  // A few sketches per visitor per ten minutes is plenty for a person.
  if (rateLimited('margin-pin', clientIp(req.headers), 3, 10 * 60_000)) {
    return NextResponse.json({ error: "That's a lot of art! Give it a few minutes." }, { status: 429 });
  }
  const length = Number(req.headers.get('content-length') || 0);
  if (length > MAX_BYTES) return NextResponse.json({ error: 'That image is too large.' }, { status: 413 });

  const buf = Buffer.from(await req.arrayBuffer());
  const reason = rejectReason(buf);
  if (reason) return NextResponse.json({ error: reason }, { status: 400 });
  try {
    return NextResponse.json({ sketch: await pin(buf) }, { status: 201 });
  } catch (err) {
    console.error('Margin wall pin failed:', err);
    return NextResponse.json({ error: "Couldn't pin it right now." }, { status: 502 });
  }
}

/** DELETE { url } with the admin key: take a sketch down. */
export async function DELETE(req: NextRequest) {
  if (!wallConfigured()) return NextResponse.json({ error: 'The wall is not set up yet.' }, { status: 503 });
  if (!isAdmin(req.headers.get('x-margin-key'))) return NextResponse.json({ error: 'Wrong key' }, { status: 401 });
  let url = '';
  try {
    url = String((await req.json())?.url || '');
    await unpin(url);
  } catch (err) {
    console.error('Margin wall delete failed:', err);
    return NextResponse.json({ error: "Couldn't remove that one." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
