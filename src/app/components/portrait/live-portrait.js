"use client";

import { useEffect, useRef } from "react";
import DATA from "./portrait-data.json";

/**
 * The hero portrait, alive: the eyes find the cursor, the head turns a
 * little after them, he breathes, and he blinks.
 *
 * It is the same photo, taken apart offline (see scripts/portrait): the
 * irises lifted out and the whites rebuilt behind them, a closed upper lid
 * built for each eye from clean lid skin and the real lash line, and a
 * depth map of the face. A fragment shader puts it back together every
 * frame:
 *
 *  - the irises move inside the real eyelid openings, under the lid's
 *    shadow, foreshortened as they turn, the catchlight lagging behind as
 *    it does on a curved cornea;
 *  - blinks roll the closed lid down from the crease while the lower lid
 *    rises a little to meet it; looking down lowers the lid a touch;
 *  - the head turn displaces the face by its depth, and the face's shading
 *    shifts with it (normals from the depth map), so it reads as a solid.
 *
 * The eyes move like eyes: quick jumps (saccades) to a new point, holding
 * still between them with a faint tremor, slow pursuit for small moves,
 * each eye aiming from its own position. With no cursor (touch screens, or
 * a still mouse) they look at you and glance around now and then. A click
 * can startle a blink.
 *
 * At rest the render is identical to the photo, so the swap from the <img>
 * is invisible. `api.current` gets { lookAt(x, y, ms) } for glances, and
 * `onHead(dx, dy)` reports, in CSS pixels, how far something floating just
 * in front of the face should move.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const N = DATA.lidN;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uBase;
uniform sampler2D uAux;
uniform sampler2D uIris;
uniform sampler2D uLids;
uniform sampler2D uPhoto;
uniform float uRest[2];
uniform vec2 uSize;
uniform vec2 uHead;
uniform vec2 uLight;
uniform vec4 uLidsRect;
uniform vec2 uAtlas;
uniform vec2 uC[2];
uniform vec2 uOff[2];
uniform vec2 uScale[2];
uniform vec4 uRect[2];
uniform float uTexR[2];
uniform vec3 uCatch[2];
uniform float uUpY[${2 * N}];
uniform float uLoY[${2 * N}];
uniform vec2 uX[2];
uniform float uLid[2];
uniform float uRise[2];

const int N = ${N};

// The portrait at q with both irises in place (no lid movement).
vec4 withEyes(vec2 q) {
  vec2 uvq = q / uSize;
  vec4 col = texture2D(uBase, uvq);
  vec4 aux = texture2D(uAux, uvq);
  for (int i = 0; i < 2; i++) {
    float m = i == 0 ? aux.g : aux.b;
    if (m < 0.002) continue;
    vec2 ic = uC[i] + uOff[i];
    vec2 lp = (q - ic) / uScale[i];
    vec2 texel = uRect[i].xy + vec2(uTexR[i] + 0.5) + lp;
    vec4 iris = texture2D(uIris, texel / uAtlas);
    if (abs(lp.x) > uTexR[i] || abs(lp.y) > uTexR[i]) iris = vec4(0.0);
    // Under the upper lid the iris sits in its shadow, like the white.
    iris.rgb *= aux.a;
    col = col * (1.0 - iris.a * m) + iris * m;

    // Catchlight: a reflection on the cornea, so it moves less than the iris.
    vec2 cp = uC[i] + uCatch[i].xy + uOff[i] * 0.55;
    float s = max(uCatch[i].z * 0.5, 0.6);
    float g = exp(-dot(q - cp, q - cp) / (2.0 * s * s));
    col.rgb += vec3(0.92) * g * m * col.a;
  }
  return col;
}

// The closed lid built offline, at image position p.
vec4 closedLid(vec2 p) {
  vec2 t = (p - uLidsRect.xy) / uLidsRect.zw;
  if (t.x < 0.0 || t.y < 0.0 || t.x > 1.0 || t.y > 1.0) return vec4(0.0);
  return texture2D(uLids, t);
}

void main() {
  vec2 p = vUv * uSize;

  // Head turn: everything moves by its depth (nearest moves most).
  float d = texture2D(uAux, vUv).r;
  vec2 q = p - (d - 0.55) * uHead;

  vec4 col = withEyes(q);

  for (int i = 0; i < 2; i++) {
    if (uLid[i] < 0.001 && uRise[i] < 0.001) continue;
    if (q.x < uX[i].x - 2.0 || q.x > uX[i].y + 2.0) continue;
    // The lid lines at this x, traced from the photo (WebGL 1 only lets a
    // uniform array be indexed by loop counters, so the lookup is inline).
    float lt = clamp((q.x - uX[i].x) / (uX[i].y - uX[i].x), 0.0, 1.0) * float(N - 1);
    float yu = 0.0;
    float yl = 0.0;
    for (int k = 0; k < N - 1; k++) {
      if (lt >= float(k) && lt <= float(k + 1)) {
        float f = lt - float(k);
        yu = mix(uUpY[i * N + k], uUpY[i * N + k + 1], f);
        yl = mix(uLoY[i * N + k], uLoY[i * N + k + 1], f);
      }
    }
    // Lids move most in the middle and not at all at the corners.
    float span = uX[i].y - uX[i].x;
    float taper = smoothstep(uX[i].x, uX[i].x + span * 0.16, q.x) * (1.0 - smoothstep(uX[i].y - span * 0.16, uX[i].y, q.x));
    float gap = max(yl - yu, 0.0);
    // The lower lid rises a little to meet a blink.
    float ylo = yl - uRise[i] * taper * gap;
    float yLid = yu + uLid[i] * taper * max(ylo - yu, 0.0);
    const float TOP = 22.0;
    const float LOW = 9.0;
    float top = yu - TOP;
    if (q.y < top || q.y > yl + LOW) continue;

    // Lower lid: its strip is drawn up to the risen edge.
    if (q.y > ylo - 1.0) {
      float t = clamp((q.y - ylo) / (yl + LOW - ylo), 0.0, 1.0);
      vec4 low = texture2D(uBase, vec2(q.x, yl + t * LOW) / uSize);
      float a = smoothstep(ylo - 0.9, ylo + 0.9, q.y) * step(0.0005, uRise[i]);
      col = mix(col, low, a);
    }

    // Upper lid: the closed lid rolls down from the crease. Its rows are
    // gathered into the strip above the moving edge, so a half-closed lid
    // is the closed lid's upper part with its lash line at the edge.
    if (q.y <= yLid + 1.0) {
      float t = clamp((q.y - top) / max(yLid - top, 0.001), 0.0, 1.0);
      vec2 src = vec2(q.x, top + t * (yl - top));
      vec4 lid = closedLid(src);
      if (lid.a < 0.5) lid = texture2D(uBase, src / uSize);
      float a = 1.0 - smoothstep(yLid - 0.9, yLid + 0.9, q.y);
      // The lash line shades the eye just below it as the lid comes down.
      float below = max(q.y - yLid, 0.0);
      float shadow = 1.0 - 0.32 * clamp(uLid[i] * 5.0, 0.0, 1.0) * exp(-below / 2.6);
      col = mix(vec4(col.rgb * shadow, col.a), lid, a);
    } else if (q.y < yLid + 9.0) {
      float below = q.y - yLid;
      col.rgb *= 1.0 - 0.32 * clamp(uLid[i] * 5.0, 0.0, 1.0) * exp(-below / 2.6);
    }
  }

  // At rest the eyes are the photo's own, real iris edge and catchlight
  // and all; the rebuilt eye takes over as soon as they move.
  vec4 aux0 = texture2D(uAux, q / uSize);
  float rest = aux0.g * uRest[0] + aux0.b * uRest[1];
  if (rest > 0.0) col = mix(col, texture2D(uPhoto, q / uSize), rest);

  // Light: the face's own shading shifts as it turns, using the depth
  // map's slope as the surface direction. At rest this is exactly 1.
  vec2 e = 3.0 / uSize;
  float dx = texture2D(uAux, vUv + vec2(e.x, 0.0)).r - texture2D(uAux, vUv - vec2(e.x, 0.0)).r;
  float dy = texture2D(uAux, vUv + vec2(0.0, e.y)).r - texture2D(uAux, vUv - vec2(0.0, e.y)).r;
  vec3 n = normalize(vec3(-dx * 9.0, -dy * 9.0, 1.0));
  vec3 L0 = normalize(vec3(0.0, -0.35, 1.0));
  vec3 L = normalize(vec3(-uLight.x * 0.55, -0.35 - uLight.y * 0.35, 1.0));
  float lit = (dot(n, L) + 0.25) / (dot(n, L0) + 0.25);
  col.rgb *= mix(1.0, clamp(lit, 0.85, 1.12), 0.6);

  gl_FragColor = col;
}`;

/** The first-paint photo; the <img> must load this exact file, unresized. */
export const PHOTO_SRC = "/portrait/photo.webp";

