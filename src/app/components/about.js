"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import BracketHeading from "./layout/bracket-heading";
import TransitionLink from "./layout/transition-link";

// Drop your new portrait in at /public/about-portrait.png to swap the photo.
const PORTRAIT_SRC = "/about-portrait.png";

// The facts, in the order a reader wants them: what now, what before, and the degree.
const FACTS = [
  { label: "Now", value: "Digital Engineer, DeepWeaver.AI", note: "remote, Australia" },
  { label: "Before", value: "Freelance designer & developer", note: "2023 to 2024" },
  { label: "Education", value: "B.Tech, AI & Data Science", note: "Sri Eshwar College, 2025" },
];

export default function About() {
  // The portrait has depth: it drifts a few pixels against the cursor, like
  // a print behind glass, and settles back on leave.
  const frameRef = useRef(null);
  const raf = useRef(0);
  const onPointerMove = useCallback((e) => {
    const el = frameRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      el.style.setProperty("--ax", `${(-x * 14).toFixed(1)}px`);
      el.style.setProperty("--ay", `${(-y * 10).toFixed(1)}px`);
    });
  }, []);
  const onPointerLeave = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    el.style.setProperty("--ax", "0px");
    el.style.setProperty("--ay", "0px");
  }, []);

  // The copy rises in line by line once the section is in view (see .about-rise).
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
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let i = 0;
  const rise = () => ({ className: "about-rise", style: { "--i": i++ } });

  return (
    <div id="about" ref={ref} data-inview={inView} className="about flex w-full flex-col bg-black md:min-h-screen md:flex-row">
      {/* Text */}
      <div className="flex w-full items-center justify-center px-6 py-14 md:w-1/2 md:py-20 md:pl-12 md:pr-16">
        <div className="w-full max-w-md">
          <div {...rise()}>
            <BracketHeading as="h2" className="font-anonymous-pro text-3xl text-white md:text-5xl">
              About Me
            </BracketHeading>
          </div>

          <h3 {...rise()} className="about-rise mt-8 font-outfit text-xl text-white md:mt-10 md:text-2xl">
            Hey, I&rsquo;m Goutham.
          </h3>
          <p {...rise()} className="about-rise mt-3 font-outfit text-sm leading-relaxed text-white/65 md:text-base">
            A full-stack developer and product designer from Coimbatore, building AI products end to end: the
            research, the interface, the code, and the model behind it.
          </p>

          {/* Facts: hairline rows, a mono label and the value, which slides on hover. */}
          <dl className="mt-8 md:mt-10">
            {FACTS.map((f) => (
              <div key={f.label} {...rise()} className="about-rise about-row grid grid-cols-[84px_1fr] items-start gap-4 py-3 md:grid-cols-[96px_1fr]">
                <dt className="font-anonymous-pro text-xs uppercase tracking-[0.12em] text-white/40 md:text-sm">{f.label}</dt>
                <dd className="about-value font-outfit text-sm text-white md:text-base">
                  {f.value}
                  <span className="about-note block text-xs text-white/40 md:text-sm">{f.note}</span>
                </dd>
              </div>
            ))}
          </dl>

          <div {...rise()} className="about-rise mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 md:mt-10">
            <TransitionLink href="/beyond" className="bracket-link font-anonymous-pro text-base text-white md:text-xl">
              <span className="bracket-link-l" aria-hidden="true">[</span>
              <span className="bracket-link-text">More</span>
              <span className="bracket-link-r" aria-hidden="true">]</span>
            </TransitionLink>
            <a href="#contact" className="bracket-link font-anonymous-pro text-base text-white md:text-xl">
              <span className="bracket-link-l" aria-hidden="true">[</span>
              <span className="bracket-link-text">Let&rsquo;s talk</span>
              <span className="bracket-link-r" aria-hidden="true">]</span>
            </a>
          </div>
        </div>
      </div>

      {/* Portrait: full-bleed on desktop, a slow zoom and brighten on hover. */}
      <div className="flex w-full items-center justify-center px-6 pb-10 md:w-1/2 md:items-stretch md:justify-end md:p-0">
        <div
          ref={frameRef}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="about-portrait relative h-[340px] w-full overflow-hidden rounded-xl md:h-auto md:self-stretch md:rounded-none"
        >
          <Image
            className="object-cover object-left-top md:object-center"
            src={PORTRAIT_SRC}
            alt="Goutham - AI fullstack developer with a design foundation"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            quality={88}
          />
        </div>
      </div>
    </div>
  );
}
