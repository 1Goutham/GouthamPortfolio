"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import TransitionLink from "../components/layout/transition-link";
import FadeContent from "../components/layout/fade-in";

// The taped print at /public/beyondpic.png is shown at its own proportions;
// the tape in the artwork is the pivot the photo swings from, so
// `--pivot-x` / `--pivot-y` in globals.css are where that tape sits.
const PHOTO_SRC = "/beyondpic.png";

const PIPELINE = ["UX research", "design", "development", "AI integration", "deployment"];

const para = "font-outfit text-sm md:text-base leading-relaxed text-black/85 text-justify";

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* "[ label ]" with the brackets easing outward on hover, as in the hero.
   `tight` drops the inner spacing, for "[Goutham G]". */
function Brackets({ children, className = "", tight = false }) {
  return (
    <span className={`bracket-link bracket-link-dark ${className}`}>
      <span className="bracket-link-l" aria-hidden="true">[</span>
      <span className={`bracket-link-text ${tight ? "!mx-0" : ""}`}>{children}</span>
      <span className="bracket-link-r" aria-hidden="true">]</span>
    </span>
  );
}

/**
 * The photo hangs from its tape like a real print on a wall. Brushing the
 * cursor across it pushes it, a tap flicks it, and it swings back on a
 * damped spring (stiffness / damping below) until it comes to rest. It also
 * gets one small push as it arrives, as if it was just stuck up.
 */
function HangingPhoto({ ready }) {
  const ref = useRef(null);
  const sim = useRef({ angle: 0, vel: 0, raf: 0, last: 0, px: null, pt: 0 });

  const tick = useCallback((now) => {
    const s = sim.current;
    const el = ref.current;
    if (!el) return;
    const dt = Math.min((now - s.last) / 1000 || 0, 0.032);
    s.last = now;
    // angle'' = -k*angle - c*vel  (degrees; the maths is the same)
    const k = 90;
    const c = 4.5;
    s.vel += (-k * s.angle - c * s.vel) * dt;
    s.angle += s.vel * dt;
    if (Math.abs(s.angle) < 0.02 && Math.abs(s.vel) < 0.2) {
      s.angle = 0;
      s.vel = 0;
      el.style.setProperty("--swing", "0deg");
      s.raf = 0;
      return;
    }
    el.style.setProperty("--swing", `${s.angle.toFixed(3)}deg`);
    s.raf = requestAnimationFrame(tick);
  }, []);

  const wake = useCallback(() => {
    const s = sim.current;
    if (s.raf || reduceMotion()) return;
    s.last = performance.now();
    s.raf = requestAnimationFrame(tick);
  }, [tick]);

  const push = useCallback(
    (delta) => {
      const s = sim.current;
      s.vel = Math.max(-220, Math.min(220, s.vel + delta));
      wake();
    },
    [wake]
  );

  useEffect(() => () => cancelAnimationFrame(sim.current.raf), []);

  // The arrival push, timed with the photo's fade-in.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => push(-38), 420);
    return () => clearTimeout(t);
  }, [ready, push]);

  const onPointerMove = (e) => {
    if (e.pointerType !== "mouse") return;
    const s = sim.current;
    const now = performance.now();
    if (s.px !== null) {
      const dx = e.clientX - s.px;
      const dt = Math.max(now - s.pt, 8);
      // Horizontal cursor speed becomes torque; a slow drift barely stirs it.
      push((dx / dt) * 26);
    }
    s.px = e.clientX;
    s.pt = now;
  };
  const onPointerLeave = () => {
    sim.current.px = null;
  };
  const onPointerDown = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    // Flick away from wherever it was tapped.
    const side = (e.clientX - r.left) / r.width < 0.5 ? -1 : 1;
    push(side * 70);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      className="beyond-photo beyond-rise relative w-[250px] select-none sm:w-[280px] md:w-[330px]"
      style={{ "--i": 0 }}
    >
      <Image
        src={PHOTO_SRC}
        width={812}
        height={1218}
        sizes="(max-width: 640px) 250px, (max-width: 768px) 280px, 330px"
        alt="A taped-up photo of Goutham"
        priority
        draggable={false}
        className="h-auto w-full"
      />
    </div>
  );
}

