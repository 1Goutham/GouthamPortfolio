"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * A phone, built in CSS, holding a full-page screenshot of a product.
 *
 *  - It rests at a slight three-quarter angle and floats. Under the cursor it
 *    leans toward the pointer on a real perspective, eased every frame so it
 *    never snaps, and settles back on leave.
 *  - A glare on the glass follows the cursor; a sheen sweeps the glass once
 *    on entry.
 *  - The screenshot scrolls slowly down through the page while hovered and
 *    eases back to the top on leave, so the phone is a short tour of the
 *    product. On touch screens it tours on its own while in view.
 *
 * The frame is drawn with gradients and stacked shadows: no image assets.
 */
export default function Phone({ src, alt, className = "" }) {
  const stage = useRef(null);
  const body = useRef(null);
  const sim = useRef({ rx: 0, ry: 0, tx: 0, ty: 0, raf: 0, on: false });

  const tick = useCallback(() => {
    const s = sim.current;
    const el = body.current;
    s.rx += (s.tx - s.rx) * 0.1;
    s.ry += (s.ty - s.ry) * 0.1;
    if (el) {
      el.style.setProperty("--rx", `${s.rx.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${s.ry.toFixed(2)}deg`);
    }
    const settled = Math.abs(s.tx - s.rx) < 0.02 && Math.abs(s.ty - s.ry) < 0.02;
    s.raf = s.on || !settled ? requestAnimationFrame(tick) : 0;
  }, []);

  useEffect(() => () => cancelAnimationFrame(sim.current.raf), []);

  // Touch screens: tour the page on their own while the phone is in view.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-inview", e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onPointerMove = (e) => {
    if (e.pointerType !== "mouse") return;
    const el = stage.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const s = sim.current;
    s.tx = (0.5 - y) * 18; // lean up/down
    s.ty = (x - 0.5) * 24; // turn left/right
    el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    if (!s.on) {
      s.on = true;
      el.setAttribute("data-hover", "true");
    }
    if (!s.raf) s.raf = requestAnimationFrame(tick);
  };

  const onPointerLeave = () => {
    const s = sim.current;
    s.on = false;
    s.tx = 0;
    s.ty = 0;
    stage.current?.removeAttribute("data-hover");
    if (!s.raf) s.raf = requestAnimationFrame(tick);
  };

  return (
    <div
      ref={stage}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`phone-stage ${className}`}
    >
      <div ref={body} className="phone">
        <span className="phone-btn phone-btn-mute" aria-hidden="true" />
        <span className="phone-btn phone-btn-vol phone-btn-vol-up" aria-hidden="true" />
        <span className="phone-btn phone-btn-vol phone-btn-vol-down" aria-hidden="true" />
        <span className="phone-btn phone-btn-power" aria-hidden="true" />

        <div className="phone-frame">
          <div className="phone-screen">
            {/* Plain <img>: the full-page capture is tall and scrolls inside the screen. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="phone-shot" draggable={false} loading="lazy" decoding="async" />
            <span className="phone-island" aria-hidden="true" />
            <span className="phone-glare" aria-hidden="true" />
            <span className="phone-sheen" aria-hidden="true" />
          </div>
        </div>
      </div>
      <span className="phone-shadow" aria-hidden="true" />
    </div>
  );
}
