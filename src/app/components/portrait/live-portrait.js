"use client";

import { useEffect, useRef } from "react";
import DATA from "./portrait-data.json";

/**
 * The hero portrait, alive: the eyes find the cursor, the head turns a
 * little after them, and he blinks.
 *
 * It is the same photo, taken apart offline (see scripts/portrait): the
 * irises were lifted out and the whites rebuilt behind them, the lettering
 * moved to its own layer, and a depth map made of the face. A fragment
 * shader puts it back together every frame with the irises moved inside
 * the real eyelid openings, the lid shadow laid over them, the catchlight
 * lagging behind as it does on a curved cornea, the upper lid slid down
 * for blinks, and the whole face displaced by its depth for the head turn.
 *
 * The eyes move like eyes: quick jumps to a new point (saccades), holding
 * still between them with a faint tremor, and a slow pursuit for small
 * moves. Each eye aims at the cursor from its own position, so they
 * converge a little on near points. With no cursor (touch screens, or a
 * still mouse) they look at you and glance around now and then.
 *
 * Nothing changes until the first frame is ready; at rest the render is
 * identical to the photo, so the swap from the <img> is invisible.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uBase;
uniform sampler2D uAux;
uniform sampler2D uIris;
uniform sampler2D uText;
uniform vec2 uSize;
uniform vec2 uHead;
uniform vec4 uTextRect;
uniform vec2 uAtlas;
uniform vec2 uC[2];
uniform vec2 uOff[2];
uniform vec2 uScale[2];
uniform vec4 uRect[2];
uniform float uTexR[2];
uniform vec3 uCatch[2];
uniform float uUpY[${2 * 24}];
uniform float uLoY[${2 * 24}];
uniform vec2 uX[2];
uniform float uLid[2];

const int N = 24;

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

void main() {
  vec2 p = vUv * uSize;

  // Head turn: everything moves by its depth (nearest moves most).
  float d = texture2D(uAux, vUv).r;
  vec2 q = p - (d - 0.55) * uHead;

  vec4 col = withEyes(q);

  // Lids: the strip of upper lid above the lash line is stretched down to
  // the new lid edge, so the lid and its lashes slide over the eye for a
  // blink or a downward look, casting a soft lash shadow just below.
  for (int i = 0; i < 2; i++) {
    if (uLid[i] < 0.001) continue;
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
    // The lid moves most in the middle and not at all at the corners.
    float span = uX[i].y - uX[i].x;
    float taper = smoothstep(uX[i].x, uX[i].x + span * 0.16, q.x) * (1.0 - smoothstep(uX[i].y - span * 0.16, uX[i].y, q.x));
    float amt = uLid[i] * taper;
    float yLid = yu + amt * max(yl - yu, 0.0);
    // Measured on the photo: the dark lash line is the 6px above the
    // opening, clean lid skin runs from 8 to 22px above it.
    const float LASH = 6.0;
    const float SKIN_LO = 8.0;
    const float TOP = 22.0;
    float top = yu - TOP;
    if (q.y < top || q.y > yl + 1.0) continue;
    // Below the lid edge: the eye, shaded by the lashes as the lid lowers.
    float below = q.y - yLid;
    float shadow = 1.0 - 0.3 * clamp(amt * 5.0, 0.0, 1.0) * exp(-max(below, 0.0) / 2.6);
    vec4 eye = vec4(col.rgb * shadow, col.a);
    // Above it: the lid. The lash band rides down with the edge at its own
    // size; the lid skin above it is stretched over the eye and softened
    // as it stretches, so it reads as skin rather than smeared texture.
    vec4 lid;
    if (q.y > yLid - LASH) {
      lid = texture2D(uBase, vec2(q.x, yu - (yLid - q.y)) / uSize);
    } else {
      float t = clamp((q.y - top) / max(yLid - LASH - top, 0.001), 0.0, 1.0);
      float sy = top + t * (TOP - SKIN_LO);
      float r = (0.5 + 3.5 * t) * clamp(amt * 2.0, 0.0, 1.0);
      vec4 sum = vec4(0.0);
      for (int u = -2; u <= 2; u++) {
        for (int v = -1; v <= 1; v++) {
          vec2 o = vec2(float(u) * r * 1.4, float(v) * r * 0.6);
          sum += texture2D(uBase, (vec2(q.x, sy) + o) / uSize);
        }
      }
      lid = sum / 15.0;
    }
    float a = 1.0 - smoothstep(yLid - 0.9, yLid + 0.9, q.y);
    col = mix(eye, lid, a);
  }

  // The lettering floats in front of the face.
  vec2 tp = (p - uHead * 0.6 - uTextRect.xy) / uTextRect.zw;
  if (tp.x > 0.0 && tp.x < 1.0 && tp.y > 0.0 && tp.y < 1.0) {
    float t = texture2D(uText, tp).a;
    col = vec4(1.0) * t + col * (1.0 - t);
  }

  gl_FragColor = col;
}`;

const SRC = {
  base: "/portrait/base.webp",
  aux: "/portrait/aux.png",
  iris: "/portrait/iris.png",
  text: "/portrait/text.png",
};

const HEAD_PX = [15, 9]; // how far the nearest point travels, image pixels
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (dt, tau) => 1 - Math.exp(-dt / tau);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}

function texture(gl, unit, img) {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

export default function LivePortrait({ onReady, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;

    let raf = 0;
    let alive = true;
    let visible = true;
    const cleanups = [];

    const start = async () => {
      let imgs;
      try {
        imgs = await Promise.all([loadImage(SRC.base), loadImage(SRC.aux), loadImage(SRC.iris), loadImage(SRC.text)]);
      } catch {
        return;
      }
      if (!alive) return;

      let prog;
      try {
        prog = gl.createProgram();
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      } catch (err) {
        console.warn("Live portrait unavailable:", err);
        return;
      }
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      ["uBase", "uAux", "uIris", "uText"].forEach((name, i) => {
        texture(gl, i, imgs[i]);
        gl.uniform1i(gl.getUniformLocation(prog, name), i);
      });

      const U = (n) => gl.getUniformLocation(prog, n);
      const [W, H] = DATA.size;
      const E = DATA.eyes;
      gl.uniform2f(U("uSize"), W, H);
      gl.uniform2f(U("uAtlas"), DATA.atlas[0], DATA.atlas[1]);
      gl.uniform4f(U("uTextRect"), ...DATA.text);
      gl.uniform2fv(U("uC"), E.flatMap((e) => e.c));
      gl.uniform4fv(U("uRect"), E.flatMap((e) => e.rect));
      gl.uniform1fv(U("uTexR"), E.map((e) => e.texR));
      gl.uniform3fv(U("uCatch"), E.flatMap((e) => e.catch));
      gl.uniform1fv(U("uUpY"), E.flatMap((e) => e.up));
      gl.uniform1fv(U("uLoY"), E.flatMap((e) => e.lo));
      gl.uniform2fv(U("uX"), E.flatMap((e) => e.x));
      const uHead = U("uHead");
      const uOff = U("uOff");
      const uScale = U("uScale");
      const uLid = U("uLid");

      gl.clearColor(0, 0, 0, 0);

      // ---------------------------------------------------------- motion
      const pointer = { x: 0, y: 0, has: false, t: 0 };
      const st = {
        eye: E.map(() => ({ x: 0, y: 0 })), // where each eye looks, -1..1
        fix: E.map(() => ({ x: 0, y: 0 })), // the point it is jumping to
        lastSaccade: 0,
        head: { x: 0, y: 0 },
        idleTarget: { x: 0, y: 0 },
        nextGlance: performance.now() + rand(1200, 2600),
        blink: { t0: -1, double: false },
        nextBlink: performance.now() + rand(1800, 3600),
        last: performance.now(),
      };

      const onMove = (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.has = true;
        pointer.t = performance.now();
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onMove, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onMove);
      });

      const fit = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

      /** Blink shape over time: a quick close, a beat shut, a slower open. */
      const blinkAt = (now) => {
        const b = st.blink;
        if (b.t0 < 0) return 0;
        const t = now - b.t0;
        const close = 70, hold = 35, open = 150;
        if (t < close) return Math.pow(t / close, 1.6);
        if (t < close + hold) return 1;
        if (t < close + hold + open) return 1 - Math.pow((t - close - hold) / open, 0.8);
        if (b.double) {
          b.double = false;
          b.t0 = now + 60;
          return 0;
        }
        b.t0 = -1;
        return 0;
      };
      const startBlink = (now, chanceDouble = 0.14) => {
        if (st.blink.t0 >= 0) return;
        st.blink.t0 = now;
        st.blink.double = Math.random() < chanceDouble;
        st.nextBlink = now + rand(2400, 6200);
      };

      let first = true;
      const frame = (now) => {
        raf = 0;
        if (!alive || !visible || document.hidden) return;
        const dt = Math.min(64, now - st.last);
        st.last = now;
        const rect = canvas.getBoundingClientRect();
        const kx = rect.width / W;
        const ky = rect.height / H;

        // Where each eye wants to look, -1..1 per axis.
        const active = pointer.has && now - pointer.t < 6000;
        if (!active && now > st.nextGlance) {
          // Mostly at you, sometimes a glance away.
          const away = Math.random() < 0.45;
          st.idleTarget = away ? { x: rand(-0.7, 0.7), y: rand(-0.35, 0.45) } : { x: rand(-0.08, 0.08), y: rand(-0.06, 0.06) };
          st.nextGlance = now + (away ? rand(600, 1300) : rand(1800, 4200));
        }
        const targets = E.map((e) => {
          if (!active) return st.idleTarget;
          const ex = rect.left + e.c[0] * kx;
          const ey = rect.top + e.c[1] * ky;
          // The cursor as a point on a plane a little in front of the face.
          const depth = rect.width * 1.7;
          const ax = Math.atan2(pointer.x - ex, depth);
          const ay = Math.atan2(pointer.y - ey, depth);
          return { x: Math.tanh(ax / 0.55), y: Math.tanh(ay / 0.5) };
        });

        // Saccades: when the target has moved far enough, both eyes jump.
        const far = targets.some((t, i) => Math.hypot(t.x - st.fix[i].x, t.y - st.fix[i].y) > 0.07);
        if (far && now - st.lastSaccade > 110) {
          const amp = Math.hypot(targets[0].x - st.eye[0].x, targets[0].y - st.eye[0].y);
          targets.forEach((t, i) => (st.fix[i] = { ...t }));
          st.lastSaccade = now;
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

        // The head follows the gaze, later and less.
        const kh = ease(dt, 520);
        const gm = { x: (st.eye[0].x + st.eye[1].x) / 2, y: (st.eye[0].y + st.eye[1].y) / 2 };
        st.head.x += (gm.x * 0.7 - st.head.x) * kh;
        st.head.y += (gm.y * 0.6 - st.head.y) * kh;
        gl.uniform2f(uHead, st.head.x * HEAD_PX[0], st.head.y * HEAD_PX[1]);

        // Eye in head: the head turning does part of the work. A faint
        // tremor keeps the eyes from looking painted on.
        const offs = [];
        const scales = [];
        const lids = [];
        const blink = blinkAt(now);
        if (now > st.nextBlink) startBlink(now);
        E.forEach((e, i) => {
          const tremor = 0.012;
          const gx = clamp(st.eye[i].x - st.head.x * 0.35 + (Math.random() - 0.5) * tremor, -1, 1);
          const gy = clamp(st.eye[i].y - st.head.y * 0.3 + (Math.random() - 0.5) * tremor, -1, 1);
          offs.push(gx * e.maxX * 0.8, gy < 0 ? gy * e.maxUp : gy * e.maxDown);
          // The iris turns away from view as the eye rotates.
          scales.push(1 - 0.12 * Math.abs(gx), 1 - 0.07 * Math.abs(gy));
          // Looking down, the upper lid follows the eye down a little.
          lids.push(Math.max(blink, Math.max(0, gy) * 0.22));
        });
        gl.uniform2fv(uOff, offs);
        gl.uniform2fv(uScale, scales);
        gl.uniform1fv(uLid, lids);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (first) {
          first = false;
          onReady?.();
        }
        raf = requestAnimationFrame(frame);
      };

      fit();
      raf = requestAnimationFrame(frame);
    };

    // Let the page settle first; the photo is already showing.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : setTimeout(start, 600);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (window.cancelIdleCallback && typeof idle === "number") window.cancelIdleCallback(idle);
      clearTimeout(idle);
      cleanups.forEach((f) => f());
    };
  }, [onReady]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
