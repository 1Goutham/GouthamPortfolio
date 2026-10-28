"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import TransitionLink from "../components/layout/transition-link";

/**
 * The Margin wall: what visitors drew and pinned up, newest first. One fetch
 * per page (shared by everything that shows the wall); a sketch you pin
 * yourself goes straight to the front without waiting for the list.
 */
let loaded = null;
const listeners = new Set();
let state = { configured: false, sketches: [], ready: false };
const emit = () => listeners.forEach((f) => f(state));

function load() {
  if (!loaded) {
    loaded = fetch("/api/margin")
      .then((r) => r.json())
      .then((d) => {
        state = { configured: !!d.configured, sketches: Array.isArray(d.sketches) ? d.sketches : [], ready: true };
        emit();
      })
      .catch(() => {
        state = { ...state, ready: true };
        emit();
      });
  }
  return loaded;
}

export function useWall(enabled = true) {
  const [s, set] = useState(state);
  useEffect(() => {
    if (!enabled) return;
    listeners.add(set);
    load();
    set(state);
    return () => listeners.delete(set);
  }, [enabled]);
  return s;
}

/** Pin a sketch; resolves with it, or throws with a message to show. */
export async function pinSketch(blob) {
  const r = await fetch("/api/margin", { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Couldn't pin it right now.");
  const mine = { ...d.sketch, mine: true };
  state = { ...state, sketches: [mine, ...state.sketches.filter((x) => x.url !== mine.url)] };
  emit();
  return mine;
}

/**
 * The drawing as it goes on the wall: cropped to what was drawn (with a
 * margin of paper round it), at most 900px across, on white, signed, WebP
 * where the browser can make it.
 */
export function wallBlob(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  // Find the ink on a quarter-size copy: cheap, and plenty for a crop box.
  const q = 4;
  const probe = document.createElement("canvas");
  probe.width = Math.max(1, Math.ceil(W / q));
  probe.height = Math.max(1, Math.ceil(H / q));
  const pc = probe.getContext("2d", { willReadFrequently: true });
  pc.drawImage(canvas, 0, 0, probe.width, probe.height);
  const { data } = pc.getImageData(0, 0, probe.width, probe.height);
  let x0 = probe.width, y0 = probe.height, x1 = -1, y1 = -1;
  for (let y = 0; y < probe.height; y++) {
    for (let x = 0; x < probe.width; x++) {
      const i = (y * probe.width + x) * 4;
      // Ink is anything not transparent and not paper-white.
      if (data[i + 3] > 12 && !(data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return Promise.resolve(null);
  let cx0 = x0 * q, cy0 = y0 * q, cw = (x1 - x0 + 1) * q, ch = (y1 - y0 + 1) * q;
  // Paper round the drawing, and nothing thinner than a 3:1 strip.
  const pad = Math.max(cw, ch) * 0.08 + 12;
  cx0 -= pad; cy0 -= pad; cw += pad * 2; ch += pad * 2;
  if (cw < ch / 3) { cx0 -= (ch / 3 - cw) / 2; cw = ch / 3; }
  if (ch < cw / 3) { cy0 -= (cw / 3 - ch) / 2; ch = cw / 3; }
  const scale = Math.min(1, 900 / Math.max(cw, ch));
  const out = document.createElement("canvas");
  out.width = Math.max(48, Math.round(cw * scale));
  out.height = Math.max(48, Math.round(ch * scale));
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, cx0, cy0, cw, ch, 0, 0, out.width, out.height);
  return new Promise((resolve) =>
    out.toBlob((b) => (b && b.type === "image/webp" ? resolve(b) : out.toBlob(resolve, "image/png")), "image/webp", 0.86)
  );
}

// Each print hangs a little crooked, the same way every time.
const tilt = (i) => [-3, 2.2, -1.4, 3, -2.4, 1.2, -0.8, 2.6][i % 8];

const ago = (iso) => {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  return d < 30 ? `${Math.floor(d)}d ago` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/** The wall itself, as a sheet over the drawing page. */
export function WallSheet({ open, onClose }) {
  const { sketches, ready } = useWall(open);
  const [big, setBig] = useState(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e) => {
      if (e.key !== "Escape") return;
      if (big) setBig(null);
      else onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, big, onClose]);
  useEffect(() => {
    if (!open) setBig(null);
  }, [open]);

  if (!open) return null;
  return (
    <div className="mg-sheet-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mg-sheet mw-sheet font-outfit" role="dialog" aria-modal="true" aria-labelledby="mw-title" data-lenis-prevent>
        <button type="button" className="mg-sheet-close" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
        <h2 id="mw-title" className="text-lg font-bold text-black">The wall</h2>
        <p className="mt-1 text-sm leading-relaxed text-black/65">
          {sketches.length
            ? `${sketches.length}${sketches.length >= 40 ? "+" : ""} things people made in the margin. Newest first.`
            : ready
              ? "Nothing up yet. Draw something and be the first on the wall."
              : "Fetching the wall…"}
        </p>
        {sketches.length > 0 && (
          <ul className="mw-grid">
            {sketches.map((s, i) => (
              <li key={s.url} style={{ "--tilt": `${tilt(i)}deg`, "--i": Math.min(i, 12) }} data-mine={s.mine || undefined}>
                <button type="button" className="mw-print" onClick={() => setBig(s)} aria-label={`Open a sketch from ${ago(s.at)}`}>
                  <span className="mg-tape" aria-hidden="true" />
                  <Image src={s.url} alt="A visitor's sketch" width={300} height={300} sizes="(max-width: 640px) 42vw, 180px" loading="lazy" />
                  <span className="mw-when">{s.mine ? "yours, just now" : ago(s.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {big && (
        <div className="mw-big" onPointerDown={(e) => e.target === e.currentTarget && setBig(null)}>
          <figure className="mw-big-print">
            <span className="mg-tape" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={big.url} alt="A visitor's sketch, large" />
            <figcaption className="font-outfit">{big.mine ? "yours, just now" : ago(big.at)}</figcaption>
          </figure>
          <button type="button" className="mg-sheet-close mw-big-close" onClick={() => setBig(null)} aria-label="Back to the wall">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * On the homepage teaser: the latest sketches drift past under the stickers.
 * Only there once something has been pinned, so the band is exactly the
 * design until then. Loads when the teaser comes near.
 */
export function WallStrip() {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const { sketches } = useWall(near);
  const list = sketches.slice(0, 16);

  // Drift speed: the same pace however many there are.
  const track = useCallback((node) => {
    if (node) node.style.setProperty("--dur", `${Math.max(24, list.length * 5)}s`);
  }, [list.length]);

  return (
    <div ref={ref} className="mw-strip" data-on={list.length > 0 || undefined} aria-hidden={list.length ? undefined : true}>
      {list.length > 0 && (
        <>
          <TransitionLink href="/margin?wall=1" className="mw-strip-label font-outfit">
            <span>FROM THE WALL</span>
            <span className="mw-strip-count">
              {sketches.length}
              {sketches.length >= 40 ? "+" : ""} {sketches.length === 1 ? "sketch" : "sketches"} by visitors
            </span>
            <span className="mw-strip-go" aria-hidden="true">↗</span>
          </TransitionLink>
          <div className="mw-strip-window">
            <ul ref={track} className="mw-strip-track" data-few={list.length < 6 || undefined}>
              {/* Twice over, so the loop has no seam. */}
              {[0, 1].map((copy) =>
                list.map((s, i) => (
                  <li key={`${copy}-${s.url}`} style={{ "--tilt": `${tilt(i)}deg` }} aria-hidden={copy ? true : undefined}>
                    <TransitionLink href="/margin?wall=1" tabIndex={copy ? -1 : undefined} className="mw-strip-print" aria-label="See the wall">
                      <span className="mg-tape" aria-hidden="true" />
                      <Image src={s.url} alt="" width={200} height={200} sizes="(max-width: 767px) 96px, 140px" loading="lazy" />
                    </TransitionLink>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
