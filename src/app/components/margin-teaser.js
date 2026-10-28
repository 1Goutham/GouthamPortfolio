"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "./layout/transition-link";
import { WallStrip } from "../margin/wall";

// The stickers on the band. Positions live in globals.css (`.mt-<id>`), in
// container-width units, so the collage keeps its exact composition at any
// width. `depth` is how far each one drifts toward the pointer.
const STICKERS = [
  { id: "cow", src: "/cow.png", w: 426, h: 380, alt: "A cow, mid-leap", depth: 0.9 },
  { id: "pink", src: "/pinkmettaliclogo.png", w: 634, h: 616, alt: "Pink metallic G monogram", depth: 1.3 },
  { id: "margin", src: "/margin1gartlab.png", w: 676, h: 365, alt: "A pink MARGIN eraser on a yellow 1Gartlab starburst", depth: 0.6 },
  { id: "kid", src: "/kidwithspoon.png", w: 644, h: 627, alt: "A kid with a blue spoon on his nose", depth: 1.1 },
  { id: "arcade", src: "/ArcadePic.png", w: 1292, h: 1320, alt: "A green retro handheld console", depth: 1.5 },
  { id: "chair", src: "/chair.png", w: 561, h: 313, alt: "Two plastic chairs and some bottles, sketched", depth: 0.7 },
  { id: "eyes", src: "/eyes.png", w: 657, h: 329, alt: "A torn strip of paper showing a pair of eyes", depth: 0.8 },
];

const TRAIL_MS = 650;

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A sticker you can peel off the band and fling. It follows the pointer
 * while held and springs home on release, tipping with the throw. A press
 * that barely moves is left alone, so it still reads as a click on the link.
 */
function Sticker({ s, index, dragged }) {
  const ref = useRef(null);
  const st = useRef({ x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, raf: 0, down: null, last: 0 });

  const settle = useCallback(() => {
    const p = st.current;
    const el = ref.current;
    if (!el) return;
    const now = performance.now();
    const dt = Math.min((now - p.last) / 1000 || 0, 0.032);
    p.last = now;
    // Damped spring back to the rest pose.
    const k = 170;
    const c = 15;
    p.vx += (-k * p.x - c * p.vx) * dt;
    p.vy += (-k * p.y - c * p.vy) * dt;
    p.vr += (-k * p.r - c * p.vr) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += p.vr * dt;
    const done = Math.abs(p.x) + Math.abs(p.y) < 0.2 && Math.abs(p.vx) + Math.abs(p.vy) < 2 && Math.abs(p.r) < 0.05;
    if (done) {
      p.x = p.y = p.r = p.vx = p.vy = p.vr = 0;
      p.raf = 0;
      el.style.transform = "";
      el.removeAttribute("data-held");
      return;
    }
    el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) rotate(${p.r.toFixed(2)}deg)`;
    p.raf = requestAnimationFrame(settle);
  }, []);

  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);

  const onPointerDown = (e) => {
    if (e.button !== 0 || reduceMotion()) return;
    const p = st.current;
    cancelAnimationFrame(p.raf);
    p.raf = 0;
    p.down = { id: e.pointerId, sx: e.clientX - p.x, sy: e.clientY - p.y, ox: e.clientX, oy: e.clientY, lx: e.clientX, lt: performance.now(), moved: false };
  };

  const onPointerMove = (e) => {
    const p = st.current;
    const d = p.down;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.ox, e.clientY - d.oy) < 5) return;
      d.moved = true;
      dragged.current = true;
      ref.current?.setPointerCapture(e.pointerId);
      ref.current?.setAttribute("data-held", "");
    }
    const now = performance.now();
    const dt = Math.max(now - d.lt, 1) / 1000;
    p.vx = (e.clientX - d.lx) / dt;
    d.lx = e.clientX;
    d.lt = now;
    p.x = e.clientX - d.sx;
    p.y = e.clientY - d.sy;
    // Lean into the direction of travel, like paper held by one corner.
    p.r = Math.max(-14, Math.min(14, p.vx * 0.012));
    ref.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.r.toFixed(2)}deg)`;
  };

  const onPointerUp = (e) => {
    const p = st.current;
    const d = p.down;
    if (!d || d.id !== e.pointerId) return;
    p.down = null;
    if (!d.moved) return;
    p.vy = 0;
    p.vr = Math.max(-400, Math.min(400, p.vx * 0.08));
    p.last = performance.now();
    p.raf = requestAnimationFrame(settle);
  };

  return (
    <span className={`mt-item mt-${s.id}`} style={{ "--d": s.depth, "--i": index }}>
      <span className="mt-drift">
        <span
          ref={ref}
          className="mt-sticker"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <Image
            src={s.src}
            width={s.w}
            height={s.h}
            alt={s.alt}
            sizes="(max-width: 767px) 50vw, 20vw"
            draggable={false}
            className="mt-img"
          />
        </span>
      </span>
    </span>
  );
}

