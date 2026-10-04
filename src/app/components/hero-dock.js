"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import TransitionLink from "./layout/transition-link";

/**
 * A small dock in the hero's corner. Closed, it is a black disc with a face
 * that blinks now and then. Open, it is a column of the site's round marks:
 * the character (the Beyond page), an arrow (the Projects page), and the
 * face itself, which opens the game. Not sticky: it scrolls away with the hero.
 */
function Face({ className = "" }) {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" className={`dock-face ${className}`}>
      <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle className="dock-eye" cx="15" cy="20" r="1.9" fill="currentColor" />
      <circle className="dock-eye" cx="25" cy="20" r="1.9" fill="currentColor" />
    </svg>
  );
}

export default function HeroDock() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Closes on outside click, Escape, and scroll.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onScroll = () => setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  return (
    <>
      <div ref={ref} className="dock" data-open={open}>
        <div className="dock-items" aria-hidden={!open}>
          <TransitionLink href="/beyond" className="dock-item" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
            <span className="dock-label font-anonymous-pro">Beyond</span>
            <span className="dock-mark">
              <Image src="/project-icon.png" alt="" width={120} height={96} sizes="40px" draggable={false} className="dock-char" />
            </span>
          </TransitionLink>
          <TransitionLink href="/projects" className="dock-item" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
            <span className="dock-label font-anonymous-pro">Projects</span>
            <span className="dock-mark">
              <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
            </span>
          </TransitionLink>
          <TransitionLink href="/fun" className="dock-item" tabIndex={open ? 0 : -1} aria-label="A small game" onClick={() => setOpen(false)}>
            <span className="dock-label font-anonymous-pro">?</span>
            <span className="dock-mark">
              <Face />
            </span>
          </TransitionLink>
        </div>
        <button
          type="button"
          className="dock-toggle"
          aria-expanded={open}
          aria-label={open ? "Close" : "More"}
          onClick={() => setOpen((v) => !v)}
        >
          <Face />
        </button>
      </div>
    </>
  );
}
