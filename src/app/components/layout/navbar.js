"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TransitionLink from "./transition-link";

/**
 * Minimal pill navigation.
 *
 *  - A soft highlight glides to whichever item is under the cursor and fades
 *    out when the cursor leaves, staying where it was.
 *  - A thin underline slides between items to mark the active section, and
 *    follows you down the page.
 *  - Labels do a subtle "roll": the text slides up and a copy slides in.
 *
 * `items` is [{ label, href }] where href is "#" (top), "#section-id", or a
 * page ("/works"), which gets the site's fade-through page transition.
 */
export default function MinimalNav({ items, initialActiveIndex = 0, className = "" }) {
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const [active, setActive] = useState(initialActiveIndex);
  const [hover, setHover] = useState(null);
  const [rects, setRects] = useState([]);
  const gliding = useRef(false);

  // Measure each item so the highlight/underline can be positioned absolutely.
  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const base = list.getBoundingClientRect();
    setRects(
      itemRefs.current.map((el) => {
        if (!el) return { left: 0, width: 0 };
        const r = el.getBoundingClientRect();
        return { left: r.left - base.left, width: r.width };
      })
    );
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  // Scroll-spy: the underline sits on the last section whose top has passed
  // 40% of the way down the screen (so sections between nav items, like the
  // works strip after Projects, keep the one before them). While a glide is
  // on its way it holds the destination instead of ticking through every
  // section it passes.
  useEffect(() => {
    const targets = items
      .map((item, i) => {
        const id = item.href.startsWith("#") ? item.href.slice(1) : "";
        const el = id ? document.getElementById(id) : null;
        return el ? { el, i } : null;
      })
      .filter(Boolean);
    const homeIndex = items.findIndex((it) => it.href === "#");
    if (!targets.length && homeIndex < 0) return;

    let raf = 0;
    const pick = () => {
      raf = 0;
      if (gliding.current) return;
      const line = window.innerHeight * 0.4;
      let best = homeIndex >= 0 ? homeIndex : null;
      for (const t of targets) if (t.el.getBoundingClientRect().top <= line) best = t.i;
      if (window.scrollY < 80 && homeIndex >= 0) best = homeIndex;
      if (best !== null) setActive(best);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    const onGlide = (e) => {
      gliding.current = e.detail.state === "start";
      if (!gliding.current) onScroll();
    };
    // Scrolling yourself mid-glide cancels it (and it never reports an end).
    const takeOver = () => {
      if (gliding.current) {
        gliding.current = false;
        onScroll();
      }
    };
    pick();
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchstart", takeOver, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("glide", onGlide);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("glide", onGlide);
    };
  }, [items]);

  // The click itself is handled site-wide (SmoothScroll); here the underline
  // just goes straight to where you're headed.
  const onClick = (i) => setActive(i);

  const target = hover ?? active;
  const hoverRect = rects[target] || { left: 0, width: 0 };
  const activeRect = rects[active] || { left: 0, width: 0 };
  const underlineInset = 16; // px of the item's horizontal padding

  return (
    <nav
      aria-label="Primary"
      className={`mnav relative rounded-full border border-white/10 bg-black/70 p-1.5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8)] backdrop-blur-md ${className}`}
      onMouseLeave={() => setHover(null)}
    >
      <ul ref={listRef} className="relative m-0 flex list-none p-0">
        {/* hover highlight */}
        <span
          aria-hidden="true"
          className="mnav-glow pointer-events-none absolute top-0 bottom-0 rounded-full bg-white/10"
          style={{
            left: hoverRect.left,
            width: hoverRect.width,
            opacity: hover === null ? 0 : 1,
          }}
        />
        {/* active underline */}
        <span
          aria-hidden="true"
          className="mnav-line pointer-events-none absolute bottom-[5px] h-px rounded-full bg-white"
          style={{
            left: activeRect.left + underlineInset,
            width: Math.max(activeRect.width - underlineInset * 2, 0),
          }}
        />

        {items.map((item, i) => {
          const Item = item.href.startsWith("/") ? TransitionLink : "a";
          return (
            <li key={item.label} className="relative z-10">
              <Item
                ref={(el) => (itemRefs.current[i] = el)}
                href={item.href}
                onClick={() => !item.href.startsWith("/") && onClick(i)}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-current={active === i ? "location" : undefined}
                className={`mnav-link block px-4 py-1.5 text-sm font-outfit tracking-wide transition-colors duration-300 outline-none ${
                  active === i ? "text-white" : "text-white/55 hover:text-white focus-visible:text-white"
                }`}
              >
                <span className="mnav-roll block h-[1.4em] overflow-hidden leading-[1.4]">
                  <span className="mnav-roll-inner block">
                    <span className="block">{item.label}</span>
                    <span className="block" aria-hidden="true">
                      {item.label}
                    </span>
                  </span>
                </span>
              </Item>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