/**
 * The homepage teaser for /margin: a white band of stickers. The pointer
 * leaves a short ink line behind it (a taste of the drawing page) that
 * turns into a negative of whatever sticker it crosses, the
 * stickers drift toward it at different depths, and any of them can be
 * peeled off and thrown. Anything else on the band is a link to /margin.
 */
export default function MarginTeaser() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragged = useRef(false);
  const trail = useRef({ pts: [], raf: 0 });
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Keep the ink canvas at device resolution.
  useEffect(() => {
    const stage = stageRef.current;
    const cv = canvasRef.current;
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
    return () => ro.disconnect();
  }, []);

  // Ink trail: each point fades and thins with age, then the loop sleeps.
  const draw = useCallback(() => {
    const t = trail.current;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const now = performance.now();
    t.pts = t.pts.filter((p) => now - p.t < TRAIL_MS);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < t.pts.length; i++) {
      const a = t.pts[i - 1];
      const b = t.pts[i];
      if (b.t - a.t > 80) continue;
      const life = 1 - (now - b.t) / TRAIL_MS;
      // White here; the canvas's difference blend turns it to ink on paper.
      ctx.strokeStyle = `rgba(255, 255, 255, ${(life * 0.95).toFixed(3)})`;
      ctx.lineWidth = 0.6 + life * 2.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    t.raf = t.pts.length ? requestAnimationFrame(draw) : 0;
  }, []);

  useEffect(() => () => cancelAnimationFrame(trail.current.raf), []);

  const onPointerMove = (e) => {
    const stage = stageRef.current;
    if (!stage || e.pointerType !== "mouse" || reduceMotion()) return;
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    stage.style.setProperty("--px", ((x / r.width - 0.5) * 2).toFixed(3));
    stage.style.setProperty("--py", ((y / r.height - 0.5) * 2).toFixed(3));
    const t = trail.current;
    t.pts.push({ x, y, t: performance.now() });
    if (!t.raf) t.raf = requestAnimationFrame(draw);
  };

  const onPointerLeave = () => {
    const stage = stageRef.current;
    stage?.style.setProperty("--px", "0");
    stage?.style.setProperty("--py", "0");
  };

  // A throw is not a click.
  const onClick = (e) => {
    if (dragged.current) {
      e.preventDefault();
      dragged.current = false;
    }
  };

  return (
    <section id="margin" className="margin-teaser bg-white text-black" data-inview={inView}>
      <TransitionLink
        href="/margin"
        onClick={onClick}
        draggable={false}
        aria-label="Margin, an experimental playground by 1Gartlab. Draw something and send it to me"
        className="block outline-none"
      >
        <div ref={stageRef} className="mt-stage" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <canvas ref={canvasRef} className="mt-ink" aria-hidden="true" />

          <span className="mt-item mt-logo" style={{ "--i": 0 }}>
            <Image src="/1gartlablogo.png" width={300} height={100} alt="1Gartlab" sizes="160px" draggable={false} className="mt-img" />
          </span>
          <span className="mt-label font-outfit">01 / EXPERIMENTAL PLAYGROUND</span>

          {STICKERS.map((s, i) => (
            <Sticker key={s.id} s={s} index={i + 1} dragged={dragged} />
          ))}

          <span className="mt-item mt-pill" style={{ "--d": 1, "--i": 3 }}>
            <span className="mt-drift">
              <span className="mt-pill-inner font-outfit">
                <span className="mt-pill-fill" aria-hidden="true" />
                <span className="mt-pill-text">click here</span>
                <svg className="mt-pill-arrow" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </span>
          </span>

          <span className="mt-item mt-quote" style={{ "--d": 0.4, "--i": 8 }}>
            <span className="mt-drift">
              <span className="mt-quote-text font-serif-display">
                <span>&lsquo;til death,</span>
                <span>we do art.</span>
              </span>
            </span>
          </span>
        </div>
      </TransitionLink>
      <WallStrip />
    </section>
  );
}
