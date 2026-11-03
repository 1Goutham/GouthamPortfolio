"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Github, Instagram, Linkedin, Mail } from "lucide-react";
import TransitionLink from "../components/layout/transition-link";
import MinimalNav from "../components/layout/navbar";
import Asterisk from "../components/layout/asterisk";

// The taped print at /public/beyondpic.png is shown at its own proportions;
// the tape in the artwork is the pivot the photo swings from, so
// `--pivot-x` / `--pivot-y` in globals.css are where that tape sits.
const PHOTO_SRC = "/beyondpic.png";

// Where else to find me (they used to sit in the contact section).
const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/goutham-g-98a0ba253/", Icon: Linkedin },
  { label: "GitHub", href: "https://github.com/1Goutham", Icon: Github },
  { label: "Instagram", href: "https://www.instagram.com/tanger.ineee/", Icon: Instagram },
  { label: "Email", href: "mailto:gouthamgopinath.tsi@gmail.com", Icon: Mail },
];

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About me", href: "/#about" },
  { label: "Projects", href: "/projects" },
];

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
    <span ref={ref} className="beyond-star text-2xl leading-none text-black md:text-3xl" aria-hidden="true">
      <Asterisk />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  The desk                                                           */
/* ------------------------------------------------------------------ */

// Every piece on the desk, placed as in the design: x/y/w as shares of the
// stage (desktop, then phone), and its resting tilt.
const LIFE = [
  ["Direct a film", "film"],
  ["Make a lot of money", "money"],
  ["Build something millions use", "millions"],
  ["Get ridiculously fit", "fit"],
  ["Travel the world", "travel"],
];

/**
 * Anything on the desk can be picked up and moved: it lifts (bigger, a
 * deeper shadow, straightened a little), follows the pointer with a lean
 * into the motion, and is put down where you let go. A press that doesn't
 * move is a click, so the links on the desk still work.
 */
function Piece({ id, d, m, r = 0, z = 1, n = 0, className = "", children, label }) {
  const ref = useRef(null);
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const el = ref.current;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const ox = parseFloat(el.style.getPropertyValue("--dx")) || 0;
    const oy = parseFloat(el.style.getPropertyValue("--dy")) || 0;
    let moved = false;
    let lastX = x0;
    const move = (ev) => {
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      if (!moved) {
        moved = true;
        el.setPointerCapture(ev.pointerId);
        el.dataset.held = "true";
        el.style.zIndex = String(40 + (Piece.top = (Piece.top || 0) + 1));
      }
      el.style.setProperty("--dx", `${ox + dx}px`);
      el.style.setProperty("--dy", `${oy + dy}px`);
      el.style.setProperty("--lean", `${Math.max(-10, Math.min(10, (ev.clientX - lastX) * 0.8))}deg`);
      lastX = ev.clientX;
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.style.setProperty("--lean", "0deg");
      delete el.dataset.held;
      if (moved) {
        // A drag isn't a click: swallow the one that follows.
        const stop = (c) => {
          c.preventDefault();
          c.stopPropagation();
        };
        el.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => el.removeEventListener("click", stop, { capture: true }), 0);
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  return (
    <div
      ref={ref}
      className={`bt-piece ${className}`}
      data-id={id}
      aria-label={label}
      style={{
        "--x": `${d[0]}%`,
        "--y": `${d[1]}%`,
        "--w": `${d[2]}%`,
        "--mx": `${m[0]}%`,
        "--my": `${m[1]}%`,
        "--mw": `${m[2]}%`,
        "--r": `${r}deg`,
        "--n": n,
        zIndex: z,
      }}
      onPointerDown={onPointerDown}
    >
      <div className="bt-piece-in">{children}</div>
    </div>
  );
}

/** The 1Goutham sticker: a starburst with a keycap under it. */
function Burst() {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const rr = i % 2 ? 0.62 : 1;
    pts.push(`${(50 + Math.cos(a) * 48 * rr).toFixed(1)},${(50 + Math.sin(a) * 30 * rr).toFixed(1)}`);
  }
  return (
    <div className="bt-burst" aria-label="1Goutham. space">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points={pts.join(" ")} />
      </svg>
      <span className="bt-burst-word">1Goutham.</span>
      <span className="bt-key">space</span>
    </div>
  );
}

