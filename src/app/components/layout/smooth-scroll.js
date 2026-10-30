"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { scrollToSection } from "./scroll-to";

// A long, soft finish for every programmatic glide.
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

// Homepage sections the scroll can settle on. Thin strips (the marquee, the
// 1G-works label, the intro band) are left out: settling on them would feel like a snag.
const SECTIONS = "header.hero, #about, #skills, #projects, #beyond, #margin, #Gtalk, #contact";
const SETTLE_RANGE = 0.12; // of the viewport height
const SETTLE_IDLE_MS = 160;

/**
 * Buttery smooth scrolling driven by Lenis. Its frame loop only runs while
 * something is moving: a wheel, a touch, a key or a glide wakes it, and it
 * sleeps again once the page is still, so an idle page costs nothing.
 *
 * Touch screens keep the browser's own momentum scrolling (smoother than
 * anything script can do on a phone). With a wheel or trackpad, when the
 * page comes to rest just short of or just past the start of a section, it
 * eases the last few pixels so the section lines up; stopping anywhere else
 * is left alone.
 *
 * Every on-page link ("#about", "#" for the top) goes through
 * scrollToSection, and a page opened at a hash ("/#contact" from another
 * page) is lined up with it once the page has settled; neither leaves the
 * hash in the address bar.
 * Respects `prefers-reduced-motion` (no Lenis: native, instant scrolling).
 */
export default function SmoothScroll() {
  // On-page links. Only plain "#..." hrefs: "/#contact" from another page is
  // a navigation, and its link handles it.
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.("a[href^='#']");
      if (!a || a.target === "_blank") return;
      const href = a.getAttribute("href");
      if (href !== "#" && href !== "#top" && !document.getElementById(decodeURIComponent(href.slice(1)))) return;
      e.preventDefault();
      scrollToSection(href);
    };
    document.addEventListener("click", onClick);

    // Arrived with a hash: the page goes on settling after load (images, the
    // lazy sections, scroll-linked layout), so keep the section lined up for
    // a few seconds, unless you start scrolling yourself, then tidy the
    // address bar.
    let hold = 0;
    let stopHold = () => {};
    if (location.hash.length > 1) {
      const hash = location.hash;
      const until = performance.now() + 3500;
      const align = () => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) {
          const top = Math.min(el.getBoundingClientRect().top + window.scrollY, document.documentElement.scrollHeight - window.innerHeight);
          // Natively, so Lenis picks the position up rather than deciding
          // it is already there.
          if (Math.abs(top - window.scrollY) > 2) window.scrollTo({ top, behavior: "instant" });
        }
        if (performance.now() < until) hold = window.setTimeout(align, 200);
        else stopHold();
      };
      stopHold = () => {
        clearTimeout(hold);
        ["wheel", "touchstart", "keydown", "pointerdown"].forEach((t) => window.removeEventListener(t, stopHold));
        if (location.hash === hash) history.replaceState(history.state, "", location.pathname + location.search);
      };
      ["wheel", "touchstart", "keydown", "pointerdown"].forEach((t) => window.addEventListener(t, stopHold, { passive: true }));
      hold = window.setTimeout(align, 60);
    }
    return () => {
      document.removeEventListener("click", onClick);
      stopHold();
    };
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      smoothWheel: true,
    });

    let raf = 0;
    let still = 0;
    const loop = (t) => {
      lenis.raf(t);
      still = lenis.isScrolling ? 0 : still + 1;
      raf = still > 30 ? 0 : requestAnimationFrame(loop);
    };
    const wake = () => {
      still = 0;
      if (raf) return;
      // Asleep, its clock stopped: start it from now, or the first step of
      // a glide would be the whole nap long and finish it at once.
      lenis.time = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const WAKE = ["wheel", "touchstart", "keydown", "pointerdown", "scroll"];
    WAKE.forEach((t) => window.addEventListener(t, wake, { passive: true }));
    const scrollTo = lenis.scrollTo.bind(lenis);
    lenis.scrollTo = (...args) => {
      wake();
      return scrollTo(...args);
    };
    wake();

    // The site agent scrolls through it, so a programmatic scroll eases like a wheel one.
    window.__lenis = lenis;

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

    return () => {
      clearTimeout(idle);
      cancelAnimationFrame(raf);
      WAKE.forEach((t) => window.removeEventListener(t, wake));
      window.removeEventListener("wheel", onWheel);
      if (window.__lenis === lenis) delete window.__lenis;
      lenis.destroy();
    };
  }, []);

  return null;
}
