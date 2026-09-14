"use client";

import { ArrowDown } from "lucide-react";
import ScrollReveal from "./layout/scrollreveal";

const PIPELINE = ["UX research", "design", "development", "AI integration", "deployment"];

const reveal = { baseOpacity: 0, enableBlur: true, baseRotation: 0, blurStrength: 8 };
const para = "font-outfit text-sm md:text-base leading-relaxed text-black/85 text-justify";

export default function Journey() {
  return (
    <section id="journey" className="journey bg-[#9DFF50] text-black px-6 py-16 md:px-12 md:py-24">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal {...reveal}>
          <h2 className="font-anonymous-pro text-3xl md:text-5xl">[Bit More About Myself]</h2>
        </ScrollReveal>

        <ScrollReveal {...reveal}>
          <div className="mt-6 space-y-1">
            <p className="font-outfit text-base md:text-lg">
              <span className="font-bold text-lg md:text-xl">Warning!</span> unnecessary personal journey ahead.
            </p>
            <a href="#Gtalk" className="journey-skip group inline-flex items-center gap-1.5 font-outfit text-sm md:text-base font-medium">
              <span className="link-underline">Scroll to the next</span>
              <ArrowDown className="journey-skip-arrow h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
        </ScrollReveal>

        <div className="mt-8 space-y-6 md:mt-10">
          <ScrollReveal {...reveal}>
            <p className={para}>
              I started as a freelance designer while I was in college. My first client asked me to design a
              set of game cards, so I went all in on the graphics. He liked the work enough to pay me a
              little extra - I still don&rsquo;t know why, but that appreciation stuck with me. It pushed me deeper
              into design.
            </p>
          </ScrollReveal>

          <ScrollReveal {...reveal}>
            <p className={para}>
              From graphic design, I moved into web design and started learning more about UX research,
              interactions, and how people actually experience products. But after a while, I wanted more
              than just designing them.
            </p>
          </ScrollReveal>

          <ScrollReveal {...reveal}>
            <p className="font-outfit text-sm md:text-base font-bold leading-relaxed">
              I wanted to build what I designed.
            </p>
          </ScrollReveal>

          <ScrollReveal {...reveal}>
            <p className={para}>
              Back then, AI wasn&rsquo;t capable enough for me to rely on it for building products, so I decided
              to learn full-stack development from scratch. It took me nearly a year to become comfortable
              building things on my own. Somewhere along the way, I realised how interesting it was to bring
              design and development together - I could think about the experience and actually make it work.
            </p>
          </ScrollReveal>

          <ScrollReveal {...reveal}>
            <p className={para}>
              Then AI became much more capable, and naturally, I started exploring it too. I learned how AI
              could fit into the products I was already designing and building, rather than treating it as
              something separate.
            </p>
          </ScrollReveal>

          <ScrollReveal {...reveal}>
            <p className={para}>
              Today, I enjoy taking an idea from{" "}
              {PIPELINE.map((step, i) => (
                <span key={step}>
                  <span className="journey-step font-bold text-black">{step}</span>
                  {i < PIPELINE.length - 1 && <span className="journey-arrow font-bold"> &rarr; </span>}
                </span>
              ))}
              . I can explore the problem, shape the experience, build the product, make it AI-powered when
              it genuinely adds value, and ship it.
            </p>
          </ScrollReveal>

          <ScrollReveal {...reveal}>
            <p className={para}>
              That&rsquo;s probably the part of my journey I&rsquo;m most excited about - not having to choose between
              design, code, and AI.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
