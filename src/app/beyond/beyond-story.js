"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import TransitionLink from "../components/layout/transition-link";
import FadeContent from "../components/layout/fade-in";

const PIPELINE = ["UX research", "design", "development", "AI integration", "deployment"];

const para = "font-outfit text-sm md:text-base leading-relaxed text-black/85 text-justify";

/* Bracketed link, same treatment as the hero's "[ View my work ]". */
function BracketLink({ href, children, transition = false }) {
  const cls = "bracket-link bracket-link-dark font-anonymous-pro text-lg text-black md:text-2xl";
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
    <main className="beyond-page min-h-screen bg-[#9CFE50] text-black" data-ready={ready}>
      <nav className="flex items-center justify-between px-6 py-6 md:px-12">
        <TransitionLink
          href="/"
          aria-label="Home"
          className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105"
        >
          <Image src="/logo.png" width={40} height={40} alt="Goutham logo" priority className="invert" />
        </TransitionLink>
        <TransitionLink
          href="/"
          className="beyond-back group inline-flex items-center gap-1.5 font-outfit text-sm font-medium text-black/70 outline-none hover:text-black focus-visible:text-black"
        >
          <ArrowLeft className="beyond-back-arrow h-4 w-4" strokeWidth={2} aria-hidden="true" />
          <span className="link-underline">Back home</span>
        </TransitionLink>
      </nav>

      <article className="mx-auto max-w-3xl px-6 pb-24 pt-6 md:px-12 md:pb-32 md:pt-10">
        <header>
          <h1 className="beyond-rise font-anonymous-pro text-4xl leading-none md:text-6xl" style={{ "--i": 0 }}>
            [Beyond]
          </h1>
          <p className="beyond-rise mt-4 font-outfit text-base md:mt-5 md:text-lg" style={{ "--i": 1 }}>
            <span className="font-bold text-lg md:text-xl">Warning!</span> unnecessary personal journey ahead.
          </p>
          <span className="beyond-rise beyond-rule mt-8 block h-px w-full bg-black/20 md:mt-10" style={{ "--i": 2 }} aria-hidden="true" />
        </header>

        <div className="mt-8 space-y-6 md:mt-10">
          <p className={`beyond-rise ${para}`} style={{ "--i": 3 }}>
            I started as a freelance designer while I was in college. My first client asked me to design a
            set of game cards, so I went all in on the graphics. He liked the work enough to pay me a
            little extra - I still don&rsquo;t know why, but that appreciation stuck with me. It pushed me deeper
            into design.
          </p>

          <p className={`beyond-rise ${para}`} style={{ "--i": 4 }}>
            From graphic design, I moved into web design and started learning more about UX research,
            interactions, and how people actually experience products. But after a while, I wanted more
            than just designing them.
          </p>

          <FadeContent duration={900} threshold={0.2}>
            <p className="font-outfit text-base md:text-xl font-bold leading-relaxed text-black">
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
                  <span className="journey-step font-bold text-black">{step}</span>
                  {i < PIPELINE.length - 1 && <span className="journey-arrow font-bold"> &rarr; </span>}
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
          <span className="block h-px w-full bg-black/20" aria-hidden="true" />
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 md:mt-10">
            <BracketLink href="/" transition>Back home</BracketLink>
            <BracketLink href="/#contact">Let&rsquo;s talk</BracketLink>
          </div>
        </FadeContent>
      </article>
    </main>
  );
}
