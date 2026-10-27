"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "./layout/transition-link";

const SEEN_KEY = "1g-works-popup";
const DELAY_MS = 3200;

/**
 * A frosted card that introduces 1G-works, shown once per visit a few
 * seconds after the homepage opens. A soft light inside it follows the
 * pointer; Escape or the X sends it away.
 */
export default function WorksPopup() {
  const cardRef = useRef(null);
  const [state, setState] = useState("hidden"); // hidden | open | closing

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* storage blocked: just show it */
    }
    if (seen) return;
    const t = setTimeout(() => {
      setState("open");
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => {
    setState((s) => (s === "open" ? "closing" : s));
    setTimeout(() => setState("hidden"), 520);
  }, []);

  useEffect(() => {
    if (state !== "open") return;
    const esc = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [state, close]);

  const onPointerMove = (e) => {
    const el = cardRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };

  const onPointerLeave = () => {
    cardRef.current?.style.removeProperty("--gx");
    cardRef.current?.style.removeProperty("--gy");
  };

  if (state === "hidden") return null;

  return (
    <div className="wp-wrap" data-state={state} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={cardRef}
        className="wp-card font-outfit text-white"
        role="dialog"
        aria-label="1G-works"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <span className="wp-glow" aria-hidden="true" />
        <span className="wp-noise" aria-hidden="true" />

        <div className="wp-head">
          <span className="wp-mark font-hand">1G-works</span>
          <TransitionLink href="/works" className="wp-pill" onClick={close}>
            Let&rsquo;s build something
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </TransitionLink>
          <button type="button" className="wp-close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 3 17 17M17 3 3 17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <span className="wp-rule" aria-hidden="true" />

        <div className="wp-foot">
          <span className="wp-face">
            <Image src="/headgcwork.png" width={240} height={195} alt="" sizes="120px" draggable={false} />
          </span>
          <p className="wp-text">
            <span className="font-semibold">Need a creative website or digital product?</span> We help businesses
            stand out with thoughtful design, modern technology, and a digital presence that makes an impact.
          </p>
        </div>
      </div>
    </div>
  );
}
