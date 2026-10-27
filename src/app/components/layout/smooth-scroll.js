"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// A long, soft finish for every programmatic glide.
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

// Homepage sections the scroll can settle on. Thin strips (the marquee, the
// 1G-works label) are left out: settling on them would feel like a snag.
const SECTIONS = "header.hero, #about, #skills, #projects, #beyond, #margin, #Gtalk, #contact";
const SETTLE_RANGE = 0.12; // of the viewport height
const SETTLE_IDLE_MS = 160;

/**
 * Buttery smooth scrolling driven by Lenis, kept in lock-step with GSAP's
 * ScrollTrigger so every scroll-linked animation stays perfectly in sync.
 *
 * Touch screens keep the browser's own momentum scrolling (smoother than
 * anything script can do on a phone). With a wheel or trackpad, when the
 * page comes to rest just short of or just past the start of a section, it
 * eases the last few pixels so the section lines up; stopping anywhere else
 * is left alone. Anchor links glide with the same soft finish.
 * Respects `prefers-reduced-motion` (Lenis falls back to native scrolling).
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      smoothWheel: true,
      anchors: { offset: 0, duration: 1.3, easing: easeOutExpo },
    });

    // The site agent scrolls through it, so a programmatic scroll eases like a wheel one.
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // ---- settle onto a section ------------------------------------
    const fine = window.matchMedia("(pointer: fine)").matches;
    let idle = 0;
    let settling = false;
    let lastWheel = 0;
    const onWheel = () => {
      lastWheel = performance.now();
      // The visitor takes over from a settle in progress.
      settling = false;
    };
    const settle = () => {
      if (settling || !fine) return;
      // Only after the visitor's own scrolling, not a glide we started.
      if (performance.now() - lastWheel > 1500) return;
      const y = lenis.scroll;
      const range = window.innerHeight * SETTLE_RANGE;
      let best = null;
      document.querySelectorAll(SECTIONS).forEach((el) => {
        const top = el.getBoundingClientRect().top + y;
        const d = top - y;
        if (Math.abs(d) > 2 && Math.abs(d) < range && (best === null || Math.abs(d) < Math.abs(best - y))) best = top;
      });
      if (best === null) return;
      settling = true;
      lenis.scrollTo(best, {
        duration: 0.75,
        easing: easeOutExpo,
        onComplete: () => {
          settling = false;
        },
      });
    };
    const onScroll = () => {
      clearTimeout(idle);
      if (!settling) idle = setTimeout(settle, SETTLE_IDLE_MS);
    };
    if (fine) {
      window.addEventListener("wheel", onWheel, { passive: true });
      lenis.on("scroll", onScroll);
    }

    // Recalculate scroll positions once fonts/images settle.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh, { once: true });

    return () => {
      clearTimeout(idle);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(tick);
      if (window.__lenis === lenis) delete window.__lenis;
      lenis.destroy();
    };
  }, []);

  return null;
}
