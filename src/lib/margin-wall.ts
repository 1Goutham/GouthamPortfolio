import { timingSafeEqual } from 'node:crypto';
import { del, list, put } from '@vercel/blob';

/**
 * The Margin wall: sketches visitors pin from /margin, kept in Vercel Blob
 * under margin/. Anything pinned shows straight away; Goutham removes what
 * shouldn't be there from /margin/wall (with MARGIN_ADMIN_KEY).
 *
 * Names count down from a far-future time, so in name order the newest
 * comes first too.
 */
const PREFIX = 'margin/';
const FAR = 9_999_999_999_999;

export const MAX_BYTES = 1_000_000;
const MIN_SIDE = 32;
const MAX_SIDE = 1600;

export type Sketch = { url: string; at: string };

export const wallConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function latest(limit = 40): Promise<Sketch[]> {
  // The store's list order isn't documented, so read it all (a page holds
  // 1000) and sort by upload time.
  const all: Sketch[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const res = await list({ prefix: PREFIX, cursor });
    for (const b of res.blobs) all.push({ url: b.url, at: new Date(b.uploadedAt).toISOString() });
    if (!res.hasMore) break;
    cursor = res.cursor;
  }
  return all.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

/** Width and height of a PNG or WebP, or null if it is neither. */
export function imageSize(buf: Buffer): { type: 'png' | 'webp'; w: number; h: number } | null {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
    return { type: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { type: 'webp', w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { type: 'webp', w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { type: 'webp', w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/** Why an upload isn't a sketch we'll pin, or null if it is fine. */
export function rejectReason(buf: Buffer): string | null {
  if (!buf.length) return 'Empty image.';
  if (buf.length > MAX_BYTES) return 'That image is too large.';
  const size = imageSize(buf);
  if (!size) return 'Only PNG or WebP images.';
  if (size.w < MIN_SIDE || size.h < MIN_SIDE || size.w > MAX_SIDE || size.h > MAX_SIDE) return 'Unexpected image size.';
  return null;
}

export async function pin(buf: Buffer): Promise<Sketch> {
  const type = imageSize(buf)!.type;
  const name = `${PREFIX}${String(FAR - Date.now()).padStart(13, '0')}.${type}`;
  const blob = await put(name, buf, {
    access: 'public',
    contentType: `image/${type}`,
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return { url: blob.url, at: new Date().toISOString() };
}

/** Only sketches on the wall can be removed through it. */
export async function unpin(url: string) {
  const u = new URL(url);
  if (!u.hostname.endsWith('.blob.vercel-storage.com') || !u.pathname.startsWith(`/${PREFIX}`)) {
    throw new Error('Not a wall sketch');
  }
  await del(url);
}

export function isAdmin(key: string | null): boolean {
  const want = process.env.MARGIN_ADMIN_KEY;
  if (!want || !key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