const SRC = {
  base: "/portrait/base.webp",
  aux: "/portrait/aux.png",
  iris: "/portrait/iris.png",
  lids: "/portrait/lids.png",
  photo: PHOTO_SRC,
};

const HEAD_PX = [15, 9]; // how far the nearest point travels, image pixels
const FLOAT_DEPTH = 0.6; // where text floating in front of the face sits, same units
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (dt, tau) => 1 - Math.exp(-dt / tau);

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/**
 * Fetch and decode an image off the main thread, ready to upload. `data`:
 * its channels are separate fields, not colour and coverage, so alpha must
 * not be multiplied into them and no colour conversion may touch them.
 * (Decoding inside texImage2D from an <img> would block the page.)
 */
async function loadBitmap(src, data) {
  const blob = await (await fetch(src)).blob();
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, {
        premultiplyAlpha: data ? "none" : "premultiply",
        colorSpaceConversion: data ? "none" : "default",
      });
    } catch {
      /* fall through to an <img> */
    }
  }
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await img.decode();
  return img;
}

/**
 * Compile and link without stalling the page: with KHR_parallel_shader_compile
 * the driver compiles in the background and we check back each frame.
 */
async function buildProgram(gl, vert, frag) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  const vs = sh(gl.VERTEX_SHADER, vert);
  const fs = sh(gl.FRAGMENT_SHADER, frag);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  const ext = gl.getExtension("KHR_parallel_shader_compile");
  if (ext) {
    while (!gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR)) await nextFrame();
  }
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(prog) || "link");
  }
  return prog;
}

