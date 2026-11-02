"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import MinimalNav from "../components/layout/navbar";
import TransitionLink from "../components/layout/transition-link";

/**
 * Not a Case Study: the woven patch, then how I make things, in my words.
 *
 * The patch weaves itself together on arrival: it is cut into horizontal
 * threads that slide in from alternate sides, like weft through a loom, and
 * a sheen runs over the stitching once it's whole. Hovered, it tilts toward
 * the pointer and the sheen follows. The text arrives paragraph by
 * paragraph, its key words settling to full black just after.
 */

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About me", href: "/#about" },
  { label: "Projects", href: "/projects" },
];

const PATCH = "/notacasestudy.png";
const THREADS = 14;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const B = ({ children }) => <b className="nc-key">{children}</b>;

// The essay, a paragraph per idea.
const PARAGRAPHS = [
  <>
    I&rsquo;ve always been <B>curious</B> about how things are made, why certain products <B>feel so good to use</B>,
    and what makes something <B>stand out</B> from everything else around it.
  </>,
  <>
    I don&rsquo;t particularly enjoy following the usual patterns or sticking to what a traditional AI developer or
    designer is expected to do. I like <B>exploring</B>, <B>experimenting</B>, trying things that might or might not
    work, and finding little ways to make something <B>feel different</B>. I want the things I create to have their
    own <B>identity</B>, something people can recognise and associate with the way I think and make things.
    That&rsquo;s what I&rsquo;m slowly trying to build with <B>1G</B>.
  </>,
  <>
    I&rsquo;m a big admirer of <B>Teenage Engineering</B> and the way they approach their products. There&rsquo;s
    something incredibly interesting about how they bring together <B>thoughtful design</B>,{" "}
    <B>playful interactions</B>, <B>unusual details</B> and <B>genuinely useful functionality</B>. Their work reminds
    me that even the simplest product can have so much <B>personality</B> when enough thought goes into it.
  </>,
  <>
    I believe a great product isn&rsquo;t just about how it looks or how well it functions; it&rsquo;s about finding
    that <B>sweet spot</B> where <B>good design</B>, <B>great functionality</B> and <B>purposeful technology</B> come
    together to create something <B>meaningful</B>.
  </>,
  <>
    And I feel the same way about <B>AI</B>. I don&rsquo;t think AI needs to be squeezed into every product just
    because it&rsquo;s exciting or trending. I&rsquo;d rather spend time figuring out <B>where it actually makes
    sense</B>, what it can improve, and whether it can make an experience more useful or open up possibilities that
    weren&rsquo;t there before.
  </>,
  <>
    That&rsquo;s also how I approach my own work. The things you see here aren&rsquo;t simply projects I&rsquo;ve
    picked up to add to my r&eacute;sum&eacute;. Most of them started with <B>a random thought</B>, a problem I wanted
    to explore, or <B>an idea I couldn&rsquo;t stop thinking about</B>. From there, it&rsquo;s a lot of brainstorming,
    research, collecting references, exploring possibilities, questioning decisions, sketching things out, designing
    interfaces, experimenting with interactions, figuring out the engineering behind them, integrating AI{" "}
    <B>where it genuinely belongs</B>, and eventually finding a way to <B>ship something that works</B>.
  </>,
  <>
    Sometimes things turn out exactly as I imagined, sometimes they take a completely different direction, and
    sometimes I end up <B>learning more from the things that don&rsquo;t work</B>. I enjoy that entire{" "}
    <B>process</B> just as much as seeing the final result.
  </>,
  <>
    Even this portfolio has been <B>one big experiment</B> for me. I&rsquo;ve been refining it for months, revisiting
    sections, changing interactions, adjusting layouts and spending an almost unreasonable amount of time thinking
    about individual <B>details and pixels</B>. Not because every little thing needs to be perfect, but because I
    genuinely enjoy figuring out how all those small decisions come together to create one{" "}
    <B>cohesive experience</B>.
  </>,
  <>
    I want my work to feel <B>thoughtful</B> without being too serious, <B>functional</B> without being boring, and{" "}
    <B>experimental</B> without losing its purpose. I&rsquo;m still exploring, learning, changing my mind and
    discovering new ways to make things, and I think that&rsquo;s what makes this journey exciting. I don&rsquo;t have
    a fixed formula for everything, and I probably don&rsquo;t want one either. I&rsquo;d rather{" "}
    <B>stay curious</B>, keep experimenting and see <B>how far an idea can go</B>.
  </>,
];