/** Things I wanna do in life: a note you can tick off. */
function LifeNote() {
  const [done, setDone] = useState([]);
  const toggle = (k) => setDone((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  return (
    <div className="bt-note">
      <p className="bt-note-h">
        Things I wanna do <mark>in life:</mark>
      </p>
      <ul>
        {LIFE.map(([t, k]) => (
          <li key={k}>
            <button type="button" aria-pressed={done.includes(k)} onClick={() => toggle(k)} onPointerDown={(e) => e.stopPropagation()}>
              <span className="bt-box" aria-hidden="true" />
              <span className="bt-life">{t.split(" ").map((w, i) => (["money", "millions", "fit", "travel"].includes(w.toLowerCase()) ? <mark key={i}>{w} </mark> : `${w} `))}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The monitor, with the story on its screen. At rest it sits at the angle it
 * was drawn at; reach for it and it rights itself so the screen reads level.
 * The screen scrolls on its own (the page doesn't), the LED turns it off and
 * on (an old CRT collapsing to a line), and the lamp switches on and off.
 */
function Monitor({ children }) {
  const [on, setOn] = useState(true);
  const [lamp, setLamp] = useState(true);
  const [level, setLevel] = useState(false);
  const [progress, setProgress] = useState(0);
  const screenRef = useRef(null);

  useEffect(() => {
    // Phones: it starts level (there's no pointer to reach for it with).
    if (window.matchMedia("(hover: none)").matches) setLevel(true);
  }, []);

  const onScroll = (e) => {
    const el = e.currentTarget;
    setProgress(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight));
  };

  return (
    <div
      className="bt-tv"
      data-level={level}
      data-on={on}
      data-lamp={lamp}
      onPointerEnter={(e) => e.pointerType === "mouse" && setLevel(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setLevel(false)}
      onFocus={() => setLevel(true)}
    >
      <span className="bt-lamp-light" aria-hidden="true" />
      <div className="bt-tv-in">
        <div className="bt-screen">
          <div ref={screenRef} className="bt-screen-scroll" data-lenis-prevent onScroll={onScroll} tabIndex={0} aria-label="My story. Scroll to read.">
            {children}
          </div>
          <span className="bt-scan" aria-hidden="true" />
          <span className="bt-glass" aria-hidden="true" />
          <span className="bt-progress" style={{ "--p": progress }} aria-hidden="true" />
          <span className="bt-off" aria-hidden="true" />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bt-frame" src="/beyond-tv.webp" alt="" width={1100} height={1100} draggable={false} />
        <button type="button" className="bt-led" onClick={() => setOn((v) => !v)} aria-pressed={on} aria-label={on ? "Turn the monitor off" : "Turn the monitor on"} />
        <button type="button" className="bt-bulb" onClick={() => setLamp((v) => !v)} aria-pressed={lamp} aria-label={lamp ? "Switch the lamp off" : "Switch the lamp on"} />
      </div>
    </div>
  );
}

const INK_MS = 750;

/**
 * A brush that follows the mouse over the desk, as on the Margin teaser:
 * strokes swell when the hand slows and thin out when it hurries, fade as
 * they age, and are drawn white with a difference blend, so they read as
 * ink on the paper and as a negative of whatever they cross.
 */
function useBrush() {
  const stageRef = useRef(null);
  const inkRef = useRef(null);
  const ink = useRef({ pts: [], raf: 0 });

  useEffect(() => {
    const stage = stageRef.current;
    const cv = inkRef.current;
    if (!stage || !cv) return;
    const fit = () => {
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    const t = ink.current;
    return () => {
      ro.disconnect();
      cancelAnimationFrame(t.raf);
    };
  }, []);

  const draw = useCallback(() => {
    const t = ink.current;
    const cv = inkRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const now = performance.now();
    t.pts = t.pts.filter((q) => now - q.t < INK_MS);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 2; i < t.pts.length; i++) {
      const a = t.pts[i - 2];
      const b = t.pts[i - 1];
      const c = t.pts[i];
      if (c.t - b.t > 90) continue;
      const life = 1 - (now - c.t) / INK_MS;
      // Midpoints and a curve through b, so the stroke is smooth, not jointed.
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, life * 1.15).toFixed(3)})`;
      ctx.lineWidth = Math.max(0.5, c.w * (0.35 + 0.65 * life));
      ctx.beginPath();
      ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
      ctx.stroke();
    }
    t.raf = t.pts.length ? requestAnimationFrame(draw) : 0;
  }, []);

  const onBrush = (e) => {
    if (e.pointerType !== "mouse" || reduceMotion()) return;
    const r = stageRef.current.getBoundingClientRect();
    const t = ink.current;
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const now = performance.now();
    const prev = t.pts[t.pts.length - 1];
    // Slow is heavy, fast is light; eased so the width breathes.
    const speed = prev ? Math.hypot(x - prev.x, y - prev.y) / Math.max(8, now - prev.t) : 0;
    const target = Math.max(2, Math.min(16, 15 - speed * 6));
    const w = prev ? prev.w + (target - prev.w) * 0.3 : 4;
    t.pts.push({ x, y, t: now, w });
    if (!t.raf) t.raf = requestAnimationFrame(draw);
  };

  return { stageRef, inkRef, onBrush };
}

export default function BeyondStory() {
  const { stageRef, inkRef, onBrush } = useBrush();
  // Lay the desk out once fonts are ready so nothing pops mid-swap.
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
    <main className="bt-page min-h-screen bg-white text-black" data-ready={ready}>
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <TransitionLink
          href="/"
          aria-label="Home"
          className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105"
        >
          <Image src="/logo.png" width={40} height={40} alt="Goutham logo" priority className="invert" />
        </TransitionLink>
        <div className="hidden md:block md:fixed md:top-6 md:left-1/2 md:z-50 md:-translate-x-1/2">
          <MinimalNav items={NAV_ITEMS} initialActiveIndex={1} />
        </div>
        <TransitionLink
          href="/#contact"
          className="btn-tactile btn-tactile-dark group inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-5 font-outfit text-sm font-medium text-white shadow-md hover:bg-[#1a1a1a]"
        >
          Contact
          <ArrowUpRight className="nudge-diag h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </TransitionLink>
      </nav>

      <h1 className="sr-only">Beyond: a bit more about Goutham</h1>

      <div className="bt-stage" ref={stageRef} onPointerMove={onBrush}>
        <canvas ref={inkRef} className="bt-ink" aria-hidden="true" />
        <Piece id="photo" d={[7, 4, 9.5]} m={[5, 2, 32]} r={-3} n={0} label="A taped-up photo of Goutham">
          <HangingPhoto ready={ready} />
        </Piece>

        <Piece id="burst" d={[21, 9, 17]} m={[42, 2, 54]} r={-5} n={1}>
          <Burst />
        </Piece>

        <Piece id="cs" z={3} d={[40.5, 13, 11.5]} m={[50, 11, 42]} r={6} n={2}>
          <TransitionLink href="/casestudies" className="bt-pill font-outfit">
            case study <ArrowUpRight className="h-[1em] w-[1em]" strokeWidth={2} aria-hidden="true" />
          </TransitionLink>
        </Piece>

        <Piece id="title" d={[21, 35, 14]} m={[42, 17, 48]} r={4} n={3} className="bt-title-piece">
          <p className="bt-title font-anonymous-pro">
            <Brackets>Beyond</Brackets>
          </p>
        </Piece>

        <Piece id="home" z={3} d={[33.5, 79, 12]} m={[58, 47, 38]} r={-6} n={4}>
          <TransitionLink href="/" className="bt-home font-anonymous-pro">
            <Brackets>Back Home</Brackets>
          </TransitionLink>
        </Piece>

        <Piece id="patch" d={[38, 32, 11]} m={[52, 29.5, 38]} r={-8} n={5}>
          <TransitionLink href="/casestudies" aria-label="Case studies">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="bt-patch" src="/notacasestudy.webp" alt="" width={760} height={369} draggable={false} />
          </TransitionLink>
        </Piece>

        <Piece id="intro" d={[7, 51, 34]} m={[5, 24.5, 90]} r={0} n={6} className="bt-intro-piece">
          <div className="bt-intro">
            <Brackets tight className="font-anonymous-pro text-black">Goutham G</Brackets>
            <ScrollStar />
            <p className="font-outfit">
              <span className="block font-bold">A bit more about me :)</span>
              <span className="block text-black/70">and some blahh blahhhhhh</span>
            </p>
          </div>
        </Piece>

        <Piece id="arcade" d={[27, 69, 4.5]} m={[68, 37, 14]} r={-10} n={7}>
          <TransitionLink href="/arcade" aria-label="Try my arcade" className="bt-arcade">
            <Image src="/ArcadePic.png" alt="" width={1292} height={1320} sizes="90px" draggable={false} />
          </TransitionLink>
        </Piece>

        <Piece id="note" d={[7, 63, 16]} m={[5, 34, 50]} r={-4} n={8}>
          <LifeNote />
        </Piece>


        <div className="bt-monitor-wrap">
          <Monitor>
            <div className="bt-screen-pad">
              <p className="bt-screen-kicker font-anonymous-pro">~/beyond/story.txt</p>
              <div className="bt-story">
                <p className={para}>
                  <span className="font-bold text-black">Hey, Vanakkam!</span> I&rsquo;m Goutham. I&rsquo;m a little curious,
                  a little obsessive, and I tend to notice small things, sometimes a little too much. I can spend a
                  surprising amount of time wondering if something is{" "}
                  {/* It is. Hover it and it settles into place. */}
                  <span className="beyond-2px">2px out of place</span>, then realise I&rsquo;ve been sitting there for
                  two hours. I like simple things done thoughtfully, good conversations, interesting ideas, quiet
                  spaces, and the occasional random creative experiment.
                </p>

                <p className={para}>
                  I&rsquo;m naturally curious about how things work, so I often end up going down little rabbit holes.
                  Sometimes they lead somewhere useful, sometimes they really don&rsquo;t. Either way, I usually learn
                  something along the way.
                </p>

                <p className={para}>
                  I like making things, learning things, trying things, and occasionally overthinking them. Nothing
                  too profound, just trying to stay curious and enjoy the process.
                </p>

                {/* The console is the link: it leans when you reach for it. */}
                <p className={para}>
                  I&rsquo;m very into retro gaming{" "}
                  <TransitionLink href="/arcade" aria-label="Try my arcade" className="beyond-console">
                    <Image src="/ArcadePic.png" alt="" width={1292} height={1320} sizes="28px" draggable={false} />
                  </TransitionLink>{" "}
                  click on it and try my arcade!
                </p>

                <div className="pt-2">
                  <p className="font-outfit text-base md:text-lg">
                    <span className="text-lg font-bold md:text-xl">Warning!</span> unnecessary personal journey ahead.
                  </p>
                </div>

                <div>
                  <p className={para}>
                    I started as a freelance designer while I was in college. My first client asked me to design a
                    set of game cards, so I went all in on the graphics. He liked the work enough to pay me a
                    little extra. I still don&rsquo;t know why, but that appreciation stuck with me. It pushed me deeper
                    into design.
                  </p>
                </div>

                <div>
                  <p className={para}>
                    From graphic design, I moved into web design and started learning more about UX research,
                    interactions, and how people actually experience products. But after a while, I wanted more
                    than just designing them.
                  </p>
                </div>

                <div>
                  <p className="font-outfit text-sm font-bold leading-relaxed text-black md:text-base">
                    I wanted to build what I designed.
                  </p>
                </div>

                <div>
                  <p className={para}>
                    Back then, AI wasn&rsquo;t capable enough for me to rely on it for building products, so I decided
                    to learn full-stack development from scratch. It took me nearly a year to become comfortable
                    building things on my own. Somewhere along the way, I realised how interesting it was to bring
                    design and development together: I could think about the experience and actually make it work.
                  </p>
                </div>

                <div>
                  <p className={para}>
                    Then AI became much more capable, and naturally, I started exploring it too. I learned how AI
                    could fit into the products I was already designing and building, rather than treating it as
                    something separate.
                  </p>
                </div>

                <div>
                  <p className={para}>
                    Today, I enjoy taking an idea all the way from{" "}
                    <Step>{PIPELINE[0]}</Step> and <Step>{PIPELINE[1]}</Step> to <Step>{PIPELINE[2]}</Step>,{" "}
                    <Step>{PIPELINE[3]}</Step>, and <Step>{PIPELINE[4]}</Step>. I can explore the problem, shape the
                    experience, build the product, make it AI-powered when it genuinely adds value, and ship it.
                  </p>
                </div>

                <div>
                  <p className={para}>
                    That&rsquo;s probably the part of my journey I&rsquo;m most excited about: not having to choose between
                    design, code, and AI.
                  </p>
                </div>
              </div>


              <ul className="bt-socials" aria-label="Find me elsewhere">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                      aria-label={href.startsWith("mailto:") ? `Email me at ${href.slice(7)}` : `${label}, opens in a new tab`}
                      className="social-btn social-btn-dark flex h-10 w-10 items-center justify-center rounded-full border border-black/15 text-black/75"
                    >
                      <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="bt-eof font-anonymous-pro">[ end of file ]</p>
            </div>
          </Monitor>
        </div>
      </div>
    </main>
  );
}

/* A pipeline word: reads as plain text, a black marker fills in behind it on hover. */
function Step({ children }) {
  return <span className="journey-step">{children}</span>;
}