function texture(gl, unit, img, data = false) {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  // ImageBitmaps were already prepared by loadBitmap; these flags only
  // apply to the <img> fallback.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !data);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, data ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  // The portrait is drawn smaller than its texture; with mipmaps it is
  // filtered the way the browser scales the <img> it replaces, so the swap
  // does not change its sharpness. (WebGL 1 can't mipmap these sizes.)
  const mip = !data && typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
  if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

export default function LivePortrait({ enabled = true, onReady, onHead, api, className = "" }) {
  const ref = useRef(null);
  const onHeadRef = useRef(onHead);
  onHeadRef.current = onHead;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const opts = { premultipliedAlpha: true, alpha: true, antialias: false };
    const gl = canvas.getContext("webgl2", opts) || canvas.getContext("webgl", opts);
    if (!gl) return;

    let raf = 0;
    let alive = true;
    let visible = true;
    const cleanups = [];

    const start = async () => {
      const NAMES = ["uBase", "uAux", "uIris", "uLids", "uPhoto"];
      let imgs;
      let prog;
      try {
        // Decode in parallel off the main thread while the shader compiles.
        const pending = [SRC.base, SRC.aux, SRC.iris, SRC.lids, SRC.photo].map((src, i) => loadBitmap(src, NAMES[i] === "uAux"));
        prog = await buildProgram(gl, VERT, FRAG);
        imgs = await Promise.all(pending);
      } catch (err) {
        console.warn("Live portrait unavailable:", err);
        return;
      }
      if (!alive) return;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      // One upload per frame, so no single frame carries all of them.
      for (let i = 0; i < NAMES.length; i++) {
        texture(gl, i, imgs[i], NAMES[i] === "uAux");
        gl.uniform1i(gl.getUniformLocation(prog, NAMES[i]), i);
        imgs[i].close?.();
        await nextFrame();
        if (!alive) return;
      }

      const U = (n) => gl.getUniformLocation(prog, n);
      const [W, H] = DATA.size;
      const E = DATA.eyes;
      gl.uniform2f(U("uSize"), W, H);
      gl.uniform2f(U("uAtlas"), DATA.atlas[0], DATA.atlas[1]);
      gl.uniform4f(U("uLidsRect"), ...DATA.lids);
      gl.uniform2fv(U("uC"), E.flatMap((e) => e.c));
      gl.uniform4fv(U("uRect"), E.flatMap((e) => e.rect));
      gl.uniform1fv(U("uTexR"), E.map((e) => e.texR));
      gl.uniform3fv(U("uCatch"), E.flatMap((e) => e.catch));
      gl.uniform1fv(U("uUpY"), E.flatMap((e) => e.up));
      gl.uniform1fv(U("uLoY"), E.flatMap((e) => e.lo));
      gl.uniform2fv(U("uX"), E.flatMap((e) => e.x));
      const uHead = U("uHead");
      const uLight = U("uLight");
      const uOff = U("uOff");
      const uScale = U("uScale");
      const uLid = U("uLid");
      const uRise = U("uRise");
      const uRest = U("uRest");

      gl.clearColor(0, 0, 0, 0);

      // ---------------------------------------------------------- motion
      const t0 = performance.now();
      const pointer = { x: 0, y: 0, has: false, t: 0 };
      const st = {
        eye: E.map(() => ({ x: 0, y: 0 })), // where each eye looks, -1..1
        fix: E.map(() => ({ x: 0, y: 0 })), // the point it is jumping to
        lastSaccade: 0,
        head: { x: 0, y: 0 },
        idleTarget: { x: 0, y: 0 },
        nextGlance: t0 + rand(1200, 2600),
        glance: null, // { x, y, until } from lookAt()
        blink: { t0: -1, double: false },
        nextBlink: t0 + rand(1800, 3600),
        last: t0,
      };

      const startBlink = (now, chanceDouble = 0.12) => {
        if (st.blink.t0 >= 0) return;
        st.blink.t0 = now;
        st.blink.double = Math.random() < chanceDouble;
        st.nextBlink = now + rand(2400, 6000);
      };

      const onMove = (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.has = true;
        pointer.t = performance.now();
      };
      // A click is a small surprise: often a quick blink.
      const onDown = (e) => {
        onMove(e);
        if (Math.random() < 0.55) {
          const at = performance.now() + 50;
          setTimeout(() => startBlink(at, 0), 50);
        }
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
      });

      if (api) {
        api.current = {
          /** Glance at a screen point for `ms`, then back to whatever was next. */
          lookAt(x, y, ms = 800) {
            st.glance = { x, y, until: performance.now() + ms };
          },
        };
        cleanups.push(() => {
          api.current = null;
        });
      }

      // Phones and tablets: draw at 1.5x and 30fps. It is eye movement on a
      // small screen, so it looks the same, for well under half the GPU work.
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const FRAME_MS = coarse ? 1000 / 30 - 2 : 0;
      let lastDraw = 0;
      // While the page is scrolling, the frame budget goes to the scroll:
      // the portrait holds its last frame and picks up when it settles.
      let scrollingUntil = 0;
      const onScroll = () => {
        scrollingUntil = performance.now() + 140;
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", onScroll));

      const fit = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
        const r = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(r.width * dpr));
        const h = Math.max(1, Math.round(r.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
      };
      const ro = new ResizeObserver(fit);
      ro.observe(canvas);
      cleanups.push(() => ro.disconnect());

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) {
          st.last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      });
      io.observe(canvas);
      cleanups.push(() => io.disconnect());
      const onVis = () => {
        if (!document.hidden && visible && !raf) {
          st.last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      };
      document.addEventListener("visibilitychange", onVis);
      cleanups.push(() => document.removeEventListener("visibilitychange", onVis));

      /**
       * Blink over time, 0 open .. 1 shut: the lid falls fast and
       * accelerating, rests a beat, and lifts more slowly, easing out.
       */
      const blinkAt = (now) => {
        const b = st.blink;
        if (b.t0 < 0 || now < b.t0) return 0;
        const t = now - b.t0;
        const close = 82, hold = 28, open = 190;
        if (t < close) return Math.pow(t / close, 2.2);
        if (t < close + hold) return 1;
        if (t < close + hold + open) {
          const u = (t - close - hold) / open;
          return 1 - (1 - Math.pow(1 - u, 3));
        }
        if (b.double) {
          b.double = false;
          b.t0 = now + 70;
          return 0;
        }
        b.t0 = -1;
        return 0;
      };

      // Where an eye at (ex, ey) on screen looks to see the point (px, py).
      const aim = (ex, ey, px, py, rectW) => {
        const depth = rectW * 1.7;
        return {
          x: Math.tanh(Math.atan2(px - ex, depth) / 0.55),
          y: Math.tanh(Math.atan2(py - ey, depth) / 0.5),
        };
      };

      let first = true;
      const frame = (now) => {
        raf = 0;
        if (!alive || !visible || document.hidden) return;
        if (now - lastDraw < FRAME_MS || now < scrollingUntil) {
          raf = requestAnimationFrame(frame);
          return;
        }
        lastDraw = now;
        const dt = Math.min(64, now - st.last);
        st.last = now;
        const rect = canvas.getBoundingClientRect();
        const kx = rect.width / W;
        const ky = rect.height / H;

        // Where each eye wants to look, -1..1 per axis.
        const glance = st.glance && now < st.glance.until ? st.glance : null;
        const active = pointer.has && now - pointer.t < 6000;
        if (!active && !glance && now > st.nextGlance) {
          // Mostly at you, sometimes a glance away.
          const away = Math.random() < 0.45;
          st.idleTarget = away ? { x: rand(-0.7, 0.7), y: rand(-0.35, 0.45) } : { x: rand(-0.08, 0.08), y: rand(-0.06, 0.06) };
          st.nextGlance = now + (away ? rand(600, 1300) : rand(1800, 4200));
        }
        const targets = E.map((e) => {
          const ex = rect.left + e.c[0] * kx;
          const ey = rect.top + e.c[1] * ky;
          if (glance) return aim(ex, ey, glance.x, glance.y, rect.width);
          if (!active) return st.idleTarget;
          return aim(ex, ey, pointer.x, pointer.y, rect.width);
        });

        // Saccades: when the target has moved far enough, both eyes jump.
        const far = targets.some((t, i) => Math.hypot(t.x - st.fix[i].x, t.y - st.fix[i].y) > 0.07);
        if (far && now - st.lastSaccade > 110) {
          const amp = Math.hypot(targets[0].x - st.eye[0].x, targets[0].y - st.eye[0].y);
          targets.forEach((t, i) => (st.fix[i] = { ...t }));
          st.lastSaccade = now;
          // Big gaze shifts often come with a blink.
          if (amp > 0.85 && Math.random() < 0.35) startBlink(now, 0);
        }
        const kJump = ease(dt, 22);
        const kPursue = ease(dt, 260);
        st.eye.forEach((g, i) => {
          const f = st.fix[i];
          const near = Math.hypot(f.x - g.x, f.y - g.y) < 0.02;
          // Jump to the fixation point; once there, track small moves slowly.
          const tgt = near ? targets[i] : f;
          const k = near ? kPursue : kJump;
          g.x += (tgt.x - g.x) * k;
          g.y += (tgt.y - g.y) * k;
        });

        // The head follows the gaze, later and less, and is never quite
        // still: a slow sway and the rise and fall of breathing.
        const s = (now - t0) / 1000;
        const sway = {
          x: Math.sin(s * 0.41) * 0.05 + Math.sin(s * 0.93 + 1.7) * 0.025,
          y: Math.sin(s * 1.55) * 0.035 + Math.sin(s * 0.37 + 0.6) * 0.02,
        };
        const kh = ease(dt, 520);
        const gm = { x: (st.eye[0].x + st.eye[1].x) / 2, y: (st.eye[0].y + st.eye[1].y) / 2 };
        st.head.x += (gm.x * 0.7 + sway.x - st.head.x) * kh;
        st.head.y += (gm.y * 0.6 + sway.y - st.head.y) * kh;
        const hx = st.head.x * HEAD_PX[0];
        const hy = st.head.y * HEAD_PX[1];
        gl.uniform2f(uHead, hx, hy);
        gl.uniform2f(uLight, st.head.x, st.head.y);
        onHeadRef.current?.(hx * FLOAT_DEPTH * kx, hy * FLOAT_DEPTH * ky);

        // Eye in head: the head turning does part of the work. A faint
        // tremor keeps the eyes from looking painted on.
        const offs = [];
        const scales = [];
        const lids = [];
        const rises = [];
        const rests = [];
        if (now > st.nextBlink) startBlink(now);
        const blink = blinkAt(now);
        E.forEach((e, i) => {
          const tremor = 0.012;
          const gx = clamp(st.eye[i].x - st.head.x * 0.35 + (Math.random() - 0.5) * tremor, -1, 1);
          const gy = clamp(st.eye[i].y - st.head.y * 0.3 + (Math.random() - 0.5) * tremor, -1, 1);
          offs.push(gx * e.maxX * 0.8, gy < 0 ? gy * e.maxUp : gy * e.maxDown);
          // How close the eye is to its pose in the photo (tremor aside).
          const rx = (st.eye[i].x - st.head.x * 0.35) * e.maxX * 0.8;
          const ry = (st.eye[i].y - st.head.y * 0.3) * e.maxDown;
          // The iris turns away from view as the eye rotates.
          scales.push(1 - 0.12 * Math.abs(gx), 1 - 0.07 * Math.abs(gy));
          // Looking down, the upper lid follows the eye down a little.
          lids.push(Math.max(blink, Math.max(0, gy) * 0.22));
          rises.push(blink * 0.14);
          rests.push(Math.exp(-(rx * rx + ry * ry) / 0.8) * (1 - clamp(Math.max(blink, Math.max(0, gy) * 0.22) * 8, 0, 1)));
        });
        gl.uniform2fv(uOff, offs);
        gl.uniform2fv(uScale, scales);
        gl.uniform1fv(uLid, lids);
        gl.uniform1fv(uRise, rises);
        gl.uniform1fv(uRest, rests);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (first) {
          // Hand over on the next frame, once this one is on screen.
          first = false;
          requestAnimationFrame(() => alive && onReady?.());
        }
        raf = requestAnimationFrame(frame);
      };

      fit();
      raf = requestAnimationFrame(frame);
    };

    // Still let the page breathe first; the photo is already showing.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 800 })
      : setTimeout(start, 200);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (window.cancelIdleCallback && typeof idle === "number") window.cancelIdleCallback(idle);
      clearTimeout(idle);
      cleanups.forEach((f) => f());
    };
  }, [enabled, onReady, api]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
