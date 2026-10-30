"use client";

import { useEffect, useRef, useState } from "react";
import BracketHeading from "./layout/bracket-heading";
import Desktop from "./os/desktop";

// The facts, in the order a reader wants them: what now, what before, and the degree.
const FACTS = [
  { label: "Now", value: "Digital Engineer, DeepWeaver.AI", note: "remote, Australia" },
  { label: "Before", value: "Freelance designer & developer", note: "2023 to 2024" },
  { label: "Education", value: "B.Tech, AI & Data Science", note: "Sri Eshwar College, 2025" },
];

export default function About() {
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
            A full-stack developer and product designer, building AI products end to end: the
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

        </div>
      </div>

      {/* Goutham OS: a little desktop that works (see os/desktop.js). */}
      <div className="about-os w-full md:w-1/2">
        <Desktop />
      </div>
    </div>
  );
}
