"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

const TA = "வணக்கம்!";
const EN = "Vanakamm!";

const segmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("ta", { granularity: "grapheme" }) : null;
const graphemes = (s) => (segmenter ? Array.from(segmenter.segment(s), (g) => g.segment) : Array.from(s));

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * "[ Vanakamm! ]" over the portrait, as live text.
 *
 * It arrives in Tamil: the brackets open from a sliver and வணக்கம்! rises
 * glyph by glyph out of depth, coming into focus with a brief glow. A beat
 * later the Tamil falls back into depth as "Vanakamm!" flips up letter by
 * letter and the brackets spring to the new width. Hovering turns it back
 * to Tamil while the letters lift toward the cursor in a wave; leaving
 * turns it back. It floats just in front of the face: the portrait moves
 * it with the head (`ref.current.setHead`), and its shadow on the hair
 * shifts by less, so it reads as a sign hung in front of him.
 *
 * `onSettle(rect)` fires when the English lands, so the portrait can glance
 * up at it.
 */
const Vanakkam = forwardRef(function Vanakkam({ start, onSettle }, ref) {
  const rootRef = useRef(null);
  const taRef = useRef(null);
  const enRef = useRef(null);
  const [phase, setPhase] = useState("hidden"); // hidden | ta | en
  const [hover, setHover] = useState(false);
  const [widths, setWidths] = useState({ ta: 0, en: 0 });
  const settled = useRef(false);
  const raf = useRef(0);

  useImperativeHandle(ref, () => ({
    setHead(dx, dy) {
      const el = rootRef.current;
      if (!el) return;
      el.style.setProperty("--hx", `${dx.toFixed(2)}px`);
      el.style.setProperty("--hy", `${dy.toFixed(2)}px`);
    },
  }));

  // Each word's width, so the brackets can travel between them.
  const measure = useCallback(() => {
    const ta = taRef.current?.scrollWidth || 0;
    const en = enRef.current?.scrollWidth || 0;
    setWidths((w) => (w.ta === ta && w.en === en ? w : { ta, en }));
  }, []);

  useEffect(() => {
    measure();
    document.fonts?.ready.then(measure);
    // The words change size as their fonts arrive (the Tamil face is only
    // fetched once it is first used), so watch them, not just the box.
    const ro = new ResizeObserver(measure);
    [rootRef.current, taRef.current, enRef.current].forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [measure]);

  // Arrive in Tamil, then turn into English.
  useEffect(() => {
    if (!start) return;
    if (reduceMotion()) {
      setPhase("en");
      return;
    }
    const a = setTimeout(() => setPhase("ta"), 120);
    const b = setTimeout(() => setPhase("en"), 120 + 1700);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [start]);

  // When the English has landed, let the portrait look at it (once).
  useEffect(() => {
    if (phase !== "en" || settled.current) return;
    const t = setTimeout(() => {
      settled.current = true;
      const r = enRef.current?.getBoundingClientRect();
      if (r) onSettle?.(r);
    }, 650);
    return () => clearTimeout(t);
  }, [phase, onSettle]);

  const lang = phase === "hidden" ? "hidden" : hover && phase === "en" ? "ta" : phase;
  // A word only plays its exit once it has actually been on screen.
  const everEn = useRef(false);
  if (lang === "en") everEn.current = true;
  const was = { ta: phase !== "hidden", en: everEn.current };

  // The wave: letters near the cursor lift, by a gaussian of the distance.
  const onMove = (e) => {
    if (e.pointerType !== "mouse" || reduceMotion()) return;
    const x = e.clientX;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      rootRef.current?.querySelectorAll(".vk-g").forEach((g) => {
        const r = g.getBoundingClientRect();
        const d = (r.left + r.width / 2 - x) / 60;
        g.style.setProperty("--lift", (Math.exp(-d * d) * -0.16).toFixed(3));
      });
    });
  };
  const onLeave = () => {
    setHover(false);
    rootRef.current?.querySelectorAll(".vk-g").forEach((g) => g.style.removeProperty("--lift"));
  };

  const word = (text, which, refEl, langAttr) => (
    <span
      ref={refEl}
      className={`vk-word vk-${which}`}
      data-show={lang === which}
      data-was={was[which]}
      lang={langAttr}
      aria-hidden="true"
    >
      {graphemes(text).map((g, i) => (
        <span key={i} className="vk-g" style={{ "--i": i }}>
          {g}
        </span>
      ))}
    </span>
  );

  // Closed, the brackets sit together; they spring apart to fit the word.
  const w = lang === "hidden" ? 0 : lang === "ta" ? widths.ta : widths.en;

  return (
    <span
      ref={rootRef}
      className="vk font-anonymous-pro"
      data-phase={phase}
      data-lang={lang}
      aria-label="Vanakamm! (வணக்கம், hello)"
      role="img"
      onPointerEnter={(e) => e.pointerType === "mouse" && phase === "en" && setHover(true)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={() => setHover((h) => !h)}
    >
      <span className="vk-float">
        <span className="vk-br vk-br-l" aria-hidden="true">[</span>
        <span className="vk-stack" style={widths.en ? { width: `${w}px` } : undefined}>
          {word(TA, "ta", taRef, "ta")}
          {word(EN, "en", enRef, "en")}
        </span>
        <span className="vk-br vk-br-r" aria-hidden="true">]</span>
      </span>
    </span>
  );
});

export default Vanakkam;
