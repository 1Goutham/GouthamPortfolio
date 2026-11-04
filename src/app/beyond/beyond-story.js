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
  ["Content creation", "content"],
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
function Piece({ id, d, m, r = 0, z = 3, n = 0, className = "", children, label }) {
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
        // Picked up, it comes to the top (the monitor stays under the desk things).
        if (id !== "tv") el.style.zIndex = String(40 + (Piece.top = (Piece.top || 0) + 1));
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

/**
 * The 1Goutham. space sticker, with a space bar that really presses: the
 * keycap is its own layer over a dark well, and pressing anywhere on the
 * sticker pushes it down into it.
 */
function SpaceLogo() {
  const [down, setDown] = useState(false);
  const press = () => setDown(true);
  const release = () => setDown(false);
  return (
    <div
      className="bt-space"
      data-down={down}
      role="img"
      aria-label="1Goutham. space"
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {/* eslint-disable @next/next/no-img-element */}
      <img className="bt-space-well" src="/1gs-well.webp" alt="" width={642} height={255} draggable={false} />
      <img className="bt-space-base" src="/1gs-base.webp" alt="" width={642} height={255} draggable={false} />
      <img className="bt-space-key" src="/1gs-key.webp" alt="" width={642} height={255} draggable={false} />
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}

/** Things I wanna do in life: a note you can tick off. */
function LifeNote() {
  const [done, setDone] = useState([]);
  const ref = useRef(null);
  const toggle = (k) => setDone((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));

  // The sheet tilts toward the pointer and the light moves across it.
  const onMove = (e) => {
    if (e.pointerType !== "mouse" || reduceMotion()) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 14).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 16).toFixed(2)}deg`);
    el.style.setProperty("--lx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--ly", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    ["--rx", "--ry", "--lx", "--ly"].forEach((v) => el.style.removeProperty(v));
  };

  return (
    <div ref={ref} className="bt-note" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="bt-sheet">
        <span className="bt-perf" aria-hidden="true" />
        <p className="bt-note-h">Things I wanna do in life</p>
        <ul>
          {LIFE.map(([t, k]) => {
            const on = done.includes(k);
            return (
              <li key={k}>
                <button type="button" aria-pressed={on} onClick={() => toggle(k)} onPointerDown={(e) => e.stopPropagation()}>
                  <svg className="bt-check" viewBox="0 0 24 24" aria-hidden="true">
                    <path className="bt-check-box" d="M4.5 5.2c4.6-.6 9.6-.5 14.8.1.5 4.6.4 9.3-.2 13.9-4.8.5-9.6.6-14.4.2-.6-4.7-.7-9.4-.2-14.2z" />
                    <path className="bt-check-tick" d="M7.5 12.4l3.3 3.9L21 3.5" />
                  </svg>
                  <span className="bt-life">
                    {t}
                    <svg className="bt-strike" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M1 6c12-3 24 2 36-1s26-2 38 1 16-1 24-2" />
                    </svg>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <span className="bt-sheet-light" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * The TV, with the story on its screen. The tube is never quite still: a
 * fine static crawls over it, a roll bar drifts down, and it flickers. Reach
 * for the screen and the set leans in so it can be read (the wheel anywhere
 * on it scrolls the story). The knobs work: the first is power (the picture
 * collapses to a line and goes dark), the other two change the channel,
 * which is a burst of static and the next part of the story.
 */
function Tube({ children }) {
  const [on, setOn] = useState(true);
  const [watch, setWatch] = useState(false);
  const [burst, setBurst] = useState(0);
  const [progress, setProgress] = useState(0);
  const screenRef = useRef(null);
  const tvRef = useRef(null);

  useEffect(() => {
    const tv = tvRef.current;
    const scr = screenRef.current;
    if (!tv || !scr) return;
    const onWheel = (e) => {
      if (scr.contains(e.target)) return;
      e.preventDefault();
      scr.scrollTop += e.deltaY;
    };
    tv.addEventListener("wheel", onWheel, { passive: false });
    return () => tv.removeEventListener("wheel", onWheel);
  }, []);

  const onScroll = (e) => {
    const el = e.currentTarget;
    setProgress(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight));
  };

  // Change channel: static, and the next (or last) paragraph comes up.
  const channel = (dir) => {
    if (!on) return;
    setBurst((n) => n + 1);
    const scr = screenRef.current;
    const ps = [...scr.querySelectorAll(".bt-story > *")];
    const top = scr.scrollTop;
    const next = dir > 0 ? ps.find((p) => p.offsetTop > top + 20) : [...ps].reverse().find((p) => p.offsetTop < top - 20);
    setTimeout(() => scr.scrollTo({ top: next ? next.offsetTop - 12 : dir > 0 ? scr.scrollHeight : 0, behavior: "auto" }), 140);
  };
  const stop = (e) => e.stopPropagation();

  return (
    <div className="bt-tv" data-on={on} data-watch={watch}>
      <div
        ref={tvRef}
        className="bt-tv-in"
        data-lenis-prevent
        onPointerOver={(e) => e.pointerType === "mouse" && setWatch(true)}
        onPointerOut={(e) => e.pointerType === "mouse" && !e.currentTarget.contains(e.relatedTarget) && setWatch(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="bt-frame"
          src="/beyond-tv.webp"
          alt=""
          width={1100}
          height={904}
          draggable={false}
        />
        <div className="bt-screen" onFocus={() => setWatch(true)}>
          <div ref={screenRef} className="bt-screen-scroll" onScroll={onScroll} onPointerDown={stop} tabIndex={0} aria-label="My story. Scroll to read.">
            {children}
          </div>
          <span className="bt-noise" aria-hidden="true" />
          <span className="bt-roll" aria-hidden="true" />
          <span className="bt-scan" aria-hidden="true" />
          <span className="bt-glass" aria-hidden="true" />
          <span key={burst} className="bt-static" data-go={burst > 0} aria-hidden="true" />
          <span className="bt-progress" style={{ "--p": progress }} aria-hidden="true" />
          <span className="bt-off" aria-hidden="true" />
        </div>
        <button type="button" className="bt-knob" style={{ "--k": 0 }} onPointerDown={stop} onClick={() => setOn((v) => !v)} aria-pressed={on} aria-label={on ? "Turn the TV off" : "Turn the TV on"} />
        <button type="button" className="bt-knob" style={{ "--k": 1 }} onPointerDown={stop} onClick={() => channel(-1)} aria-label="Previous channel" />
        <button type="button" className="bt-knob" style={{ "--k": 2 }} onPointerDown={stop} onClick={() => channel(1)} aria-label="Next channel" />
      </div>
    </div>
  );
}

export default function BeyondStory() {
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

      <div className="bt-stage">
        {/* The desk: a grid on the left half (on a phone, scattered over the stage). */}
        <div className="bt-desk">
        <Piece id="photo" d={[10.25, 5, 8.9]} m={[5, 2, 32]} r={-3} n={0} label="A taped-up photo of Goutham">
          <HangingPhoto ready={ready} />
        </Piece>

        <Piece id="burst" d={[27.3, 10, 17.1]} m={[42, 2, 54]} r={0} n={1}>
          <SpaceLogo />
        </Piece>

        <Piece id="cs" d={[54.3, 15, 12.6]} m={[50, 11, 42]} r={6} n={2}>
          <TransitionLink href="/projects" className="bt-pill font-outfit">
            projects <ArrowUpRight className="h-[1em] w-[1em]" strokeWidth={2} aria-hidden="true" />
          </TransitionLink>
        </Piece>

        <Piece id="title" d={[32.7, 30.4, 12.9]} m={[42, 17, 48]} r={7} n={3} className="bt-title-piece">
          <p className="bt-title font-anonymous-pro">
            <Brackets tight>Beyond</Brackets>
          </p>
        </Piece>

        <Piece id="home" d={[76.5, 16.4, 11.4]} m={[58, 38, 32]} r={-18} n={4}>
          <TransitionLink href="/" className="bt-home font-anonymous-pro">
            <Brackets tight>Back Home</Brackets>
          </TransitionLink>
        </Piece>

        <Piece id="patch" d={[48.4, 34.4, 10.8]} m={[52, 29.5, 38]} r={-15} n={5}>
          <TransitionLink href="/casestudies" aria-label="Case studies">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="bt-patch" src="/notacasestudy.webp" alt="" width={760} height={369} draggable={false} />
          </TransitionLink>
        </Piece>

        <Piece id="intro" d={[7.1, 41.6, 28.5]} m={[5, 24.5, 90]} r={0} n={6} className="bt-intro-piece">
          <div className="bt-intro">
            <Brackets tight className="font-anonymous-pro text-black">Goutham G</Brackets>
            <ScrollStar />
            <p className="font-outfit">
              <span className="block font-bold">A bit more about me :)</span>
              <span className="block text-black/70">and some blahh blahhhhhh</span>
            </p>
          </div>
        </Piece>

        <Piece id="arcade" d={[35.5, 55.6, 4.3]} m={[87, 37.5, 10]} r={-10} n={7}>
          <TransitionLink href="/arcade" aria-label="Try my arcade" className="bt-arcade">
            <Image src="/ArcadePic.png" alt="" width={1292} height={1320} sizes="90px" draggable={false} />
          </TransitionLink>
        </Piece>

        <Piece id="note" d={[10, 56.4, 17.3]} m={[5, 35, 44]} r={10} n={8}>
          <LifeNote />
        </Piece>


        <Piece id="works" d={[33.9, 69, 19.6]} m={[53, 45, 43]} r={-12} n={9}>
          <TransitionLink href="/works" className="bt-card font-outfit">
            <span className="bt-card-top">
              <b>1G-works</b>
              <span>[ let&rsquo;s build ]</span>
              <i aria-hidden="true">&times;</i>
            </span>
            <span className="bt-card-body">
              <Image src="/headgcwork.png" alt="" width={189} height={145} sizes="40px" />
              <span>
                <b>Need a creative website or digital product?</b> Design, web, growth and AI for your
                business, built end to end with 1G-works.
              </span>
            </span>
          </TransitionLink>
        </Piece>
        </div>

        <Piece id="tv" d={[53.2, 29, 45]} m={[-14, 59, 128]} r={0} z={2} n={0} label="The monitor, with my story on it">
          <Tube>
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
          </Tube>
        </Piece>
      </div>
    </main>
  );
}

/* A pipeline word: reads as plain text, a black marker fills in behind it on hover. */
function Step({ children }) {
  return <span className="journey-step">{children}</span>;
}
