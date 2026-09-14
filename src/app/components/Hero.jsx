'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import MinimalNav from './layout/navbar';

// Drop the profile artwork (face + "[ Vanakamm! ]" lettering) in at
// /public/heropageprofile.png to swap the picture.
const PROFILE_SRC = "/heropageprofile.png";

// Thirukkural 611 (chapter 62, ஆள்வினையுடைமை / Perseverance).
const KURAL = {
  tamil: ["அருமை உடைத்தென்று அசாவாமை வேண்டும்", "பெருமை முயற்சி தரும்."],
  english: ["Never lose heart thinking a task is hard;", "perseverance brings greatness."],
  source: "Thirukkural 611",
};

const NAV_ITEMS = [
  { label: "Home", href: "#" },
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "G-Talk", href: "#Gtalk" },
];

/* Bracketed link: the brackets ease outward and the label brightens on hover. */
function BracketLink({ href, children }) {
  return (
    <a href={href} className="bracket-link font-anonymous-pro text-lg text-white md:text-2xl">
      <span className="bracket-link-l" aria-hidden="true">[</span>
      <span className="bracket-link-text">{children}</span>
      <span className="bracket-link-r" aria-hidden="true">]</span>
    </a>
  );
}

/* The kural crossfades to its English translation on hover / focus; a tap or
   click pins the translation so it works on touch screens too. */
function Kural() {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const showEnglish = hover || pinned;

  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label="Thirukkural 611, toggle English translation"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={() => setPinned((v) => !v)}
      className="kural grid w-fit cursor-pointer text-left outline-none"
      data-lang={showEnglish ? "en" : "ta"}
    >
      <span
        className="kural-ta col-start-1 row-start-1 block font-tamil text-sm leading-relaxed text-white/85 md:text-[15px]"
        lang="ta"
      >
        {KURAL.tamil.map((line) => (
          <span key={line} className="block">{line}</span>
        ))}
      </span>
      <span
        className="kural-en col-start-1 row-start-1 block font-outfit text-sm leading-relaxed text-white/85 md:text-[15px]"
        aria-hidden={!showEnglish}
      >
        {KURAL.english.map((line) => (
          <span key={line} className="block">{line}</span>
        ))}
      </span>
      <span
        className="kural-hint col-start-1 row-start-2 mt-2 block font-anonymous-pro text-[11px] tracking-[0.25em] text-white/35"
        aria-hidden="true"
      >
        <span className="md:hidden">{showEnglish ? KURAL.source : "tap to translate"}</span>
        <span className="hidden md:inline">{showEnglish ? KURAL.source : "hover to translate"}</span>
      </span>
    </button>
  );
}

export default function Hero() {
  const frameRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // The portrait leans a few degrees toward the cursor and settles back on leave.
  const onPointerMove = useCallback((e) => {
    const el = frameRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 8, y: px * 10 });
  }, []);
  const resetTilt = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  // Stagger the copy in once fonts are ready so nothing pops mid-swap.
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
    <header className="hero relative overflow-hidden bg-black text-white" data-ready={ready}>
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <a href="#" aria-label="Home" className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105">
          <Image src="/logo.png" width={40} height={40} alt="Goutham logo" priority />
        </a>
        <div className="hidden md:block md:fixed md:top-6 md:left-1/2 md:z-50 md:-translate-x-1/2">
          <MinimalNav items={NAV_ITEMS} initialActiveIndex={0} />
        </div>
        <a
          href="#contact"
          className="btn-tactile group inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-5 font-outfit text-sm font-medium text-black shadow-md hover:bg-[#f2f2f2]"
        >
          Contact
          <ArrowUpRight className="nudge-diag h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </a>
      </nav>

      <div className="relative mx-auto flex min-h-[560px] max-w-6xl flex-col items-center justify-center gap-10 px-6 pb-16 pt-6 md:min-h-[680px] md:flex-row md:gap-16 md:px-12 md:pb-24">
        {/* Portrait: the "[ Vanakamm! ]" lettering is baked into the artwork. */}
        <div
          ref={frameRef}
          onPointerMove={onPointerMove}
          onPointerLeave={resetTilt}
          className="hero-portrait relative w-[240px] shrink-0 sm:w-[280px] md:w-[340px] lg:w-[380px]"
          style={{ "--tilt-x": `${tilt.x}deg`, "--tilt-y": `${tilt.y}deg` }}
        >
          <div className="hero-portrait-inner">
            <Image
              src={PROFILE_SRC}
              width={940}
              height={1100}
              sizes="(max-width: 640px) 240px, (max-width: 768px) 280px, (max-width: 1024px) 340px, 380px"
              alt="Goutham smiling in green glasses, greeting you with Vanakamm!"
              priority
              draggable={false}
              className="select-none"
            />
          </div>
        </div>

        {/* Copy */}
        <div className="hero-copy max-w-xl text-center md:text-left">
          <h1 className="hero-line font-outfit text-xl leading-snug text-white sm:text-2xl md:text-[26px] lg:text-[28px]" style={{ "--i": 1 }}>
            I build digital products with AI, code &amp; design.
          </h1>
          <p className="hero-line mt-2 font-outfit text-sm font-semibold text-white sm:text-base md:text-[17px]" style={{ "--i": 2 }}>
            AI Fullstack Developer &amp; Product Designer
          </p>

          <div className="hero-line mt-6 flex justify-center md:mt-7 md:block" style={{ "--i": 3 }}>
            <Kural />
          </div>

          <div className="hero-line mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:mt-10 md:justify-start" style={{ "--i": 4 }}>
            <BracketLink href="#projects">View my work</BracketLink>
            <BracketLink href="#contact">Let&rsquo;s talk</BracketLink>
          </div>
        </div>
      </div>
    </header>
  );
}
