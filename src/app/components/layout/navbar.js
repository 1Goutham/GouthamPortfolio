"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal pill navigation.
 *
 *  - A soft highlight glides to whichever item is under the cursor and fades
 *    out when the cursor leaves, staying where it was.
 *  - A thin underline slides between items to mark the active section, and
 *    follows you down the page via IntersectionObserver.
 *  - Labels do a subtle "roll": the text slides up and a copy slides in.
 *
 * `items` is [{ label, href }] where href is "#" (top) or "#section-id".
 * `tone` is "dark" (black pill, for the black pages) or "light" (pale pill,
 * for the white Beyond page). `LinkComponent` lets a page swap the plain
 * anchor for something like TransitionLink when the items leave the page.
 */
const TONES = {
  dark: {
    nav: "border-white/10 bg-black/70 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8)]",
    glow: "bg-white/10",
    line: "bg-white",
    active: "text-white",
    idle: "text-white/55 hover:text-white focus-visible:text-white",
  },
  light: {
    nav: "border-black/[0.08] bg-[#f3f3f3]/85 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.35)]",
    glow: "bg-black/[0.06]",
    line: "bg-black",
    active: "text-black",
    idle: "text-black/50 hover:text-black focus-visible:text-black",
  },
};

export default function MinimalNav({
  items,
  initialActiveIndex = 0,
  className = "",
  tone = "dark",
  LinkComponent = "a",
}) {
  const t = TONES[tone] || TONES.dark;
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const [active, setActive] = useState(initialActiveIndex);
  const [hover, setHover] = useState(null);
  const [rects, setRects] = useState([]);
  const lockUntil = useRef(0);

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

  // Scroll-spy: the underline follows the section currently in view.
  useEffect(() => {
    const targets = items
      .map((item, i) => {
        const id = item.href.startsWith("#") ? item.href.slice(1) : "";
        const el = id ? document.getElementById(id) : null;
        return el ? { el, i } : null;
      })
      .filter(Boolean);

    const homeIndex = items.findIndex((it) => it.href === "#");
    const visible = new Map();

    const pick = () => {
      if (performance.now() < lockUntil.current) return;
      if (window.scrollY < 80 && homeIndex >= 0) {
        setActive(homeIndex);
        return;
      }
      let best = null;
      for (const [i, ratio] of visible) {
        if (ratio > 0 && (best === null || ratio > visible.get(best))) best = i;
      }
      if (best !== null) setActive(best);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = targets.find((t) => t.el === e.target)?.i;
          if (i !== undefined) visible.set(i, e.isIntersecting ? e.intersectionRatio : 0);
        }
        pick();
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    targets.forEach((t) => io.observe(t.el));
    window.addEventListener("scroll", pick, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", pick);
    };
  }, [items]);

  const onClick = (i) => {
    setActive(i);
    // Hold the choice while the page smooth-scrolls so the spy doesn't fight it.
    lockUntil.current = performance.now() + 1200;
  };

  const target = hover ?? active;
  const hoverRect = rects[target] || { left: 0, width: 0 };
  const activeRect = rects[active] || { left: 0, width: 0 };
  const underlineInset = 16; // px of the item's horizontal padding

  return (
    <nav
      aria-label="Primary"
      className={`mnav relative rounded-full border p-1.5 backdrop-blur-md ${t.nav} ${className}`}
      onMouseLeave={() => setHover(null)}
    >
      <ul ref={listRef} className="relative m-0 flex list-none p-0">
        {/* hover highlight */}
        <span
          aria-hidden="true"
          className={`mnav-glow pointer-events-none absolute top-0 bottom-0 rounded-full ${t.glow}`}
          style={{
            left: hoverRect.left,
            width: hoverRect.width,
            opacity: hover === null ? 0 : 1,
          }}
        />
        {/* active underline */}
        <span
          aria-hidden="true"
          className={`mnav-line pointer-events-none absolute bottom-[5px] h-px rounded-full ${t.line}`}
          style={{
            left: activeRect.left + underlineInset,
            width: Math.max(activeRect.width - underlineInset * 2, 0),
          }}
        />

        {items.map((item, i) => (
          // Measured on the <li> (it wraps the link exactly) so any link
          // component works, ref-forwarding or not.
          <li key={item.label} ref={(el) => (itemRefs.current[i] = el)} className="relative z-10">
            <LinkComponent
              href={item.href}
              onClick={() => onClick(i)}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-current={active === i ? "location" : undefined}
              className={`mnav-link block px-4 py-1.5 text-sm font-outfit tracking-wide transition-colors duration-300 outline-none ${
                active === i ? t.active : t.idle
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
            </LinkComponent>
          </li>
        ))}
      </ul>
    </nav>
  );
}
