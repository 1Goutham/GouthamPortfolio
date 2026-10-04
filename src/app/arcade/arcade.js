"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "../components/layout/transition-link";
import BracketHeading from "../components/layout/bracket-heading";
import Asterisk from "../components/layout/asterisk";
import { GAMES, W, H } from "./games";

const BEST_KEY = (id) => `gg-arcade-${id}`;
const MUTE_KEY = "gg-arcade-mute";
const UNLOCK_KEY = "gg-arcade-unlocked"; // index of the highest level opened

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
function Screen({ Game, level, sprite, muted, onBack, onNext, onCleared }) {
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
          if (g.score >= Game.goal) onCleared(level);
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
  }, [Game, level, onBack, onCleared]);

  return (
    <div className="arcade-rise" style={{ "--i": 0 }}>
      {/* Marquee strip above the screen: level, title, task; score on the right. */}
      <div className="flex items-end justify-between gap-6 border-b border-white/10 pb-3">
        <div>
          <p className="font-anonymous-pro text-xs uppercase tracking-[0.2em] text-white/40">Level {String(level + 1).padStart(2, "0")}</p>
          <h2 className="mt-1 font-anonymous-pro text-2xl leading-none text-white md:text-3xl">[ {Game.title} ]</h2>
          <p className="mt-2 font-outfit text-sm text-white/60">{Game.task}.</p>
        </div>
        <div className="text-right font-anonymous-pro">
          <p className="text-4xl leading-none text-white tabular-nums md:text-5xl">{String(score).padStart(3, "0")}</p>
          <p className="mt-1 text-xs text-white/40">best {String(best).padStart(3, "0")}</p>
        </div>
      </div>
      <div className="arcade-screen relative mt-5 w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={canvasRef} width={W} height={H} className="block h-full w-full" aria-label={`${Game.title} game`} />
        {phase !== "playing" && (
          <div className="arcade-overlay pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {phase === "over" ? (
              <>
                <p className="font-anonymous-pro text-xs uppercase tracking-[0.2em] text-white/50">
                  {score >= Game.goal ? "Level cleared" : "Game over"}
                </p>
                <p className="mt-1 font-anonymous-pro text-4xl text-white">{score}</p>
                <p className="mt-3 font-outfit text-xs text-white/60 arcade-blink">
                  {score >= Game.goal && onNext ? "next level is open" : "press anything to go again"}
                </p>
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
        <p className="font-anonymous-pro text-xs text-white/40">{Game.keys} <span className="mx-1 text-white/25">·</span> esc</p>
        <span className="flex items-center gap-6">
          {phase === "over" && score >= Game.goal && onNext && <Bracket onClick={onNext}>Next</Bracket>}
          <Bracket onClick={onBack}>Arcade</Bracket>
        </span>
      </div>
    </div>
  );
}

export default function Arcade() {
  const [sprite, setSprite] = useState(null);
  const [level, setLevel] = useState(null);
  const [unlocked, setUnlocked] = useState(0);
  const [muted, setMuted] = useState(false);
  const [bests, setBests] = useState({});
  const [ready, setReady] = useState(false);

  // The avatar, drawn down to 16px once so it reads as a sprite when scaled.
  useEffect(() => {
    const img = new window.Image();
    img.src = "/arcade/avatar.png";
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
      setUnlocked(Number(localStorage.getItem(UNLOCK_KEY) || 0));
    } catch {}
  }, []);

  // Clearing a level's task opens the next one.
  const onCleared = useCallback((i) => {
    setUnlocked((u) => {
      const n = Math.max(u, Math.min(i + 1, GAMES.length - 1));
      try {
        localStorage.setItem(UNLOCK_KEY, String(n));
      } catch {}
      return n;
    });
  }, []);

  const loadBests = useCallback(() => {
    const b = {};
    try {
      for (const G of GAMES) b[G.id] = Number(localStorage.getItem(BEST_KEY(G.id)) || 0);
    } catch {}
    setBests(b);
  }, []);
  useEffect(loadBests, [loadBests, level]);

  const toggleMute = () => {
    setMuted((m) => {
      try {
        localStorage.setItem(MUTE_KEY, m ? "0" : "1");
      } catch {}
      return !m;
    });
  };
  const back = useCallback(() => setLevel(null), []);
  const Game = level === null ? null : GAMES[level];
  const next = level !== null && level < GAMES.length - 1 ? () => setLevel(level + 1) : null;

  return (
    <main className="arcade min-h-screen bg-black text-white" data-ready={ready}>
      <nav className="arcade-rise relative z-10 flex items-center justify-between px-6 py-6 md:px-12" style={{ "--i": 0 }}>
        <TransitionLink href="/" aria-label="Home" className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105">
          <Image src="/logo.png" width={40} height={40} alt="Goutham logo" priority />
        </TransitionLink>
        <button type="button" onClick={toggleMute} className="bracket-link font-anonymous-pro text-sm text-white md:text-base" aria-pressed={muted}>
          <span className="bracket-link-l" aria-hidden="true">[</span>
          <span className="bracket-link-text">sound {muted ? "off" : "on"}</span>
          <span className="bracket-link-r" aria-hidden="true">]</span>
        </button>
      </nav>

      <div className="mx-auto max-w-3xl px-6 pb-24 pt-6 md:px-12 md:pb-32 md:pt-10">
        {!Game ? (
          <>
            {/* Title row, in the same shape as the Beyond and Projects pages. */}
            <header className="arcade-rise flex items-center justify-center gap-4 md:gap-5" style={{ "--i": 1 }}>
              <BracketHeading as="h1" className="font-anonymous-pro text-xl md:text-3xl">Arcade</BracketHeading>
              <Asterisk className="text-2xl leading-none md:text-3xl" />
              <p className="font-outfit">
                <span className="block text-sm font-bold leading-snug md:text-base">Five levels, one me</span>
                <span className="block text-xs leading-snug text-white/65 md:text-sm">Clear one to open the next</span>
              </p>
            </header>

            {/* Progress: one dot per level, filled when cleared. */}
            <div className="arcade-rise mt-12 flex items-center gap-3 md:mt-16" style={{ "--i": 2 }}>
              <Image src="/arcade/avatar.png" alt="" width={56} height={56} className="arcade-avatar h-9 w-9" draggable={false} />
              <div className="flex items-center gap-2" aria-label="Progress">
                {GAMES.map((G, i) => (
                  <span key={G.id} className="arcade-dot" data-state={(bests[G.id] || 0) >= G.goal ? "done" : i <= unlocked ? "open" : "locked"} />
                ))}
              </div>
              <span className="font-anonymous-pro text-xs text-white/40">
                {GAMES.filter((G) => (bests[G.id] || 0) >= G.goal).length} / {GAMES.length}
              </span>
            </div>

            {/* The levels: hairline rows, like the project rows. */}
            <ol className="mt-6 border-t border-white/10 md:mt-8">
              {GAMES.map((G, i) => {
                const locked = i > unlocked;
                const done = (bests[G.id] || 0) >= G.goal;
                return (
                  <li key={G.id} className="arcade-rise" style={{ "--i": 3 + i }}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setLevel(i)}
                      className="arcade-row grid w-full grid-cols-[40px_1fr_auto] items-center gap-4 border-b border-white/10 py-5 text-left outline-none md:grid-cols-[56px_1fr_auto] md:py-6"
                      data-locked={locked}
                    >
                      <span className="arcade-row-no font-anonymous-pro text-sm text-white/35 md:text-base">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="arcade-row-title block font-anonymous-pro text-xl text-white md:text-2xl">
                          <span className="arcade-row-l" aria-hidden="true">[</span> {G.title} <span className="arcade-row-r" aria-hidden="true">]</span>
                        </span>
                        <span className="mt-1 block font-outfit text-xs text-white/55 md:text-sm">{locked ? "Clear the level before it" : G.task}</span>
                      </span>
                      <span className="font-anonymous-pro text-xs text-white/40 md:text-sm">
                        {locked ? "locked" : done ? "cleared" : bests[G.id] ? `best ${bests[G.id]}` : "play"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="arcade-rise mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 md:mt-16" style={{ "--i": 9 }}>
              <Bracket href="/">Back home</Bracket>
              <Bracket href="/beyond">Beyond</Bracket>
            </div>
          </>
        ) : (
          <div className="mt-6 md:mt-10">
            {sprite && <Screen Game={Game} level={level} sprite={sprite} muted={muted} onBack={back} onNext={next} onCleared={onCleared} />}
          </div>
        )}
      </div>
    </main>
  );
}
