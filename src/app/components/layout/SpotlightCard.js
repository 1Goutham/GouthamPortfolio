"use client"
import { useRef, useCallback } from "react";

/**
 * Spotlight follows the cursor via CSS custom properties written straight to
 * the DOM (rAF-throttled) - zero React re-renders per mouse move.
 * Also adds a subtle 3D tilt + lift on hover.
 */
const SpotlightCard = ({ children, className = "", spotlightColor = "rgba(255, 255, 255, 0.25)" }) => {
  const divRef = useRef(null);
  const frame = useRef(0);
  const pending = useRef(null);

  const apply = useCallback(() => {
    frame.current = 0;
    const el = divRef.current;
    const p = pending.current;
    if (!el || !p) return;
    el.style.setProperty("--spot-x", `${p.x}px`);
    el.style.setProperty("--spot-y", `${p.y}px`);
    el.style.setProperty("--tilt-x", `${p.tiltX}deg`);
    el.style.setProperty("--tilt-y", `${p.tiltY}deg`);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const el = divRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pending.current = {
      x,
      y,
      // Tilt at most ~2.5deg toward the cursor - felt, not seen.
      tiltY: ((x / rect.width) - 0.5) * 5,
      tiltX: (0.5 - (y / rect.height)) * 5,
    };
    if (!frame.current) frame.current = requestAnimationFrame(apply);
  }, [apply]);

  const setActive = useCallback((on) => {
    const el = divRef.current;
    if (!el) return;
    el.style.setProperty("--spot-o", on ? "0.6" : "0");
    if (!on) {
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    }
  }, []);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={`spotlight-card relative rounded-3xl border-3 border-neutral-800 bg-neutral-900 overflow-hidden p-8 ${className}`}
      style={{
        "--spot-x": "50%",
        "--spot-y": "50%",
        "--spot-o": 0,
        "--tilt-x": "0deg",
        "--tilt-y": "0deg",
        "--spot-color": spotlightColor,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{
          opacity: "var(--spot-o)",
          background: `radial-gradient(circle at var(--spot-x) var(--spot-y), var(--spot-color), transparent 80%)`,
        }}
      />
      {children}
    </div>
  );
};

export default SpotlightCard;
