"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "./layout/transition-link";
import BracketHeading from "./layout/bracket-heading";

// Drop the illustration in at /public/blacksuit.png. It is shown at its own
// proportions; nothing here crops or stretches it. The hover bloom sits behind
// the green "?" card, so if the artwork is ever re-exported with different
// padding nudge `--card-x` / `--card-y` (card centre, fractions of the image
// width and height) in globals.css.
const FIGURE_SRC = "/blacksuit.png";

/**
 * The whole figure is the link. No "click here": the card in the photo asks
 * the question, and on hover a "[ Beyond ]" label rides with the cursor, the
 * card glows, and the figure leans a few pixels toward the pointer.
 */
export default function BeyondTeaser() {
  const stageRef = useRef(null);
  const labelRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState(false);
  const cur = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0, on: false });

  // Play the entrance once the section is in the viewport.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The label eases after the pointer rather than snapping to it.
  const tick = useCallback(() => {
    const c = cur.current;
    const el = labelRef.current;
    c.x += (c.tx - c.x) * 0.16;
    c.y += (c.ty - c.y) * 0.16;
    if (el) el.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0)`;
    const settled = Math.abs(c.tx - c.x) < 0.3 && Math.abs(c.ty - c.y) < 0.3;
    c.raf = c.on || !settled ? requestAnimationFrame(tick) : 0;
  }, []);

  useEffect(() => () => cancelAnimationFrame(cur.current.raf), []);

  const onPointerMove = (e) => {
    if (e.pointerType !== "mouse") return;
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const c = cur.current;
    c.tx = e.clientX - r.left;
    c.ty = e.clientY - r.top;
    if (!c.on) {
      // First contact: start under the cursor, not from the corner.
      c.on = true;
      c.x = c.tx;
      c.y = c.ty;
      setHover(true);
    }
    if (!c.raf) c.raf = requestAnimationFrame(tick);
    // Figure drift, a few px toward the pointer.
    stage.style.setProperty("--dx", `${((c.tx / r.width - 0.5) * 10).toFixed(1)}px`);
    stage.style.setProperty("--dy", `${((c.ty / r.height - 0.5) * 8).toFixed(1)}px`);
  };

  const onPointerLeave = () => {
    const stage = stageRef.current;
    cur.current.on = false;
    setHover(false);
    if (stage) {
      stage.style.setProperty("--dx", "0px");
      stage.style.setProperty("--dy", "0px");
    }
  };

  return (
    <section id="beyond" className="beyond bg-black text-white px-6 py-16 md:px-12 md:py-24" data-inview={inView}>
      <div className="mx-auto max-w-3xl">
        <BracketHeading className="beyond-title font-anonymous-pro text-[clamp(1.35rem,6.4vw,1.875rem)] md:text-5xl">
          A Bit More About Me
        </BracketHeading>

        <div
          ref={stageRef}
          className="beyond-stage relative mt-4 md:mt-5"
          data-hover={hover}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <TransitionLink
            href="/beyond"
            aria-label="A minute for my story? Read it on the Beyond page"
            className="beyond-link group block outline-none"
          >
            <span className="beyond-cta-text block font-outfit text-[13px] text-white/75 sm:text-sm md:text-base">
              A minute for my story?
            </span>

            <span className="beyond-figure relative mt-3 block md:mt-4">
              <span className="beyond-glow" aria-hidden="true" />
              <Image
                src={FIGURE_SRC}
                width={1400}
                height={2000}
                sizes="(max-width: 768px) 70vw, 540px"
                alt="Goutham in a black suit, holding up a green card with a question mark"
                draggable={false}
                className="relative h-auto w-full select-none"
              />
            </span>
          </TransitionLink>

          {/* Cursor label. Mouse only; touch just taps through to the page. */}
          <span ref={labelRef} className="beyond-cursor" aria-hidden="true">
            <span className="beyond-cursor-pill font-anonymous-pro">[ Beyond ]</span>
          </span>
        </div>
      </div>
    </section>
  );
}
