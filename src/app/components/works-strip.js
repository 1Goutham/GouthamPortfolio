"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "./layout/transition-link";

const STAR = (
  <svg viewBox="0 0 20 20"><path d="M10 1.5v17M2.6 5.75l14.8 8.5M2.6 14.25l14.8-8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
);

function Row() {
  return (
    <>
      <span className="ws-item ws-idea">
        <span className="block font-medium">Got an idea?</span>
        <span className="block text-black/80">Turning imagination into impact.</span>
      </span>

      <span className="ws-item ws-star ws-star-l" aria-hidden="true">
        {STAR}
      </span>

      <span className="ws-item ws-mark font-hand" aria-hidden="true">
        1Goutham <span className="ws-strike">Space</span> Works
      </span>

      <span className="ws-item ws-star ws-star-r" aria-hidden="true">
        {STAR}
      </span>

      <span className="ws-item ws-pill">
        <span className="ws-pill-face">
          <Image src="/headgcwork.png" width={240} height={195} alt="" sizes="48px" draggable={false} />
        </span>
        <span className="ws-pill-text">
          Let&rsquo;s build something
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      <span className="ws-item ws-star ws-star-end" aria-hidden="true">
        {STAR}
      </span>
    </>
  );
}

/**
 * The small white label after Projects that points at 1G-works. The whole
 * strip is the link. On hover the stars turn, the struck-through "Space" is
 * crossed out again, and the pill's avatar leans in. On a phone the same row
 * glides past as a slow loop, so it stays on one line at a readable size.
 */
export default function WorksStrip() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="works-strip bg-white text-black" data-inview={inView} aria-label="1G-works">
      <TransitionLink href="/works" className="ws-stage group block outline-none font-outfit" aria-label="1Goutham Space Works: let's build something">
        <span className="ws-row">
          <Row />
        </span>
        {/* Phones: the row runs as a loop, so a second copy follows the first. */}
        <span className="ws-row ws-row-copy" aria-hidden="true">
          <Row />
        </span>
      </TransitionLink>
    </section>
  );
}