const CLOSING = (
  <>
    Ultimately, I hope everything I make carries a little bit of that <B>1G identity</B>: not just in how it looks,
    but in <B>how it works</B>, <B>how it feels</B> and <B>the thought that goes into making it</B>.
  </>
);

/** The woven patch. */
function Patch({ ready }) {
  const ref = useRef(null);

  // Tilt toward the pointer; the sheen follows it across the threads.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    let p = null;
    const paint = () => {
      raf = 0;
      el.style.setProperty("--tx", p ? `${(-p.y * 10).toFixed(2)}deg` : "0deg");
      el.style.setProperty("--ty", p ? `${(p.x * 14).toFixed(2)}deg` : "0deg");
      el.style.setProperty("--sx", p ? `${((p.x + 0.5) * 100).toFixed(1)}%` : "-30%");
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      p = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
      el.dataset.hot = "true";
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      p = null;
      delete el.dataset.hot;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="nc-patch" data-ready={ready} style={{ "--mask": `url(${PATCH})` }}>
      <div className="nc-patch-in">
        {/* Holds the size; the threads are drawn over it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="nc-patch-base" src={PATCH} alt="Not a case study" draggable={false} />
        {Array.from({ length: THREADS }, (_, k) => (
          <span key={k} className="nc-thread" style={{ "--k": k, "--n": THREADS }} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PATCH} alt="" draggable={false} />
          </span>
        ))}
        <span className="nc-sheen" aria-hidden="true" />
      </div>
    </div>
  );
}

/** A paragraph that rises in once it's on screen. */
function Para({ children, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) return setShown(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <p ref={ref} className={`nc-p ${className}`} data-shown={shown}>
      {children}
    </p>
  );
}

export default function NotACaseStudy() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const go = () => alive && setReady(true);
    // Start the weave once the patch has loaded (and the fonts, for the text).
    const img = new window.Image();
    img.src = PATCH;
    Promise.all([img.decode().catch(() => {}), document.fonts?.ready]).then(go);
    const t = setTimeout(go, 1500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  return (
    <main className="nc-page min-h-screen bg-white font-outfit text-black" data-ready={ready}>
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <TransitionLink
          href="/"
          aria-label="Home"
          className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105"
        >
          <Image src="/logo.png" width={40} height={40} alt="Goutham logo" priority className="invert" />
        </TransitionLink>
        <div className="hidden md:block md:fixed md:top-6 md:left-1/2 md:z-50 md:-translate-x-1/2">
          <MinimalNav items={NAV_ITEMS} initialActiveIndex={2} />
        </div>
        <TransitionLink
          href="/#contact"
          className="btn-tactile btn-tactile-dark group inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-5 text-sm font-medium text-white shadow-md hover:bg-[#1a1a1a]"
        >
          Contact
          <ArrowUpRight className="nudge-diag h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </TransitionLink>
      </nav>

      <article className="nc-body">
        <h1 className="sr-only">Not a case study</h1>
        <Patch ready={ready} />

        <div className="nc-text">
          {PARAGRAPHS.map((p, i) => (
            <Para key={i}>{p}</Para>
          ))}
          <Para className="nc-closing">{CLOSING}</Para>
        </div>

        <Para className="nc-end">
          <span className="nc-sign">Goutham</span>
          <span className="nc-links">
            <TransitionLink href="/projects" className="bracket-link bracket-link-dark font-anonymous-pro text-lg text-black md:text-xl">
              <span className="bracket-link-l" aria-hidden="true">[</span>
              <span className="bracket-link-text">See the work</span>
              <span className="bracket-link-r" aria-hidden="true">]</span>
            </TransitionLink>
            <TransitionLink href="/#contact" className="bracket-link bracket-link-dark font-anonymous-pro text-lg text-black md:text-xl">
              <span className="bracket-link-l" aria-hidden="true">[</span>
              <span className="bracket-link-text">Let&rsquo;s talk</span>
              <span className="bracket-link-r" aria-hidden="true">]</span>
            </TransitionLink>
          </span>
        </Para>
      </article>
    </main>
  );
}
