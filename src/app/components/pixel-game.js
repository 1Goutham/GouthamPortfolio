"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "2px out of place": a line appears a few pixels off its guide. Nudge it
 * into place with the arrow keys or by dragging, then lock it in. Five
 * rounds; the score is how many pixels out you were in total, so lower is
 * better. The best score lives in this browser only.
 */
const ROUNDS = 5;
const KEY = "gg-2px-best";

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sign = () => (Math.random() < 0.5 ? -1 : 1);

export default function PixelGame({ onClose }) {
  const [round, setRound] = useState(0); // 0..ROUNDS-1, ROUNDS = done
  const [offset, setOffset] = useState(() => sign() * rnd(3, 9));
  const [results, setResults] = useState([]);
  const [best, setBest] = useState(null);
  const [flash, setFlash] = useState(null); // px off on the last lock
  const drag = useRef(null);
  const stage = useRef(null);

  useEffect(() => {
    try {
      const b = localStorage.getItem(KEY);
      if (b !== null) setBest(Number(b));
    } catch {}
  }, []);

  const done = round >= ROUNDS;
  const total = results.reduce((a, b) => a + b, 0);

  const lock = useCallback(() => {
    if (done) return;
    const off = Math.abs(offset);
    setFlash(off);
    const next = [...results, off];
    setResults(next);
    const r = round + 1;
    setRound(r);
    if (r >= ROUNDS) {
      const sum = next.reduce((a, b) => a + b, 0);
      try {
        const b = localStorage.getItem(KEY);
        if (b === null || sum < Number(b)) {
          localStorage.setItem(KEY, String(sum));
          setBest(sum);
        }
      } catch {}
    } else {
      // Later rounds start closer, so the eye has to work harder.
      const span = Math.max(2, 9 - r * 1.5);
      setOffset(sign() * rnd(2, Math.round(span)));
    }
    setTimeout(() => setFlash(null), 500);
  }, [done, offset, results, round]);

  const restart = () => {
    setRound(0);
    setResults([]);
    setOffset(sign() * rnd(3, 9));
    setFlash(null);
  };

  // Keys: arrows nudge 1px, Enter/Space lock, Escape closes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      if (done) {
        if (e.key === "Enter") restart();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setOffset((o) => o - 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setOffset((o) => o + 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        lock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, lock, onClose]);

  // Drag the line with the pointer; 1 css px = 1 game px.
  const onPointerDown = (e) => {
    if (done) return;
    drag.current = { y: e.clientY, start: offset };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setOffset(drag.current.start + Math.round(e.clientY - drag.current.y));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const verdict = (n) => (n === 0 ? "Pixel perfect." : n <= 3 ? "Close. Annoyingly close." : n <= 8 ? "You'd notice. I'd notice." : "Two hours later, still staring.");

  return (
    <div className="game fixed inset-0 z-[80] flex items-center justify-center bg-black/90 px-6 text-white" role="dialog" aria-modal="true" aria-label="2px out of place">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-6 top-6 font-anonymous-pro text-lg text-white/60 transition-colors hover:text-white">
        [ close ]
      </button>

      <div className="w-full max-w-md">
        <p className="font-anonymous-pro text-sm text-white/50">
          {done ? "Done" : `Round ${round + 1} of ${ROUNDS}`}
        </p>
        <h2 className="mt-1 font-anonymous-pro text-2xl md:text-3xl">[ 2px out of place ]</h2>
        <p className="mt-2 font-outfit text-sm text-white/65">
          {done ? "" : "The line is off its guide. Nudge it into place, then lock it."}
        </p>

        {!done ? (
          <>
            {/* The stage: a guide hairline and the line you move. */}
            <div
              ref={stage}
              className="game-stage relative mt-6 h-40 select-none overflow-hidden rounded-md border border-white/10 bg-black"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              data-flash={flash !== null ? (flash === 0 ? "perfect" : "off") : undefined}
            >
              <span className="game-guide" aria-hidden="true" />
              <span className="game-line" style={{ "--off": `${offset}px` }} aria-hidden="true" />
              {flash !== null && (
                <span className="game-flash font-anonymous-pro">{flash === 0 ? "0px" : `${flash}px out`}</span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between font-outfit text-xs text-white/50">
              <span>Drag, or use the arrow keys</span>
              <button type="button" onClick={lock} className="bracket-link font-anonymous-pro text-base text-white">
                <span className="bracket-link-l" aria-hidden="true">[</span>
                <span className="bracket-link-text">Lock it</span>
                <span className="bracket-link-r" aria-hidden="true">]</span>
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6">
            <p className="font-anonymous-pro text-6xl leading-none md:text-7xl">
              {total}
              <span className="text-2xl text-white/50">px</span>
            </p>
            <p className="mt-2 font-outfit text-base text-white/85">{verdict(total)}</p>
            <p className="mt-1 font-outfit text-sm text-white/45">
              {results.join(" + ")} across {ROUNDS} rounds
              {best !== null && ` · best in this browser: ${best}px`}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
              <button type="button" onClick={restart} className="bracket-link font-anonymous-pro text-lg text-white">
                <span className="bracket-link-l" aria-hidden="true">[</span>
                <span className="bracket-link-text">Again</span>
                <span className="bracket-link-r" aria-hidden="true">]</span>
              </button>
              <button type="button" onClick={onClose} className="bracket-link font-anonymous-pro text-lg text-white">
                <span className="bracket-link-l" aria-hidden="true">[</span>
                <span className="bracket-link-text">Back</span>
                <span className="bracket-link-r" aria-hidden="true">]</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
