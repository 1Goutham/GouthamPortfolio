"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight } from "lucide-react";
import Asterisk from "./layout/asterisk";

/**
 * "[Got 20 seconds?]": a slim band on the homepage whose button opens the
 * intro film in a 1Goutham Media Player that really works, floating over
 * the page like a desktop window: drag it by its title bar, minimise it to
 * the taskbar, maximise it, close it.
 *
 * The window is the designed PNG (scripts/mediaplayer/build.py takes it
 * apart); everything that moves sits on top of it at the same place: the
 * seek and volume thumbs, the play/pause dome, the status line. Nothing of
 * the film loads until it is opened (preload="none").
 */

// Geometry, in the window image's own pixels (1697 x 1508).
const W = 1697;
const H = 1508;
const box = ([x0, y0, x1, y1]) => ({
  left: `${(x0 / W) * 100}%`,
  top: `${(y0 / H) * 100}%`,
  width: `${((x1 - x0) / W) * 100}%`,
  height: `${((y1 - y0) / H) * 100}%`,
});
const G = {
  screen: [41, 336, 1657, 1190],
  status: [41, 1196, 1657, 1264],
  nowPlaying: [42, 271, 1118, 329],
  play: [58, 1281, 224, 1475],
  stop: [226, 1339, 302, 1444],
  prev: [335, 1392, 438, 1451],
  next: [457, 1392, 558, 1451],
  mute: [635, 1392, 740, 1451],
  rewind: [290, 1304, 360, 1347],
  ffwd: [1550, 1304, 1625, 1347],
  seek: [374, 1279, 430, 1365], // the thumb, at 0:00
  seekTrack: [374, 1290, 1530, 1355],
  seekRange: [402, 1500], // thumb centre, start to end
  volWedge: [762, 1379, 920, 1471],
  volThumb: [902, 1379, 964, 1471],
  volTrack: [762, 1379, 964, 1471],
  volRange: [790, 933], // thumb centre, silent to full
  titleBar: [0, 0, 1290, 160], // where the window is dragged from
  min: [1302, 37, 1408, 144],
  max: [1425, 37, 1532, 144],
  close: [1548, 37, 1655, 144],
  tabs: [
    [1235, 269, 1335, 341],
    [1380, 269, 1470, 341],
    [1520, 269, 1595, 341],
  ],
  menus: [
    ["File", [55, 174, 148, 241]],
    ["View", [208, 174, 325, 241]],
    ["Play", [387, 174, 495, 241]],
    ["Tools", [558, 174, 690, 241]],
    ["Help", [752, 174, 865, 241]],
  ],
};
const pctX = (x) => `${(x / W) * 100}%`;

const SRC = "/intro/intro.mp4";
const FILE = "1GPortfolioIntro.mp4";