/* The little asterisk turns as you scroll, so it never quite sits still. */
function ScrollStar() {
  const ref = useRef(null);
  useEffect(() => {
    if (reduceMotion()) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      el.style.setProperty("--turn", `${(window.scrollY * 0.25).toFixed(2)}deg`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <span ref={ref} className="beyond-star font-outfit text-2xl leading-none text-black md:text-3xl" aria-hidden="true">
      &#10035;
    </span>
  );
}

export default function BeyondStory() {
  // Stagger the opening in once fonts are ready so nothing pops mid-swap.
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
    <main className="beyond-page min-h-screen bg-white text-black" data-ready={ready}>
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <TransitionLink
          href="/"
          aria-label="Home"
          className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105"
        >
          <Image src="/logo.png" width={40} height={40} alt="Goutham logo" priority className="invert" />
        </TransitionLink>
        <TransitionLink
          href="/#contact"
          className="btn-tactile btn-tactile-dark group inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-5 font-outfit text-sm font-medium text-white shadow-md hover:bg-[#1a1a1a]"
        >
          Contact
          <ArrowUpRight className="nudge-diag h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </TransitionLink>
      </nav>

      <article className="mx-auto max-w-3xl px-6 pb-24 pt-6 md:px-12 md:pb-32 md:pt-10">
        {/* Photo, then the name row underneath it. */}
        <header className="flex flex-col items-center">
          <HangingPhoto ready={ready} />

          <div className="beyond-rise mt-7 flex items-center gap-4 md:mt-8 md:gap-5" style={{ "--i": 1 }}>
            <Brackets tight className="font-anonymous-pro text-lg text-black md:text-2xl">Goutham G</Brackets>
            <ScrollStar />
            <p className="font-outfit">
              <span className="block text-sm font-bold leading-snug md:text-base">A bit more about me :)</span>
              <span className="block text-xs leading-snug text-black/70 md:text-sm">and some blahh blahhhhhh</span>
            </p>
          </div>
        </header>

        <h1 className="beyond-rise mt-14 md:mt-20" style={{ "--i": 2 }}>
          <Brackets className="font-anonymous-pro text-4xl leading-none text-black md:text-6xl">Beyond</Brackets>
        </h1>

        <div className="mt-8 space-y-6 md:mt-10">
          <p className={`beyond-rise ${para}`} style={{ "--i": 3 }}>
            <span className="font-bold text-black">Hey, hello. Vanakkam!</span> I&rsquo;m Goutham. I&rsquo;m a little curious,
            a little obsessive, and I tend to notice small things - sometimes a little too much. I can spend a
            surprising amount of time wondering if something is{" "}
            {/* It is. Hover it and it settles into place. */}
            <span className="beyond-2px">2px out of place</span>, then realise I&rsquo;ve been sitting there for
            two hours. I like simple things done thoughtfully, good conversations, interesting ideas, quiet
            spaces, and the occasional random creative experiment.
          </p>

          <p className={`beyond-rise ${para}`} style={{ "--i": 4 }}>
            I&rsquo;m naturally curious about how things work, so I often end up going down little rabbit holes.
            Sometimes they lead somewhere useful, sometimes they really don&rsquo;t. Either way, I usually learn
            something along the way.
          </p>

          <p className={`beyond-rise ${para}`} style={{ "--i": 5 }}>
            I like making things, learning things, trying things, and occasionally overthinking them. Nothing
            too profound - just trying to stay curious and enjoy the process.
          </p>

          <FadeContent duration={900} threshold={0.2} className="pt-2 md:pt-4">
            <p className="font-outfit text-base md:text-lg">
              <span className="text-lg font-bold md:text-xl">Warning!</span> unnecessary personal journey ahead.
            </p>
          </FadeContent>

          <FadeContent duration={900} threshold={0.2}>
            <p className={para}>
              I started as a freelance designer while I was in college. My first client asked me to design a
              set of game cards, so I went all in on the graphics. He liked the work enough to pay me a
              little extra - I still don&rsquo;t know why, but that appreciation stuck with me. It pushed me deeper
              into design.
            </p>
          </FadeContent>

          <FadeContent duration={900} threshold={0.2}>
            <p className={para}>
              From graphic design, I moved into web design and started learning more about UX research,
              interactions, and how people actually experience products. But after a while, I wanted more
              than just designing them.
            </p>
          </FadeContent>

          <FadeContent duration={900} threshold={0.2}>
            <p className="font-outfit text-sm font-bold leading-relaxed text-black md:text-base">
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
              Today, I enjoy taking an idea all the way from{" "}
              <Step>{PIPELINE[0]}</Step> and <Step>{PIPELINE[1]}</Step> to <Step>{PIPELINE[2]}</Step>,{" "}
              <Step>{PIPELINE[3]}</Step>, and <Step>{PIPELINE[4]}</Step>. I can explore the problem, shape the
              experience, build the product, make it AI-powered when it genuinely adds value, and ship it.
            </p>
          </FadeContent>

          <FadeContent duration={900} threshold={0.2}>
            <p className={para}>
              That&rsquo;s probably the part of my journey I&rsquo;m most excited about - not having to choose between
              design, code, and AI.
            </p>
          </FadeContent>
        </div>
      </article>
    </main>
  );
}

/* A pipeline word: reads as plain text, a black marker fills in behind it on hover. */
function Step({ children }) {
  return <span className="journey-step">{children}</span>;
}
