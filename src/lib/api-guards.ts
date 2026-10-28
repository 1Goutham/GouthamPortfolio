import { ProviderError, type Turn } from './gtalk';

/** Shared request handling for the G-Talk and agent routes. */

export const MAX_QUESTION_CHARS = 500;
const MAX_HISTORY_TURNS = 8;

// Light per-IP rate limit so a stray script can't burn the API quota. Each
// route keeps its own bucket.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const buckets = new Map<string, Map<string, number[]>>();

export function rateLimited(route: string, ip: string, max = MAX_PER_WINDOW, windowMs = WINDOW_MS): boolean {
  const hits = buckets.get(route) ?? new Map<string, number[]>();
  buckets.set(route, hits);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > max;
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export function parseHistory(raw: unknown): Turn[] {
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
 * Map an upstream provider failure to what the visitor should see. The
 * provider's own message rides along as `detail` (it never contains the key)
 * so the cause is visible in the browser as well as the server log.
 */
export function upstreamError(err: ProviderError): { status: number; error: string; detail: string } {
  const detail = err.message.replace(/^(Gemini|Grok) .*? failed \(\d+\): /, '');
  const keyRejected = err.status === 401 || err.status === 403 || (err.status === 400 && /api key/i.test(err.message));
  if (keyRejected) return { status: 403, error: 'The assistant is not configured correctly.', detail };
  if (err.status === 429) return { status: 429, error: 'Too many questions right now. Give it a moment.', detail };
  if (err.status === 504) return { status: 504, error: 'The assistant took too long to reply. Please try again.', detail };
  return { status: 502, error: 'The assistant is unavailable right now.', detail };
}
