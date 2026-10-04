"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "../components/layout/transition-link";
import BracketHeading from "../components/layout/bracket-heading";
import { GAMES, W, H } from "./games";

const BEST_KEY = (id) => `gg-arcade-${id}`;
const MUTE_KEY = "gg-arcade-mute";

/* Tiny square-wave sounds, the way a cabinet would do it. */
function makeSfx(getMuted) {
  let ctx = null;
  const beep = (f, d = 0.06, type = "square", v = 0.04, slide = 0) => {
    if (getMuted()) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, ctx.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), ctx.currentTime + d);
      g.gain.setValueAtTime(v, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + d);
    } catch {}
  };
  return {
    jump: () => beep(420, 0.09, "square", 0.035, 260),
    score: () => beep(660, 0.07, "square", 0.035, 220),
    tick: () => beep(300, 0.04, "square", 0.03),
    hit: () => beep(140, 0.22, "sawtooth", 0.045, -90),
  };
}

function Bracket({ children, onClick, href, className = "" }) {
  const inner = (
    <>
      <span className="bracket-link-l" aria-hidden="true">[</span>
      <span className="bracket-link-text">{children}</span>
      <span className="bracket-link-r" aria-hidden="true">]</span>
    </>
  );
  const cls = `bracket-link font-anonymous-pro text-base text-white md:text-lg ${className}`;
  return href ? (
    <TransitionLink href={href} className={cls}>{inner}</TransitionLink>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{inner}</button>
  );
}