const fmt = (s) => {
  if (!Number.isFinite(s)) s = 0;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export default function IntroPlayer() {
  const sectionRef = useRef(null);
  const windowRef = useRef(null);
  const thumbRef = useRef(null);
  const clockRef = useRef(null);
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const openerRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [mounted, setMounted] = useState(false);
  // window: closed | opening | open | minimized | closing
  const [win, setWin] = useState("closed");
  // Where the window sits on screen (its top-left, in px), once moved.
  const [pos, setPos] = useState(null);
  const [from, setFrom] = useState(null); // where it opens out of
  const [status, setStatus] = useState("Ready");
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(20);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [menu, setMenu] = useState(null);
  const [about, setAbout] = useState(false);
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setInView(true), io.disconnect()),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The window lives on <body> (a fixed window inside an animated section
  // would be pinned to the section instead).
  useEffect(() => setMounted(true), []);

  // ---------------------------------------------------------- playback
  const v = () => videoRef.current;
  const play = useCallback(() => {
    const el = v();
    if (!el) return;
    if (el.ended) el.currentTime = 0;
    if (!started) {
      setStarted(true);
      setStatus("Connecting…");
    }
    el.play().catch(() => setStatus("Ready"));
  }, [started]);
  const pause = useCallback(() => v()?.pause(), []);
  const toggle = useCallback(
    () => (v() && !v().paused ? pause() : play()),
    [play, pause],
  );
  const stop = useCallback(() => {
    const el = v();
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setT(0);
    setStatus("Stopped");
  }, []);
  const seekTo = useCallback(
    (s) => {
      const el = v();
      if (!el) return;
      el.currentTime = Math.max(0, Math.min(dur, s));
      setT(el.currentTime);
    },
    [dur],
  );
  const nudge = (d) => seekTo((v()?.currentTime || 0) + d);
  const setVolume = useCallback((x) => {
    const el = v();
    const n = Math.max(0, Math.min(1, x));
    setVol(n);
    if (el) {
      el.volume = n;
      if (n > 0 && el.muted) {
        el.muted = false;
        setMuted(false);
      }
    }
  }, []);
  const toggleMute = useCallback(() => {
    const el = v();
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);
  const setSpeed = (r) => {
    setRate(r);
    if (v()) v().playbackRate = r;
  };

  const fullscreen = useCallback(() => {
    const el = v();
    const frame = windowRef.current;
    if (document.fullscreenElement) return document.exitFullscreen?.();
    // The whole window goes fullscreen, chrome and all: it is "maximised".
    if (frame?.requestFullscreen) frame.requestFullscreen().catch(() => {});
    else if (el?.webkitEnterFullscreen) {
      // iPhone: only the video itself can go fullscreen.
      if (el.paused) play();
      el.webkitEnterFullscreen();
    }
  }, [play]);

  // Video events drive the status line, as the real thing did.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let raf = 0;
    // While it plays, the playhead and the clock move straight in the DOM,
    // not through a re-render every frame.
    const tick = () => {
      const d = el.duration || 20;
      const x =
        G.seekRange[0] +
        (el.currentTime / d) * (G.seekRange[1] - G.seekRange[0]);
      if (thumbRef.current)
        thumbRef.current.style.left = pctX(x - (G.seek[2] - G.seek[0]) / 2);
      if (clockRef.current)
        clockRef.current.textContent = `${fmt(el.currentTime)} / ${fmt(d)}`;
      raf = el.paused ? 0 : requestAnimationFrame(tick);
    };
    const buffered = () => {
      const b = el.buffered;
      return b.length
        ? Math.round((b.end(b.length - 1) / (el.duration || 20)) * 100)
        : 0;
    };
    const on = {
      play: () => setPlaying(true),
      playing: () => {
        setStatus("Playing");
        if (!raf) raf = requestAnimationFrame(tick);
      },
      pause: () => {
        setPlaying(false);
        if (!el.ended && el.currentTime > 0) setStatus("Paused");
        cancelAnimationFrame(raf);
        raf = 0;
        setT(el.currentTime);
      },
      waiting: () => setStatus(`Buffering (${buffered()}%)`),
      progress: () =>
        setStatus((s) =>
          s.startsWith("Buffering") ? `Buffering (${buffered()}%)` : s,
        ),
      ended: () => {
        setPlaying(false);
        setStatus("Finished");
      },
      loadedmetadata: () => setDur(el.duration || 20),
      seeked: () => setT(el.currentTime),
      error: () => setStatus("Couldn't play the file"),
    };
    Object.entries(on).forEach(([k, f]) => el.addEventListener(k, f));
    return () => {
      cancelAnimationFrame(raf);
      Object.entries(on).forEach(([k, f]) => el.removeEventListener(k, f));
    };
  }, [mounted]); // the video mounts with the portal

  // Keyboard, while the player has focus.
  const onKeyDown = (e) => {
    if (win !== "open" || e.target.closest?.("[role=menu]")) return;
    const k = e.key.toLowerCase();
    const map = {
      " ": toggle,
      k: toggle,
      arrowleft: () => nudge(-5),
      arrowright: () => nudge(5),
      arrowup: () => setVolume(vol + 0.1),
      arrowdown: () => setVolume(vol - 0.1),
      m: toggleMute,
      f: fullscreen,
      s: stop,
      // Escape closes it and hands the focus back to whatever opened it.
      escape: () => {
        close();
        const to = backTo.current?.isConnected ? backTo.current : openerRef.current;
        to?.focus({ preventScroll: true });
      },
    };
    if (map[k]) {
      e.preventDefault();
      map[k]();
    }
  };

  // ---------------------------------------------------------- dragging
  const dragOn = (range, apply) => (e) => {
    if (e.button !== 0) return;
    const frame = frameRef.current;
    const at = (ev) => {
      const r = frame.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * W;
      return (x - range[0]) / (range[1] - range[0]);
    };
    // React clears currentTarget once this handler returns; keep the node.
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    apply(at(e), true);
    const move = (ev) => apply(at(ev), true);
    const up = (ev) => {
      apply(at(ev), false);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const [scrub, setScrub] = useState(null);
  const onSeekDown = dragOn(G.seekRange, (f, live) => {
    const s = Math.max(0, Math.min(1, f)) * dur;
    setScrub(live ? s : null);
    setT(s);
    if (!live) seekTo(s);
    else if (v()) v().currentTime = s;
  });
  const onVolDown = dragOn(G.volRange, (f) => setVolume(f));

  // ---------------------------------------------------------- the window
  // Its size on screen: as on the design, smaller on a small screen.
  const size = () => {
    const w = Math.min(
      560,
      window.innerWidth - 24,
      (window.innerHeight - 40) * (W / H),
    );
    return { w, h: (w * H) / W };
  };
  const place = (p) => {
    const { w, h } = size();
    // Keep the title bar on screen, so it can always be dragged back.
    return {
      x: Math.max(-w + 120, Math.min(window.innerWidth - 120, p.x)),
      y: Math.max(0, Math.min(window.innerHeight - h * 0.12, p.y)),
    };
  };
  const centred = () => {
    const { w, h } = size();
    return {
      x: (window.innerWidth - w) / 2,
      y: Math.max(16, (window.innerHeight - h) / 2),
    };
  };
  // Open out of the button, and start the film (in the same click, so the
  // browser lets it play with sound).
  // Where the focus was when the window opened, to give it back on Escape.
  const backTo = useRef(null);
  const open = () => {
    if (win === "open" || win === "opening") return windowRef.current?.focus();
    backTo.current = document.activeElement;
    const r = openerRef.current?.getBoundingClientRect();
    if (r) setFrom({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    setPos((p) => place(p || centred()));
    setWin("opening");
    play();
  };
  // Minimising or closing a maximised window first gives the screen back:
  // otherwise the browser stays fullscreen on an empty (black) element.
  const leaveFullscreen = () => {
    const el = v();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
    if (el?.webkitDisplayingFullscreen) el.webkitExitFullscreen?.();
  };
  const minimize = () => {
    leaveFullscreen();
    pause();
    setMenu(null);
    setWin("minimized");
  };
  const restore = () => {
    setFrom(null);
    setWin("opening");
  };
  const close = () => {
    leaveFullscreen();
    stop();
    setStatus("Ready");
    setStarted(false);
    setMenu(null);
    setAbout(false);
    setWin("closing");
  };
  useEffect(() => {
    if (win === "open") windowRef.current?.focus({ preventScroll: true });
  }, [win]);
  // The site agent's "Play the 20-second intro" (inside its click, so the
  // film may play with sound).
  const openRef = useRef(open);
  openRef.current =
    win === "minimized"
      ? () => {
          backTo.current = document.activeElement;
          restore();
          play();
        }
      : open;
  useEffect(() => {
    const on = () => openRef.current();
    window.addEventListener("intro:open", on);
    return () => window.removeEventListener("intro:open", on);
  }, []);
  // Keep it on screen when the window resizes.
  useEffect(() => {
    const fit = () => setPos((p) => (p ? place(p) : p));
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag by the title bar; double-click it to maximise, as Windows did.
  const onTitleDown = (e) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const start = { x: e.clientX, y: e.clientY, p: pos || centred() };
    el.setPointerCapture(e.pointerId);
    windowRef.current?.setAttribute("data-dragging", "");
    const move = (ev) =>
      setPos(
        place({
          x: start.p.x + ev.clientX - start.x,
          y: start.p.y + ev.clientY - start.y,
        }),
      );
    const up = () => {
      windowRef.current?.removeAttribute("data-dragging");
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  useEffect(() => {
    if (win === "closing") {
      const id = setTimeout(() => setWin("closed"), 260);
      return () => clearTimeout(id);
    }
    if (win === "opening") {
      const id = setTimeout(() => setWin("open"), 320);
      return () => clearTimeout(id);
    }
  }, [win]);

  // Menus close on any click elsewhere, or Escape.
  useEffect(() => {
    if (!menu) return;
    const off = (e) =>
      !e.target.closest?.(".mp-menu, .mp-menubtn") && setMenu(null);
    const esc = (e) => e.key === "Escape" && setMenu(null);
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const MENUS = {
    File: [
      { label: `Open ${FILE}`, keys: "Ctrl+O", act: play },
      { sep: true },
      { label: "Close", keys: "Ctrl+W", act: close },
    ],
    View: [
      { label: "Full Screen", keys: "F", act: fullscreen },
      { label: "Mini Player Mode", keys: "Ctrl+M", act: minimize },
    ],
    Play: [
      { label: playing ? "Pause" : "Play", keys: "Space", act: toggle },
      { label: "Stop", keys: "S", act: stop },
      { sep: true },
      { label: "Rewind", keys: "←", act: () => nudge(-5) },
      { label: "Fast Forward", keys: "→", act: () => nudge(5) },
      { sep: true },
      { label: "Volume Up", keys: "↑", act: () => setVolume(vol + 0.1) },
      { label: "Volume Down", keys: "↓", act: () => setVolume(vol - 0.1) },
      { label: "Mute", keys: "M", act: toggleMute, checked: muted },
    ],
    Tools: [
      {
        label: "Play Speed: Slow",
        act: () => setSpeed(0.75),
        checked: rate === 0.75,
      },
      {
        label: "Play Speed: Normal",
        act: () => setSpeed(1),
        checked: rate === 1,
      },
      {
        label: "Play Speed: Fast",
        act: () => setSpeed(1.5),
        checked: rate === 1.5,
      },
    ],
    Help: [{ label: "About 1Goutham Media Player", act: () => setAbout(true) }],
  };

  const shown = scrub ?? t;
  useLayoutEffect(() => {
    if (clockRef.current)
      clockRef.current.textContent = `${fmt(shown)} / ${fmt(dur)}`;
  }, [shown, dur]);
  const seekX =
    G.seekRange[0] + (shown / (dur || 20)) * (G.seekRange[1] - G.seekRange[0]);
  const level = muted ? 0 : vol;
  const volX = G.volRange[0] + level * (G.volRange[1] - G.volRange[0]);
  const [sx0, , sx1] = G.seek;
  const [vx0, vy0, vx1, vy1] = G.volThumb;
  const [wx0, , wx1] = G.volWedge;

  return (
    <section
      id="intro"
      ref={sectionRef}
      className="mp-section"
      data-inview={inView}
    >
      <div className="mp-band">
        <div className="mp-band-copy">
          <h2 className="mp-title bracket-link mp-rise" style={{ "--d": 0 }}>
            <span className="bracket-link-l" aria-hidden="true">
              [
            </span>
            <span className="bracket-link-text !mx-0">Got 20 seconds?</span>
            <span className="bracket-link-r" aria-hidden="true">
              ]
            </span>
          </h2>
          <p className="mp-lede mp-rise" style={{ "--d": 1 }}>
            AI, code, design, and a little bit of everything that makes me, me.
          </p>
        </div>
        <button
          ref={openerRef}
          type="button"
          className="mp-open mp-rise"
          style={{ "--d": 2 }}
          onClick={win === "minimized" ? restore : open}
          data-playing={playing && win !== "closed"}
          aria-haspopup="dialog"
        >
          <span className="mp-open-eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="mp-open-text">
            {win === "closed" || win === "closing"
              ? "Open 1Goutham Media Player"
              : playing
                ? "Now playing"
                : "Back to the player"}
          </span>
          <ArrowUpRight
            className="mp-open-arrow"
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Phones: the band as one line, gliding past like the 1G-works
          strip (two copies, each sliding one copy-width). Touch holds it;
          a tap anywhere opens the player. */}
      <button
        type="button"
        className="mp-strip"
        onClick={win === "minimized" ? restore : open}
        data-playing={playing && win !== "closed"}
        aria-label="Got 20 seconds? Open 1Goutham Media Player"
      >
        {[0, 1].map((copy) => (
          <span key={copy} className="mp-strip-row" aria-hidden="true">
            <span className="mp-strip-title">[Got 20 seconds?]</span>
            <Asterisk className="mp-strip-star" />
            <span className="mp-strip-lede">AI, code, design, and a little bit of everything that makes me, me.</span>
            <Asterisk className="mp-strip-star" />
            <span className="mp-strip-pill">
              <span className="mp-open-eq">
                <i />
                <i />
                <i />
              </span>
              {win === "closed" || win === "closing" ? "Open 1Goutham Media Player" : playing ? "Now playing" : "Back to the player"}
              <ArrowUpRight className="mp-strip-arrow" strokeWidth={2} />
            </span>
            <Asterisk className="mp-strip-star" />
          </span>
        ))}
      </button>

      {mounted &&
        createPortal(
          <>
            {/* The window. */}
            <div
              ref={windowRef}
              className="mp-window mp-float"
              style={{
                left: `${(pos || { x: 0 }).x}px`,
                top: `${(pos || { y: 0 }).y}px`,
                "--w": `${mounted ? size().w : 560}px`,
                // The open grows out of the button that opened it.
                "--from-x":
                  from && pos ? `${from.x - pos.x - size().w / 2}px` : "0px",
                "--from-y":
                  from && pos ? `${from.y - pos.y - size().h / 2}px` : "40px",
              }}
              aria-hidden={
                win === "closed" || win === "minimized" ? true : undefined
              }
              data-win={win}
              data-playing={playing}
              data-started={started}
              tabIndex={0}
              role="region"
              aria-label="1Goutham Media Player. Space plays and pauses, arrows seek and change volume, M mutes, F goes fullscreen, Escape closes it."
              onKeyDown={onKeyDown}
            >
              {/* The window keeps its proportions inside (in fullscreen too). */}
              <div ref={frameRef} className="mp-body">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async"
                  className="mp-skin"
                  src="/intro/player.webp"
                  alt=""
                  width={1188}
                  height={1056}
                  draggable={false}
                />

                {/* The title bar: drag the window by it. */}
                <div
                  className="mp-drag"
                  style={box(G.titleBar)}
                  onPointerDown={onTitleDown}
                  onDoubleClick={fullscreen}
                  aria-hidden="true"
                />

                <div
                  className="mp-screen"
                  style={box(G.screen)}
                  onMouseEnter={() => setPeek(true)}
                  onMouseLeave={() => setPeek(false)}
                >
                  <video
                    ref={videoRef}
                    src={SRC}
                    preload="none"
                    playsInline
                    onClick={toggle}
                    onDoubleClick={fullscreen}
                    aria-label="Goutham's 20-second intro"
                  />
                  {!started && (
                    <button
                      type="button"
                      className="mp-peek"
                      data-on={peek}
                      onClick={play}
                      aria-label="Play the 20-second intro"
                    >
                      <span
                        className="mp-peek-img"
                        style={
                          peek
                            ? { backgroundImage: "url(/intro/poster.jpg)" }
                            : undefined
                        }
                      />
                      <span className="mp-peek-cta">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
                        </svg>
                        Click to play
                      </span>
                    </button>
                  )}
                  {about && (
                    <div
                      className="mp-about"
                      role="dialog"
                      aria-label="About 1Goutham Media Player"
                    >
                      <div className="mp-about-bar">
                        About 1Goutham Media Player
                      </div>
                      <div className="mp-about-body">
                        <strong>1Goutham Media Player</strong>
                        <span>Version 20.0 (20 seconds long)</span>
                        <span>
                          © {new Date().getFullYear()} Goutham Gopinath.
                        </span>
                        <span>Made with AI, code and design.</span>
                        <button
                          type="button"
                          onClick={() => setAbout(false)}
                          autoFocus
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Now playing, in the silver bar. */}
                <div
                  className="mp-np"
                  style={box(G.nowPlaying)}
                  aria-hidden="true"
                >
                  <span data-on={started}>
                    {started ? `Now Playing: ${FILE}` : ""}
                  </span>
                </div>

                {/* Status line. */}
                <div
                  className="mp-status"
                  style={box(G.status)}
                  aria-live="polite"
                >
                  <span
                    className="mp-status-text"
                    style={{ left: `${((335 - 41) / (1657 - 41)) * 100}%` }}
                  >
                    {status}
                  </span>
                  {/* Written directly (also every frame while playing). */}
                  <span
                    ref={clockRef}
                    className="mp-status-time"
                    data-on={started}
                  />
                </div>

                {/* Seek. */}
                <div
                  className="mp-hit mp-seek"
                  style={box(G.seekTrack)}
                  onPointerDown={onSeekDown}
                  role="slider"
                  aria-label="Seek"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(dur)}
                  aria-valuenow={Math.round(shown)}
                  aria-valuetext={`${fmt(shown)} of ${fmt(dur)}`}
                  tabIndex={-1}
                >
                  {scrub !== null && (
                    <span
                      className="mp-tip"
                      style={{
                        left: `${((seekX - G.seekTrack[0]) / (G.seekTrack[2] - G.seekTrack[0])) * 100}%`,
                      }}
                    >
                      {fmt(scrub)}
                    </span>
                  )}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async"
                  ref={thumbRef}
                  className="mp-sprite mp-seek-thumb"
                  src="/intro/seek.webp"
                  alt=""
                  draggable={false}
                  style={{
                    ...box(G.seek),
                    left: pctX(seekX - (sx1 - sx0) / 2),
                  }}
                />

                {/* Volume: the wedge fills up to the thumb. */}
                <span
                  className="mp-sprite mp-wedge"
                  style={{
                    ...box(G.volWedge),
                    clipPath: `inset(0 ${Math.max(0, ((wx1 - volX) / (wx1 - wx0)) * 100)}% 0 0)`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/intro/vol-wedge.webp" alt="" draggable={false} />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async"
                  className="mp-sprite mp-vol-thumb"
                  src="/intro/vol-thumb.webp"
                  alt=""
                  draggable={false}
                  style={{
                    ...box([vx0, vy0, vx1, vy1]),
                    left: pctX(volX - (vx1 - vx0) / 2 + 3),
                  }}
                />
                <div
                  className="mp-hit mp-vol"
                  style={box(G.volTrack)}
                  onPointerDown={onVolDown}
                  role="slider"
                  aria-label="Volume"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(level * 100)}
                  tabIndex={-1}
                />

                {/* Buttons. */}
                <button
                  type="button"
                  className="mp-hit mp-btn mp-round"
                  style={box(G.play)}
                  onClick={toggle}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src="/intro/pause.webp" alt="" draggable={false} />
                  )}
                </button>
                <button
                  type="button"
                  className="mp-hit mp-btn mp-round"
                  style={box(G.stop)}
                  onClick={stop}
                  aria-label="Stop"
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-pill"
                  style={box(G.prev)}
                  onClick={() => seekTo(0)}
                  aria-label="Back to the start"
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-pill"
                  style={box(G.next)}
                  onClick={() => seekTo(dur - 0.05)}
                  aria-label="Skip to the end"
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-pill"
                  style={box(G.mute)}
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  aria-pressed={muted}
                  data-on={muted}
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-arrow"
                  style={box(G.rewind)}
                  onClick={() => nudge(-5)}
                  aria-label="Rewind 5 seconds"
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-arrow"
                  style={box(G.ffwd)}
                  onClick={() => nudge(5)}
                  aria-label="Forward 5 seconds"
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-tab"
                  style={box(G.tabs[0])}
                  onClick={toggle}
                  aria-label="Now Playing"
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-tab"
                  style={box(G.tabs[1])}
                  onClick={minimize}
                  aria-label="Mini player"
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-tab"
                  style={box(G.tabs[2])}
                  onClick={fullscreen}
                  aria-label="Full screen"
                />

                {/* Title bar. */}
                <button
                  type="button"
                  className="mp-hit mp-btn mp-cap"
                  style={box(G.min)}
                  onClick={minimize}
                  aria-label="Minimise"
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-cap"
                  style={box(G.max)}
                  onClick={fullscreen}
                  aria-label="Maximise (full screen)"
                />
                <button
                  type="button"
                  className="mp-hit mp-btn mp-cap mp-close"
                  style={box(G.close)}
                  onClick={close}
                  aria-label="Close"
                />

                {/* Menu bar. */}
                {G.menus.map(([name, b]) => (
                  <div key={name} className="mp-menuwrap" style={box(b)}>
                    <button
                      type="button"
                      className="mp-hit mp-menubtn"
                      aria-haspopup="menu"
                      aria-expanded={menu === name}
                      data-open={menu === name}
                      onClick={() => setMenu((m) => (m === name ? null : name))}
                      onMouseEnter={() => menu && setMenu(name)}
                    >
                      <span className="sr-only">{name}</span>
                    </button>
                    {menu === name && (
                      <ul className="mp-menu" role="menu">
                        {MENUS[name].map((it, i) =>
                          it.sep ? (
                            <li key={i} className="mp-sep" role="separator" />
                          ) : (
                            <li key={i} role="none">
                              <button
                                type="button"
                                role="menuitem"
                                autoFocus={i === 0}
                                onClick={() => {
                                  setMenu(null);
                                  it.act();
                                }}
                              >
                                <span className="mp-check">
                                  {it.checked ? "✓" : ""}
                                </span>
                                <span className="mp-mlabel">{it.label}</span>
                                {it.keys && (
                                  <span className="mp-keys">{it.keys}</span>
                                )}
                              </button>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Minimised: down on the taskbar. */}
            {win === "minimized" && (
              <button
                type="button"
                className="mp-task"
                onClick={restore}
                aria-label="Restore 1Goutham Media Player"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/intro/icon.webp" alt="" />
                <span>1Goutham Media Player</span>
              </button>
            )}
          </>,
          document.body,
        )}
    </section>
  );
}
