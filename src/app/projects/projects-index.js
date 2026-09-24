"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Github } from "lucide-react";
import MinimalNav from "../components/layout/navbar";
import TransitionLink from "../components/layout/transition-link";
import FadeContent from "../components/layout/fade-in";
import BracketHeading from "../components/layout/bracket-heading";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About me", href: "/#about" },
  { label: "Projects", href: "/projects" },
];

// Logos live at /public/<id>.png, the same marks the homepage tiles use.
const PROJECTS = [
  {
    id: "ideako",
    name: "Ideako",
    tagline: "AI Creative Partner",
    description:
      "An AI creative workspace that learns your voice, understands your references, and helps turn rough ideas into original social content.",
    features: [
      "Personal voice profile",
      "Reference library",
      "AI content generation",
      "Post refinement",
      "AI insights",
      "Smart hashtags",
      "Content history",
      "Multi-model AI",
    ],
    live: "https://ideako.vercel.app/",
    github: "https://github.com/1Goutham/Ideako",
  },
  {
    id: "ztudylock",
    name: "ZtudyLock",
    tagline: "Adaptive AI Study Workspace",
    description:
      "An AI study workspace that turns your own learning material into a personalised study system — helping you understand concepts, practise, identify weaknesses, and revise what actually needs attention.",
    features: [
      "Material-aware AI tutor",
      "Concept extraction",
      "Adaptive study plans",
      "Quizzes & flashcards",
      "Weakness detection",
      "Revision passes",
      "Mastery tracking",
      "Exam mode",
    ],
    live: "https://ztudylock.vercel.app/",
    github: "https://github.com/1Goutham/ZtudyLock",
  },
  {
    id: "fabricnest",
    name: "FabricNest",
    tagline: "Intelligent Commerce Platform",
    description:
      "A full-stack commerce platform built around discovery, personalisation, and real purchasing — combining a premium storefront with intelligent product discovery, recommendations, secure checkout, and progressive personalisation.",
    features: [
      "Intent-based discovery",
      "AI shopping assistant",
      "Personalised recommendations",
      "Product search & filters",
      "Cart & wishlist",
      "Stripe checkout",
      "Order management",
      "Admin system",
    ],
    live: "https://aiecommerce-site.vercel.app/",
    github: "https://github.com/1Goutham/fabric-store",
  },
  {
    id: "ideaguard",
    name: "IdeaGuard",
    tagline: "AI Product Intelligence",
    description:
      "An AI product intelligence workspace that researches, stress-tests, and turns early-stage ideas into evidence-backed product strategy.",
    features: [
      "Market research",
      "Competitive analysis",
      "Feasibility assessment",
      "Risk analysis",
      "Assumption stress testing",
      "MVP planning",
      "Experiments",
      "PRD & technical blueprint",
    ],
    live: "https://ideaguard-ai-zeta.vercel.app/",
    github: "https://github.com/1Goutham/IdeaGuardAI",
  },
];

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Every asterisk on the page turns with the scroll position. One listener
   drives them all through a variable on the page root. */
function useScrollTurn(rootRef) {
  useEffect(() => {
    if (reduceMotion()) return;
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      el.style.setProperty("--turn", `${(window.scrollY * 0.2).toFixed(2)}deg`);
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
  }, [rootRef]);
}

function Star({ className = "" }) {
  return (
    <span className={`turn-star ${className}`} aria-hidden="true">
      &#10035;
    </span>
  );
}

/* The logo leans toward the cursor and a spotlight follows it, as on the
   homepage tiles. Written to CSS variables, no re-renders. */
function Logo({ id, name }) {
  const ref = useRef(null);
  const raf = useRef(0);
  const onPointerMove = useCallback((e) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--tilt-x", `${((0.5 - y) * 16).toFixed(2)}deg`);
      el.style.setProperty("--tilt-y", `${((x - 0.5) * 16).toFixed(2)}deg`);
    });
  }, []);
  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }, []);
  return (
    <span
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="project-logo relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#262626] md:h-16 md:w-16"
    >
      <span className="project-tile-light" aria-hidden="true" />
      <Image
        src={`/${id}.png`}
        alt={`${name} logo`}
        width={120}
        height={120}
        sizes="64px"
        draggable={false}
        className="relative h-[58%] w-[58%] select-none object-contain"
      />
    </span>
  );
}

