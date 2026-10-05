"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "../components/layout/transition-link";
import BracketHeading from "../components/layout/bracket-heading";
import { GAMES, W, H } from "./games";
import Console from "./console";
import Asterisk from "../components/layout/asterisk";

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
function Screen({ Game, level, sprite, muted, onCleared, inputRef, hud, onState }) {
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
      keys.add(e.key);
      pressed.add(e.key);
    };
    const onKeyUp = (e) => keys.delete(e.key);
    // The drawn D-pad and A button feed the same sets.
    inputRef.current = {
      press: (k) => {
        keys.add(k);
        pressed.add(k);
      },
      release: (k) => keys.delete(k),
    };
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
      // Light the drawn controls while anything is held.
      const dpadOn = keys.has("ArrowUp") || keys.has("ArrowDown") || keys.has("ArrowLeft") || keys.has("ArrowRight");
      const aOn = keys.has(" ") || pointer.down;
      if (hud.dpad.current) hud.dpad.current.dataset.on = dpadOn;
      if (hud.a.current) hud.a.current.dataset.on = aOn;

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
  }, [Game, level, onCleared, inputRef, hud]);

  // Tell the page about the score and phase, so the panel beside the console can show them.
  useEffect(() => {
    onState({ phase, score, best });
  }, [phase, score, best, onState]);

  return <canvas ref={canvasRef} width={W} height={H} className="block h-full w-full" aria-label={`${Game.title} game`} />;
}

export default function Arcade() {
  const [sprite, setSprite] = useState(null);
  const [level, setLevel] = useState(null);
  const [unlocked, setUnlocked] = useState(0);
  const [play, setPlay] = useState({ phase: "ready", score: 0, best: 0 });
  const onState = useCallback((st) => setPlay(st), []);
  const inputRef = useRef({ press() {}, release() {} });
  const hud = useRef({ dpad: { current: null }, a: { current: null } }).current;
  const press = useCallback((k) => inputRef.current.press(k), []);
  const release = useCallback((k) => inputRef.current.release(k), []);
  const [restartKey, setRestartKey] = useState(0);
  // On phones the console's screen is too small to play on, so the game
  // renders flat above the panel and the console stays as the illustration.
  const [flat, setFlat] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setFlat(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
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
  // Escape leaves a level.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setLevel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
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

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-6 md:px-12 md:pb-32 md:pt-10">
        {/* Title row, in the same shape as the Beyond and Projects pages. */}
        <header className="arcade-rise flex items-center justify-center gap-4 md:gap-5" style={{ "--i": 1 }}>
          <BracketHeading as="h1" className="font-anonymous-pro text-xl md:text-3xl">Arcade</BracketHeading>
          <Asterisk className="text-2xl leading-none md:text-3xl" />
          <p className="font-outfit">
            <span className="block text-sm font-bold leading-snug md:text-base">My fav retro games</span>
            <span className="block text-xs leading-snug text-white/65 md:text-sm">Just thought of having it here :)</span>
          </p>
        </header>

        <div className="mt-10 grid items-center gap-10 md:mt-14 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-24">
          {/* The console. The games play on its screen. */}
          <div className={`arcade-rise mx-auto w-full transition-[max-width] duration-500 md:max-w-none ${Game && flat ? "max-w-[220px]" : "max-w-[400px]"}`} style={{ "--i": 2 }}>
            <Console playing={Game !== null && !flat} hud={hud} onPress={press} onRelease={release}>
              {Game && sprite && !flat && (
                <Screen key={`${level}-${restartKey}`} Game={Game} level={level} sprite={sprite} muted={muted} onCleared={onCleared} inputRef={inputRef} hud={hud} onState={onState} />
              )}
            </Console>
          </div>

          {/* Beside it: the levels, or the level that is playing. */}
          <div className="min-w-0">
            {!Game ? (
              <>
                <ol className="grid gap-x-10 border-t border-white/10 sm:grid-cols-2">
                  {GAMES.map((G, i) => {
                    const locked = i > unlocked;
                    const done = (bests[G.id] || 0) >= G.goal;
                    return (
                      <li key={G.id} className="arcade-rise" style={{ "--i": 3 + i }}>
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => setLevel(i)}
                          className="arcade-row grid w-full grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-white/10 py-4 text-left outline-none"
                          data-locked={locked}
                        >
                          <span className="arcade-row-no font-anonymous-pro text-xs text-white/35">{String(i + 1).padStart(2, "0")}</span>
                          <span className="arcade-row-title font-anonymous-pro text-lg text-white md:text-xl">
                            <span className="arcade-row-l" aria-hidden="true">[</span> {G.title} <span className="arcade-row-r" aria-hidden="true">]</span>
                          </span>
                          <span className="flex items-center justify-end font-anonymous-pro text-sm text-white/40">
                            {done ? <Asterisk className="text-white" /> : bests[G.id] ? bests[G.id] : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div className="arcade-rise" style={{ "--i": 0 }}>
                {flat && sprite && (
                  <div className="arcade-flat relative mb-5 w-full overflow-hidden rounded-md border border-white/15 bg-black" style={{ aspectRatio: `${W} / ${H}` }}>
                    <Screen key={`${level}-${restartKey}`} Game={Game} level={level} sprite={sprite} muted={muted} onCleared={onCleared} inputRef={inputRef} hud={hud} onState={onState} />
                  </div>
                )}
                <div className="flex items-end justify-between gap-6 border-b border-white/10 pb-4 font-anonymous-pro">
                  <h2 className="text-2xl leading-none text-white md:text-3xl">
                    <span className="text-white/35">{String(level + 1).padStart(2, "0")}</span> [ {Game.title} ]
                  </h2>
                  <p className="text-2xl leading-none tabular-nums text-white md:text-3xl">
                    {play.score}
                    <span className="text-white/35"> / {Game.goal}</span>
                  </p>
                </div>
                <div className="mt-6 min-h-[120px]">
                  {play.phase === "over" ? (
                    <div className="arcade-over">
                      <p className="font-anonymous-pro text-6xl leading-none text-white md:text-7xl">
                        {play.score}
                        {play.score >= Game.goal && <Asterisk className="ml-2 align-[0.05em] text-[0.45em] text-white/70" />}
                      </p>
                      <div className="mt-6 flex items-center gap-7">
                        <Bracket onClick={() => setRestartKey((k) => k + 1)}>again</Bracket>
                        {play.score >= Game.goal && next && <Bracket onClick={next}>next</Bracket>}
                      </div>
                    </div>
                  ) : (
                    <p className="font-outfit text-sm text-white/50">{Game.task}</p>
                  )}
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                  <p className="font-anonymous-pro text-xs text-white/35">best {play.best}</p>
                  <Bracket onClick={back} className="!text-sm md:!text-base">back</Bracket>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
