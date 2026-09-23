"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

/**
 * One project tile. A soft spotlight tracks the cursor across the tile, the
 * icon leans a few pixels toward it, and the product name slides in along
 * the bottom edge. Everything is written to CSS variables straight on the
 * element (rAF-throttled), so a mouse move never re-renders React.
 */
export default function ProjectTile({ id, title, href }) {
  const ref = useRef(null);
  const frame = useRef(0);
  const pending = useRef(null);

  const apply = useCallback(() => {
    frame.current = 0;
    const el = ref.current;
    const p = pending.current;
    if (!el || !p) return;
    el.style.setProperty("--mx", `${p.x}%`);
    el.style.setProperty("--my", `${p.y}%`);
    el.style.setProperty("--px", `${p.dx}px`);
    el.style.setProperty("--py", `${p.dy}px`);
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      pending.current = {
        x: (x * 100).toFixed(1),
        y: (y * 100).toFixed(1),
        dx: ((x - 0.5) * 12).toFixed(1),
        dy: ((y - 0.5) * 12).toFixed(1),
      };
      if (!frame.current) frame.current = requestAnimationFrame(apply);
    },
    [apply]
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--px", "0px");
    el.style.setProperty("--py", "0px");
  }, []);

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${title}, opens in a new tab`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="project-tile relative block aspect-square overflow-hidden rounded-md bg-[#2a2a2a] outline-none"
    >
      <span className="project-tile-light" aria-hidden="true" />
      <Image
        src={`/${id}.png`}
        alt=""
        width={300}
        height={300}
        sizes="(max-width: 768px) 45vw, 230px"
        draggable={false}
        className="project-tile-icon absolute inset-0 m-auto h-[44%] w-[44%] select-none object-contain"
      />
      <span className="project-tile-name pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-3.5 pb-3 font-outfit text-[13px] text-white/90 md:text-sm">
        {title}
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </span>
    </a>
  );
}