/* The screen: runs one game, owns the loop, the input and the overlays. */
function Screen({ Game, sprite, muted, onBack }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [phase, setPhase] = useState("ready"); // ready | playing | over
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const sfx = useRef(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY(Game.id)) || 0));
    } catch {}
  }, [Game]);

  const reset = useCallback(() => {
    gameRef.current = new Game({ sprite });
    setPhase("ready");
    setScore(0);
  }, [Game, sprite]);

  useEffect(() => {
    sfx.current = makeSfx(() => mutedRef.current);
    reset();
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const keys = new Set();
    const pressed = new Set();
    const pointer = { x: 0, y: 0, down: false };
    let tap = null;
    let raf = 0;
    let last = performance.now();

    const toLogical = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    const onKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.repeat) return;
      if (e.key === "Escape") return onBack();
      keys.add(e.key);
      pressed.add(e.key);
    };
    const onKeyUp = (e) => keys.delete(e.key);
    const onDown = (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      Object.assign(pointer, toLogical(e), { down: true });
      tap = { ...pointer };
      pressed.add("pointer");
    };
    const onMove = (e) => {
      if (pointer.down) Object.assign(pointer, toLogical(e));
    };
    const onUp = () => {
      pointer.down = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const g = gameRef.current;
      if (!g) return;
      const input = {
        action: pressed.has(" ") || pressed.has("ArrowUp") || pressed.has("pointer"),
        actionHeld: keys.has(" ") || keys.has("ArrowUp") || pointer.down,
        left: pressed.has("ArrowLeft"),
        right: pressed.has("ArrowRight"),
        up: pressed.has("ArrowUp"),
        down: pressed.has("ArrowDown"),
        leftHeld: keys.has("ArrowLeft"),
        rightHeld: keys.has("ArrowRight"),
        upHeld: keys.has("ArrowUp"),
        downHeld: keys.has("ArrowDown"),
        pointer,
        tap,
      };
      pressed.clear();
      tap = null;

      if (g.over) {
        // Any press restarts.
        if (input.action || input.left || input.right) {
          g.reset();
          setPhase("ready");
          setScore(0);
        }
      } else {
        const wasStarted = g.started;
        g.update(dt, input, sfx.current);
        if (!wasStarted && g.started) setPhase("playing");
        if (g.over) {
          setPhase("over");
          try {
            const b = Number(localStorage.getItem(BEST_KEY(Game.id)) || 0);
            if (g.score > b) {
              localStorage.setItem(BEST_KEY(Game.id), String(g.score));
              setBest(g.score);
            }
          } catch {}
        }
      }
      setScore((s) => (s === g.score ? s : g.score));

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      g.draw(ctx);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [Game, onBack]);

  return (
    <div className="arcade-rise" style={{ "--i": 0 }}>
      <div className="flex items-baseline justify-between font-anonymous-pro">
        <h2 className="text-xl text-white md:text-2xl">[ {Game.title} ]</h2>
        <p className="text-sm text-white/50">
          <span className="text-white">{score}</span> <span className="mx-1">·</span> best {best}
        </p>
      </div>
      <div className="arcade-screen relative mt-3 w-full overflow-hidden rounded-md border border-white/15 bg-black" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={canvasRef} width={W} height={H} className="block h-full w-full" aria-label={`${Game.title} game`} />
        {phase !== "playing" && (
          <div className="arcade-overlay pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {phase === "over" ? (
              <>
                <p className="font-anonymous-pro text-xs uppercase tracking-[0.2em] text-white/50">Game over</p>
                <p className="mt-1 font-anonymous-pro text-4xl text-white">{score}</p>
                <p className="mt-3 font-outfit text-xs text-white/60 arcade-blink">press anything to go again</p>
              </>
            ) : (
              <>
                <p className="max-w-[240px] font-outfit text-sm text-white/80">{Game.how}</p>
                <p className="mt-3 font-anonymous-pro text-xs uppercase tracking-[0.2em] text-white/50 arcade-blink">press {Game.keys} to start</p>
              </>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="font-outfit text-xs text-white/45">{Game.keys}. Esc for the arcade.</p>
        <Bracket onClick={onBack}>Arcade</Bracket>
      </div>
    </div>
  );
}

export default function Arcade() {
  const [sprite, setSprite] = useState(null);
  const [Game, setGame] = useState(null);
  const [muted, setMuted] = useState(false);
  const [bests, setBests] = useState({});
  const [ready, setReady] = useState(false);

  // The avatar, drawn down to 16px once so it reads as a sprite when scaled.
  useEffect(() => {
    const img = new window.Image();
    img.src = "/fun/avatar.png";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 24;
      c.height = 24;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = true;
      g.drawImage(img, 0, 0, 24, 24);
      setSprite(c);
      setReady(true);
    };
    try {
      setMuted(localStorage.getItem(MUTE_KEY) === "1");
    } catch {}
  }, []);

  const loadBests = useCallback(() => {
    const b = {};
    try {
      for (const G of GAMES) b[G.id] = Number(localStorage.getItem(BEST_KEY(G.id)) || 0);
    } catch {}
    setBests(b);
  }, []);
  useEffect(loadBests, [loadBests, Game]);

  const toggleMute = () => {
    setMuted((m) => {
      try {
        localStorage.setItem(MUTE_KEY, m ? "0" : "1");
      } catch {}
      return !m;
    });
  };
  const back = useCallback(() => setGame(null), []);

  return (
    <main className="arcade min-h-screen bg-black text-white" data-ready={ready}>
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-8 md:pt-12">
        <header className="arcade-rise flex items-center justify-between" style={{ "--i": 0 }}>
          <TransitionLink href="/" aria-label="Home" className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105">
            <Image src="/logo.png" width={36} height={36} alt="Goutham logo" priority />
          </TransitionLink>
          <button type="button" onClick={toggleMute} className="font-anonymous-pro text-sm text-white/60 transition-colors hover:text-white" aria-pressed={muted}>
            [ sound {muted ? "off" : "on"} ]
          </button>
        </header>

        {!Game ? (
          <>
            <div className="arcade-rise mt-12 flex items-center gap-4 md:mt-16" style={{ "--i": 1 }}>
              <Image src="/fun/avatar.png" alt="" width={56} height={56} className="arcade-avatar h-12 w-12 md:h-14 md:w-14" draggable={false} />
              <div>
                <BracketHeading as="h1" className="font-anonymous-pro text-2xl md:text-4xl">Arcade</BracketHeading>
                <p className="mt-1 font-outfit text-sm text-white/60 md:text-base">Five small games. One me. Scores stay in this browser.</p>
              </div>
            </div>

            <ul className="mt-10 grid gap-3 sm:grid-cols-2 md:mt-12">
              {GAMES.map((G, i) => (
                <li key={G.id} className="arcade-rise" style={{ "--i": 2 + i }}>
                  <button type="button" onClick={() => setGame(() => G)} className="arcade-cab group flex w-full items-center gap-4 rounded-md border border-white/12 bg-[#0d0d0d] p-4 text-left outline-none">
                    <span className="arcade-cab-no font-anonymous-pro text-sm text-white/35">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-anonymous-pro text-lg text-white">[ {G.title} ]</span>
                      <span className="mt-0.5 block truncate font-outfit text-xs text-white/55">{G.how}</span>
                    </span>
                    <span className="font-anonymous-pro text-xs text-white/40">{bests[G.id] ? `best ${bests[G.id]}` : "new"}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="arcade-rise mt-12 flex flex-wrap items-center gap-x-8 gap-y-3" style={{ "--i": 8 }}>
              <Bracket href="/">Back home</Bracket>
              <Bracket href="/beyond">Beyond</Bracket>
            </div>
          </>
        ) : (
          <div className="mt-10 md:mt-14">
            {sprite && <Screen Game={Game} sprite={sprite} muted={muted} onBack={back} />}
          </div>
        )}
      </div>
    </main>
  );
}
