"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import TransitionLink from "./layout/transition-link";

// Drop the illustration in at /public/blacksuit.png. It is shown at its own
// proportions; nothing here crops or stretches it. The connector line lands on
// the green card, so if the artwork is ever re-exported with different padding
// nudge `--card-x` (card centre, fraction of the image width) and `--card-top`
// (card top edge, fraction of the image height) in globals.css.
const FIGURE_SRC = "/blacksuit.png";

export default function BeyondTeaser() {
  const stageRef = useRef(null);
  const [inView, setInView] = useState(false);

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

  return (
    <section id="beyond" className="beyond bg-black text-white px-6 py-16 md:px-12 md:py-24" data-inview={inView}>
      <div className="mx-auto max-w-3xl">
        <h2 className="beyond-title font-anonymous-pro text-3xl md:text-5xl">[A Bit More About Me]</h2>

        <TransitionLink
          href="/beyond"
          aria-label="A minute for my story? Read it on the Beyond page"
          className="beyond-link group mt-4 block outline-none md:mt-5"
        >
          <span ref={stageRef} className="beyond-stage block">
            {/* CTA row: the copy, then a hairline that runs out to the drop point. */}
            <span className="beyond-cta flex items-center">
              <span className="beyond-cta-text whitespace-nowrap font-outfit text-[13px] sm:text-sm md:text-base">
                A minute for my story?{" "}
                <span className="beyond-cta-click inline-flex items-center gap-1 font-semibold">
                  Click
                  <ArrowRight className="nudge-x h-[0.95em] w-[0.95em]" strokeWidth={2.25} aria-hidden="true" />
                </span>
              </span>
              <span className="beyond-line beyond-line-h" aria-hidden="true" />
            </span>

            {/* Illustration, with the line dropping onto the "?" card. */}
            <span className="beyond-figure relative block">
              <span className="beyond-line beyond-line-v" aria-hidden="true" />
              <Image
                src={FIGURE_SRC}
                width={1400}
                height={2000}
                sizes="(max-width: 768px) 70vw, 540px"
                alt="Goutham in a black suit, holding up a green card with a question mark"
                draggable={false}
                className="h-auto w-full select-none"
              />
            </span>
          </span>
        </TransitionLink>
      </div>
    </section>
  );
}
