"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import TransitionLink from "../components/layout/transition-link";
import FadeContent from "../components/layout/fade-in";

const PIPELINE = ["UX research", "design", "development", "AI integration", "deployment"];

const para = "font-outfit text-sm md:text-base leading-relaxed text-white/80 text-justify";

/* Bracketed link, same treatment as the hero's "[ View my work ]". */
function BracketLink({ href, children, transition = false }) {
  const cls = "bracket-link font-anonymous-pro text-lg text-white md:text-2xl";
  const inner = (
    <>
      <span className="bracket-link-l" aria-hidden="true">[</span>
      <span className="bracket-link-text">{children}</span>
      <span className="bracket-link-r" aria-hidden="true">]</span>
    </>
  );
  return transition ? (
    <TransitionLink href={href} className={cls}>{inner}</TransitionLink>
  ) : (
    <a href={href} className={cls}>{inner}</a>
  );
}

export default function BeyondStory() {
  // Stagger the opening lines in once fonts are ready so nothing pops mid-swap.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const go = () => alive && setReady(true);
    if (document.fonts?.ready) document.fonts.ready.then(go);
    else go();
    const fallback = setTimeout(go, 600);
    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, []);

  return (
    <main className="beyond-page min-h-screen bg-black text-white" data-ready={ready}>
      <nav className="flex items-center justify-between px-6 py-6 md:px-12">
        <TransitionLink
          href="/"
          aria-label="Home"
          className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105"
        >
          <Image src="/logo.png" width={40} height={40} alt="Goutham logo" priority />
        </TransitionLink>
        <TransitionLink
          href="/"
          className="beyond-back group inline-flex items-center gap-1.5 font-outfit text-sm text-white/70 outline-none hover:text-white focus-visible:text-white"
        >
          <ArrowLeft className="beyond-back-arrow h-4 w-4" strokeWidth={2} aria-hidden="true" />
          <span className="link-underline">Back home</span>
        </TransitionLink>
      </nav>

      <article className="mx-auto max-w-3xl px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-14">
        <header>
          <p className="beyond-rise font-outfit text-xs uppercase tracking-[0.3em] text-white/45 md:text-sm" style={{ "--i": 0 }}>
            A minute for my story
          </p>
          <h1 className="beyond-rise mt-3 font-anonymous-pro text-4xl md:text-6xl" style={{ "--i": 1 }}>
            [Beyond]
          </h1>
          <p className="beyond-rise mt-5 font-outfit text-base text-white/85 md:text-lg" style={{ "--i": 2 }}>
            <span className="font-bold text-lg md:text-xl">Warning!</span> unnecessary personal journey ahead.
          </p>
          <span className="beyond-rise beyond-rule mt-8 block h-px w-full bg-white/15 md:mt-10" style={{ "--i": 3 }} aria-hidden="true" />
        </header>

        <div className="mt-8 space-y-6 md:mt-10">
          <p className={`beyond-rise ${para}`} style={{ "--i": 4 }}>
            I started as a freelance designer while I was in college. My first client asked me to design a
            set of game cards, so I went all in on the graphics. He liked the work enough to pay me a
            little extra - I still don&rsquo;t know why, but that appreciation stuck with me. It pushed me deeper
            into design.
          </p>

          <p className={`beyond-rise ${para}`} style={{ "--i": 5 }}>
            From graphic design, I moved into web design and started learning more about UX research,
            interactions, and how people actually experience products. But after a while, I wanted more
            than just designing them.
          </p>

          <FadeContent duration={900} threshold={0.2}>
            <p className="font-outfit text-base md:text-xl font-semibold leading-relaxed text-white">
              I wanted to build what I designed.
            </p>
          </FadeContent>

          <FadeContent duration={900} threshold={0.2}>
            <p className={para}>
              Back then, AI wasn&rsquo;t capable enough for me to rely on it for building products, so I decided
              to learn full-stack development from scratch. It took me nearly a year to become comfortable
              building things on my own. Somewhere along the way, I realised how interesting it was to bring
              design and development together - I could think about the experience and actually make it work.
            </p>
          </FadeContent>

          <FadeContent duration={900} threshold={0.2}>
            <p className={para}>
              Then AI became much more capable, and naturally, I started exploring it too. I learned how AI
              could fit into the products I was already designing and building, rather than treating it as
              something separate.
            </p>
          </FadeContent>

          <FadeContent duration={900} threshold={0.2}>
            <p className={para}>
              Today, I enjoy taking an idea from{" "}
              {PIPELINE.map((step, i) => (
                <span key={step}>
                  <span className="journey-step font-semibold text-white">{step}</span>
                  {i < PIPELINE.length - 1 && <span className="journey-arrow font-semibold"> &rarr; </span>}
                </span>
              ))}
              . I can explore the problem, shape the experience, build the product, make it AI-powered when
              it genuinely adds value, and ship it.
            </p>
          </FadeContent>

          <FadeContent duration={900} threshold={0.2}>
            <p className={para}>
              That&rsquo;s probably the part of my journey I&rsquo;m most excited about - not having to choose between
              design, code, and AI.
            </p>
          </FadeContent>
        </div>

        <FadeContent duration={900} threshold={0.2} className="mt-14 md:mt-20">
          <span className="block h-px w-full bg-white/15" aria-hidden="true" />
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 md:mt-10">
            <BracketLink href="/" transition>Back home</BracketLink>
            <BracketLink href="/#contact">Let&rsquo;s talk</BracketLink>
          </div>
        </FadeContent>
      </article>
    </main>
  );
}
