"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { scrollToSection } from "./scroll-to";

/**
 * Buttery smooth scrolling driven by Lenis. Its frame loop only runs while
 * something is moving: a wheel, a touch, a key or a glide wakes it, and it
 * sleeps again once the page is still, so an idle page costs nothing.
 *
 * Touch screens keep the browser's own momentum scrolling (smoother than
 * anything script can do on a phone). The page stops where the visitor
 * stops it: no easing onto sections afterwards, which reads as lag.
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
      // Tight enough to follow the wheel closely, loose enough to be smooth.
      lerp: 0.14,
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

    return () => {
      cancelAnimationFrame(raf);
      WAKE.forEach((t) => window.removeEventListener(t, wake));
      if (window.__lenis === lenis) delete window.__lenis;
      lenis.destroy();
    };
  }, []);

  return null;
}