function ProjectRow({ project, index }) {
  const n = String(index + 1).padStart(2, "0");
  const ref = useRef(null);
  const raf = useRef(0);
  const [inView, setInView] = useState(false);

  // Choreograph the row in once it enters the viewport (see .pr-item in CSS).
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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A soft spotlight follows the cursor across the row.
  const onPointerMove = useCallback((e) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      el.style.setProperty("--rx", `${x.toFixed(0)}px`);
      el.style.setProperty("--ry", `${y.toFixed(0)}px`);
    });
  }, []);

  let k = 0;
  const item = () => ({ className: "pr-item", style: { "--i": k++ } });

  return (
    <article
      ref={ref}
      data-inview={inView}
      onPointerMove={onPointerMove}
      className="project-row relative grid gap-5 py-12 md:grid-cols-[88px_1fr_88px] md:gap-8 md:py-16"
    >
      <span className="project-spot" aria-hidden="true" />
      {/* Index sticks beside its row while the row scrolls past on desktop. */}
      <span className="pr-item project-index font-anonymous-pro text-sm text-white/40 md:sticky md:top-32 md:self-start md:pt-5 md:text-base" style={{ "--i": k++ }}>
        {n}
      </span>

      <div>
        <div className="flex items-center gap-4 md:gap-5">
          <span {...item()}>
            <Logo id={project.id} name={project.name} />
          </span>
          <div className="min-w-0">
            <BracketHeading as="h2" style={{ "--i": k++ }} className="pr-item font-anonymous-pro text-2xl leading-none md:text-4xl">
              {project.name}
            </BracketHeading>
            <p {...item()} className="pr-item mt-1.5 font-outfit text-sm font-medium text-white/85 md:mt-2 md:text-base">
              {project.tagline}
            </p>
          </div>
        </div>

        <p {...item()} className="pr-item mt-6 max-w-2xl font-outfit text-sm font-light leading-relaxed text-white/85 md:mt-7 md:text-base">
          {project.description}
        </p>

        {/* Features arrive one by one, brighten in order on row hover, and each tints green on its own. */}
        <p className="project-features mt-5 max-w-2xl font-outfit text-[13px] leading-loose text-white/60 md:mt-6 md:text-sm">
          {project.features.map((f, i) => (
            <span key={f} className="project-feature" style={{ "--i": i, "--k": k }}>
              {f}
              {i < project.features.length - 1 && <Star className="mx-2 text-[0.85em] text-white/40" />}
            </span>
          ))}
        </p>

        <div {...item()} className="pr-item mt-7 flex flex-wrap items-center gap-x-7 gap-y-4 md:mt-8" style={{ "--i": k + 3 }}>
          <a
            href={project.live}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Explore ${project.name}, opens in a new tab`}
            className="bracket-link group font-anonymous-pro text-lg text-white md:text-xl"
          >
            <span className="bracket-link-l" aria-hidden="true">[</span>
            <span className="bracket-link-text inline-flex items-center gap-1.5">
              Explore
              <ArrowUpRight className="nudge-diag h-[0.9em] w-[0.9em]" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="bracket-link-r" aria-hidden="true">]</span>
          </a>
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${project.name} on GitHub, opens in a new tab`}
            className="social-btn flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80"
          >
            <Github className="h-[17px] w-[17px]" strokeWidth={1.75} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function ProjectsIndex() {
  const rootRef = useRef(null);
  useScrollTurn(rootRef);

  // Stagger the header in once fonts are ready so nothing pops mid-swap.
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
    <main ref={rootRef} className="projects-page min-h-screen bg-black text-white" data-ready={ready}>
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <TransitionLink
          href="/"
          aria-label="Home"
          className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105"
        >
          <Image src="/logo.png" width={40} height={40} alt="Goutham logo" priority />
        </TransitionLink>
        <div className="hidden md:block md:fixed md:top-6 md:left-1/2 md:z-50 md:-translate-x-1/2">
          <MinimalNav items={NAV_ITEMS} initialActiveIndex={2} />
        </div>
        <TransitionLink
          href="/#contact"
          className="btn-tactile group inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-5 font-outfit text-sm font-medium text-black shadow-md hover:bg-[#f2f2f2]"
        >
          Contact
          <ArrowUpRight className="nudge-diag h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </TransitionLink>
      </nav>

      <div className="mx-auto max-w-4xl px-6 pb-24 pt-10 md:px-12 md:pb-32 md:pt-16">
        {/* Title row, centred like the Beyond page's name row. */}
        <header className="projects-rise flex items-center justify-center gap-4 md:gap-5" style={{ "--i": 0 }}>
          <BracketHeading as="h1" className="font-anonymous-pro text-xl md:text-3xl">
            Projects
          </BracketHeading>
          <Star className="text-2xl leading-none md:text-3xl" />
          <p className="font-outfit">
            <span className="block text-sm font-bold leading-snug md:text-base">Products by 1Goutham</span>
            <span className="block text-xs leading-snug text-white/65 md:text-sm">Ideas, interfaces &amp; intelligence</span>
          </p>
        </header>

        <div className="projects-rise mt-14 md:mt-20" style={{ "--i": 1 }}>
          {PROJECTS.map((p, i) => (
            <ProjectRow key={p.id} project={p} index={i} />
          ))}
          <span className="block h-px w-full bg-white/10" aria-hidden="true" />
        </div>

        <FadeContent duration={900} threshold={0.2} className="mt-12 md:mt-16">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 md:pl-[120px]">
            <TransitionLink href="/" className="bracket-link font-anonymous-pro text-lg text-white md:text-2xl">
              <span className="bracket-link-l" aria-hidden="true">[</span>
              <span className="bracket-link-text">Back home</span>
              <span className="bracket-link-r" aria-hidden="true">]</span>
            </TransitionLink>
            <TransitionLink href="/#contact" className="bracket-link font-anonymous-pro text-lg text-white md:text-2xl">
              <span className="bracket-link-l" aria-hidden="true">[</span>
              <span className="bracket-link-text">Let&rsquo;s talk</span>
              <span className="bracket-link-r" aria-hidden="true">]</span>
            </TransitionLink>
          </div>
        </FadeContent>
      </div>
    </main>
  );
}
