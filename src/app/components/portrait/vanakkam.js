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
 * The brackets are an aperture. They start closed together, then glide
 * apart; the space between them is a window, so வணக்கம்! is revealed from
 * the centre out as its letters rise into place from below a hidden
 * baseline. A beat later the Tamil rolls up out of the window as
 * "Vanakamm!" rolls up into it, letter by letter from the middle, and the
 * brackets glide to the new width. Hovering rolls it back to Tamil and
 * eases the brackets outward, as every bracket link on the site does.
 * It floats just in front of the face: the portrait moves
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
    // The Tamil face is only fetched once Tamil text needs it, so make sure
    // it is here before the word animates: otherwise the letters start in
    // a fallback font and change shape (and width) mid-way.
    let a = 0;
    let b = 0;
    let alive = true;
    const go = () => {
      if (!alive) return;
      measure();
      a = setTimeout(() => setPhase("ta"), 60);
      b = setTimeout(() => setPhase("en"), 60 + 2600);
    };
    const fam = taRef.current ? getComputedStyle(taRef.current).fontFamily : "";
    const loads = document.fonts?.load
      ? Promise.all([document.fonts.load(`1em ${fam}`, TA), enRef.current ? document.fonts.load(`1em ${getComputedStyle(enRef.current).fontFamily}`, EN) : null])
      : Promise.resolve();
    // Never hold the greeting back for long on a slow network.
    Promise.race([loads, new Promise((r) => setTimeout(r, 1200))]).then(go, go);
    return () => {
      alive = false;
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [start, measure]);

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

  // Once a word has rolled out of the top, park it back below the window
  // (no transition) so its next entrance rises from below again.
  const [parked, setParked] = useState({ ta: false, en: false });
  useEffect(() => {
    setParked({ ta: false, en: false });
    const hidden = lang === "ta" ? "en" : lang === "en" ? "ta" : null;
    if (!hidden) return;
    const t = setTimeout(() => setParked((p) => ({ ...p, [hidden]: true })), 1000);
    return () => clearTimeout(t);
  }, [lang]);


  // Letters move from the middle of the word outward (--c is the distance
  // from the centre), so they open with the brackets.
  const word = (text, which, refEl, langAttr) => {
    const gs = graphemes(text);
    const mid = (gs.length - 1) / 2;
    return (
      <span
        ref={refEl}
        className={`vk-word vk-${which}${parked[which] && lang !== which ? " vk-reset" : ""}`}
        data-show={lang === which}
        data-was={was[which]}
        lang={langAttr}
        aria-hidden="true"
      >
        {gs.map((g, i) => (
          <span key={i} className="vk-g" style={{ "--c": Math.abs(i - mid).toFixed(1) }}>
            {g}
          </span>
        ))}
      </span>
    );
  };

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
      data-hover={hover}
      onPointerEnter={(e) => e.pointerType === "mouse" && phase === "en" && setHover(true)}
      onPointerLeave={() => setHover(false)}
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
