"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { W, H } from "./games";

/**
 * The handheld. The artwork is a 1292x1320 pixel-art console; its screen is
 * an irregular quad (measured from the art), so the game canvas is mapped
 * onto it with a perspective transform, letterboxed to keep 16:9. The
 * D-pad and A button in the art are tappable and light up on press.
 */
export const ART = { src: "/ArcadePic.png", w: 1292, h: 1320 };

// Inner screen corners in art pixels: top-left, top-right, bottom-right, bottom-left.
const SCREEN = [
  [330, 294],
  [870, 164],
  [890, 646],
  [334, 734],
];
// The screen's own aspect (from the corners): the canvas is letterboxed in it.
const SCREEN_W = W;
const SCREEN_H = Math.round(W * (((734 - 294) + (646 - 164)) / 2) / (((870 - 330) + (890 - 334)) / 2));

// The drawn controls, as fractions of the art (left, top, width, height).
const DPAD = [276 / 1292, 834 / 1320, 242 / 1292, 244 / 1320];
const ABTN = [766 / 1292, 788 / 1320, 178 / 1292, 196 / 1320];


/** matrix3d that maps the rect (0,0)-(w,h) onto the quad dst (4 points). */
function perspective(w, h, dst) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  // Solve the 8 unknowns of the homography with Gaussian elimination.
  const A = [];
  const B = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    B.push(v);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [B[c], B[p]] = [B[p], B[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      B[r] -= f * B[c];
    }
  }
  const m = B.map((b, i) => b / A[i][i]);
  const [a, b, c, d, e, f, g, hh] = m;
  // Column-major 4x4 for CSS: x' = a x + b y + c, y' = d x + e y + f, w' = g x + h y + 1.
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
}

export default function Console({ playing, hud, onPress, onRelease, children }) {
  const box = useRef(null);
  const [transform, setTransform] = useState("");

  // Idle, the console leans a few degrees toward the cursor and floats, like
  // the hero portrait. While a level plays it holds still.
  const tiltRef = useRef(null);
  const onPointerMove = useCallback(
    (e) => {
      const el = tiltRef.current;
      if (!el || playing || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--tilt-x", `${(-py * 8).toFixed(2)}deg`);
      el.style.setProperty("--tilt-y", `${(px * 10).toFixed(2)}deg`);
    },
    [playing]
  );
  const resetTilt = useCallback(() => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }, []);
  useEffect(() => {
    if (playing) resetTilt();
  }, [playing, resetTilt]);

  // Recompute the screen mapping whenever the console is resized.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => {
      const s = el.clientWidth / ART.w;
      const dst = SCREEN.map(([x, y]) => [x * s, y * s]);
      setTransform(perspective(SCREEN_W, SCREEN_H, dst));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = (key) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      onPress(key);
    },
    onPointerUp: () => onRelease(key),
    onPointerCancel: () => onRelease(key),
    onPointerLeave: () => onRelease(key),
  });
  const pct = ([l, t, w, h]) => ({ left: `${l * 100}%`, top: `${t * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });

  return (
    <div ref={tiltRef} className="console-tilt" onPointerMove={onPointerMove} onPointerLeave={resetTilt} data-playing={playing}>
    <div ref={box} className="console console-float relative w-full select-none" style={{ aspectRatio: `${ART.w} / ${ART.h}` }} data-playing={playing}>
      <Image src={ART.src} alt="A green handheld console with my face on the screen" fill sizes="(max-width: 768px) 80vw, 40vw" priority draggable={false} className="console-art object-contain" />
      {/* The screen: the canvas mapped onto the art's screen quad. */}
      <div className="console-screen absolute left-0 top-0" style={{ width: SCREEN_W, height: SCREEN_H, transform, transformOrigin: "0 0", visibility: transform ? "visible" : "hidden" }}>
        <div className="absolute left-0" style={{ top: (SCREEN_H - H) / 2, width: W, height: H }}>{children}</div>
      </div>
      {/* The drawn controls: tappable, and lit while pressed (keyboard too). */}
      <div ref={hud.dpad} className="console-key console-dpad absolute" style={pct(DPAD)} aria-hidden="true">
        <button type="button" className="console-tap absolute left-1/3 top-0 h-1/3 w-1/3" aria-label="Up" {...pad("ArrowUp")} />
        <button type="button" className="console-tap absolute left-1/3 bottom-0 h-1/3 w-1/3" aria-label="Down" {...pad("ArrowDown")} />
        <button type="button" className="console-tap absolute left-0 top-1/3 h-1/3 w-1/3" aria-label="Left" {...pad("ArrowLeft")} />
        <button type="button" className="console-tap absolute right-0 top-1/3 h-1/3 w-1/3" aria-label="Right" {...pad("ArrowRight")} />
      </div>
      <button ref={hud.a} type="button" className="console-key console-a absolute" style={pct(ABTN)} aria-label="A" {...pad(" ")} />
    </div>
    </div>
  );
}
