'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpRight } from 'lucide-react';

const FORM_ENDPOINT = 'https://formspree.io/f/xgvzewbv';

// The window photo comes apart into layers (scripts/contact/window.py); this
// is their geometry, in photo pixels.
const WIN = {
  w: 752,
  h: 538,
  hingeL: 227.5,
  hingeR: 520,
  back: { top: 45.5, w: 146, h: 426 },
  leafL: [95, 24, 229, 476],
  leafR: [521, 24, 652, 478],
  opening: [240, 52, 512, 458],
};
const px = (v: number) => `${(v / WIN.w) * 100}%`;
const py = (v: number) => `${(v / WIN.h) * 100}%`;

// The plane's nose points this far above its image's x axis.
const NOSE = -24;

// Flight: a paper plane, thrown. Lengths are in "u", a thousandth of the
// distance from the plane to the window, so the throw feels the same at any
// size; time is in ms.
const G = 0.0016; // gravity, u/ms²
const DRAG = 0.00035; // per ms
const VMAX = 3.2; // u/ms at a full pull
const STEP = 8; // ms, fixed, so the preview is the flight

type Vec = { x: number; y: number };
type Pill = 'idle' | 'ready' | 'aim' | 'aimed' | 'flying' | 'missed' | 'invalid' | 'sending' | 'sent' | 'failed';

const PILL: Record<Pill, string> = {
  idle: 'Drag and aim for the window',
  ready: 'Drag and aim for the window',
  aim: 'Aim for the window',
  aimed: 'Let it fly',
  flying: 'Whoosh',
  missed: 'So close. Try again',
  invalid: 'Your name and email first',
  sending: 'Delivering',
  sent: 'Got it. Talk soon!',
  failed: 'It bounced. Try again',
};

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Everything a throw needs, in the frame's coordinates (px). */
type Geo = {
  home: Vec;
  open: { x0: number; y0: number; x1: number; y1: number };
  frame: { x0: number; y0: number; x1: number; y1: number };
  target: Vec;
  u: number;
  D: number;
  w: number;
  h: number;
  /** Phones: anywhere on the window counts, and the plane is drawn to it. */
  easy: { x0: number; y0: number; x1: number; y1: number } | null;
};
type Hit = 'in' | 'bonk' | 'out' | null;

function hitTest(g: Geo, p: Vec): Hit {
  const { open: o, frame: f, easy: e } = g;
  if (e && p.x > e.x0 && p.x < e.x1 && p.y > e.y0 && p.y < e.y1) return 'in';
  if (p.x > o.x0 && p.x < o.x1 && p.y > o.y0 && p.y < o.y1) return 'in';
  if (p.x > f.x0 && p.x < f.x1 && p.y > f.y0 && p.y < f.y1) return 'bonk';
  if (p.x < -80 || p.x > g.w + 80 || p.y > g.h + 80 || p.y < -g.h) return 'out';
  return null;
}

/** One fixed step of flight, in px. */
function step(g: Geo, p: Vec, v: Vec) {
  const d = 1 - DRAG * STEP;
  v.x *= d;
  v.y = v.y * d + G * g.u * STEP;
  if (g.easy) {
    // On a phone the window is small and the throw is short: once a plane
    // is headed its way and getting close, it is drawn in. Part of the
    // flight, so the preview shows it too.
    const tx = g.target.x - p.x;
    const ty = g.target.y - p.y;
    const dist = Math.hypot(tx, ty);
    const speed = Math.hypot(v.x, v.y);
    if (dist < g.D * 0.8 && speed > 0 && v.x * tx + v.y * ty > 0) {
      const k = 0.05;
      const nx = (v.x / speed) * (1 - k) + (tx / dist) * k;
      const ny = (v.y / speed) * (1 - k) + (ty / dist) * k;
      const n = Math.hypot(nx, ny) || 1;
      v.x = (nx / n) * speed;
      v.y = (ny / n) * speed;
    }
  }
  p.x += v.x * STEP;
  p.y += v.y * STEP;
}

/** The whole path for a launch from `from`, as the preview draws it. */
function simulate(g: Geo, v0: Vec, from: Vec, maxMs = 2400) {
  const p = { ...from };
  const v = { ...v0 };
  const pts: Vec[] = [{ ...p }];
  let hit: Hit = null;
  for (let t = 0; t < maxMs; t += STEP) {
    step(g, p, v);
    pts.push({ ...p });
    hit = hitTest(g, p);
    if (hit) break;
  }
  return { pts, hit };
}

/** n points spread evenly along a path. */
function spread(pts: Vec[], n: number) {
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = len[len.length - 1];
  const out: Vec[] = [];
  let j = 0;
  for (let k = 1; k <= n; k++) {
    const d = (total * k) / n;
    while (j < len.length - 2 && len[j + 1] < d) j++;
    const t = (d - len[j]) / (len[j + 1] - len[j] || 1);
    out.push({ x: pts[j].x + (pts[j + 1].x - pts[j].x) * t, y: pts[j].y + (pts[j + 1].y - pts[j].y) * t });
  }
  return out;
}

function drawDots(svg: SVGSVGElement, pts: Vec[], hit: Hit) {
  const dots = svg.children;
  // Spread along the flight; on target they run all the way in, otherwise
  // they thin out toward the end.
  const at = pts.length > 1 ? spread(pts, dots.length) : [];
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i] as SVGCircleElement;
    const p = at[i];
    if (!p) {
      d.setAttribute('opacity', '0');
      continue;
    }
    d.setAttribute('cx', p.x.toFixed(1));
    d.setAttribute('cy', p.y.toFixed(1));
    const f = i / dots.length;
    d.setAttribute('opacity', (hit === 'in' ? 0.95 : 0.55 * (1 - f * f)).toFixed(2));
  }
  svg.dataset.on = String(hit === 'in');
}

function clearDots(svg: SVGSVGElement | null) {
  if (!svg) return;
  for (const d of Array.from(svg.children)) d.setAttribute('opacity', '0');
}

/** The window: him, the room, and two shutters that really swing. */
function useWindow() {
  const root = useRef<HTMLDivElement>(null);
  const anims = useRef<Animation[]>([]);

  const run = useCallback((closing: boolean, fast = false) => {
    const el = root.current;
    if (!el) return Promise.resolve();
    const q = (s: string) => el.querySelector<HTMLElement>(s)!;
    const leafL = q('.cx-leaf-l');
    const leafR = q('.cx-leaf-r');
    const people = [q('.cx-scene'), q('.cx-hands')];
    const fronts = [q('.cx-leaf-l .cx-face'), q('.cx-leaf-r .cx-face')];
    const backs = [q('.cx-leaf-l .cx-back img'), q('.cx-leaf-r .cx-back img')];
    const k = reduced() ? 0.001 : fast ? 0.6 : 1;
    const prev = anims.current;
    const next: Animation[] = [];
    const add = (a: Animation) => (next.push(a), a);

    if (closing) {
      // He steps back into the room, then the shutters swing to and slam,
      // the second a beat behind the first, and bounce off the frame.
      people.forEach((p) => add(p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420 * k, delay: 60 * k, easing: 'ease-in-out', fill: 'both' })));
      const swing = (leaf: HTMLElement, s: number, delay: number) => {
        add(leaf.animate(
          [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${180 * s}deg)` }],
          { duration: 560 * k, delay: delay * k, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'both' },
        ));
        add(leaf.animate(
          [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${-9 * s}deg)`, offset: 0.28 }, { transform: 'rotateY(0deg)', offset: 0.58 }, { transform: `rotateY(${-2.5 * s}deg)`, offset: 0.8 }, { transform: 'rotateY(0deg)' }],
          { duration: 520 * k, delay: (delay + 560) * k, easing: 'linear', composite: 'add', fill: 'both' },
        ));
      };
      swing(leafL, 1, 120);
      swing(leafR, -1, 190);
      // Light: a face darkens as it turns edge-on (the swing passes 90° about
      // three quarters of the way through) and the closed face comes up.
      fronts.forEach((f, i) => add(f.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(.5)' }], { duration: 230 * k, delay: (330 + i * 70) * k, easing: 'ease-in', fill: 'both' })));
      backs.forEach((b, i) => add(b.animate([{ filter: 'brightness(.5)' }, { filter: 'brightness(1)' }], { duration: 200 * k, delay: (560 + i * 70) * k, easing: 'ease-out', fill: 'both' })));
      // The slam goes through the frame.
      add(el.animate(
        [{ transform: 'translate(0,0)' }, { transform: 'translate(.6px,.3px)' }, { transform: 'translate(-.5px,0)' }, { transform: 'translate(.2px,0)' }, { transform: 'translate(0,0)' }],
        { duration: 240 * k, delay: 680 * k },
      ));
    } else {
      // He pushes them open, unhurried, and leans back out.
      const swing = (leaf: HTMLElement, s: number, delay: number) =>
        add(leaf.animate(
          [{ transform: `rotateY(${180 * s}deg)` }, { transform: 'rotateY(0deg)' }],
          { duration: 1050 * k, delay: delay * k, easing: 'cubic-bezier(.45,0,.15,1)', fill: 'both' },
        ));
      swing(leafL, 1, 0);
      swing(leafR, -1, 90);
      backs.forEach((b, i) => add(b.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(.5)' }], { duration: 420 * k, delay: i * 90 * k, easing: 'ease-in', fill: 'both' })));
      fronts.forEach((f, i) => add(f.animate([{ filter: 'brightness(.45)' }, { filter: 'brightness(1)' }], { duration: 560 * k, delay: (480 + i * 90) * k, easing: 'ease-out', fill: 'both' })));
      people.forEach((p) => add(p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520 * k, delay: 640 * k, easing: 'ease-out', fill: 'both' })));
    }
    // Each new animation starts where the old one left off and holds its
    // start through any delay (fill: both), so the old can go at once.
    prev.forEach((a) => a.cancel());
    anims.current = next;
    el.dataset.shut = String(closing);
    return Promise.all(next.map((a) => a.finished.catch(() => {}))).then(() => {});
  }, []);

  return useMemo(() => ({ root, close: () => run(true), open: (fast?: boolean) => run(false, fast) }), [run]);
}

function Shutter({ side }: { side: 'l' | 'r' }) {
  const [x0, y0, x1, y1] = side === 'l' ? WIN.leafL : WIN.leafR;
  const hinge = side === 'l' ? WIN.hingeL : WIN.hingeR;
  const w = x1 - x0;
  const h = y1 - y0;
  // The closed face sits on the far side of the hinge, turned away; swinging
  // the leaf through 180° brings it round over the opening. A pixel of
  // overlap where the two meet.
  const bw = WIN.back.w + 1;
  const bx = side === 'l' ? hinge - bw : hinge;
  return (
    <div
      className={`cx-leaf cx-leaf-${side}`}
      style={{
        left: px(x0),
        top: py(y0),
        width: px(w),
        height: py(h),
        transformOrigin: `${((hinge - x0) / w) * 100}% 50%`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cx-face" src={`/contact/leaf-${side}.webp`} alt="" draggable={false} />
      <div
        className="cx-back"
        style={{
          left: `${((bx - x0) / w) * 100}%`,
          top: `${((WIN.back.top - y0) / h) * 100}%`,
          width: `${(bw / w) * 100}%`,
          height: `${(WIN.back.h / h) * 100}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/contact/back-${side}.webp`} alt="" draggable={false} />
      </div>
    </div>
  );
}

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<SVGSVGElement>(null);
  const win = useWindow();

  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [pill, setPill] = useState<Pill>('idle');
  const [valid, setValid] = useState(false);
  const busy = useRef(false); // a plane is in the air, or in the room
  const pillTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = useCallback((p: Pill, revertAfter?: number) => {
    clearTimeout(pillTimer.current);
    setPill(p);
    if (revertAfter) pillTimer.current = setTimeout(() => setPill('idle'), revertAfter);
  }, []);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };
  useEffect(() => {
    setValid(!!formRef.current?.checkValidity());
  }, [form]);

  // Entrance: the copy rises in; he opens the shutters to see who's there.
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        root.dataset.in = 'true';
        setTimeout(() => win.open(), reduced() ? 0 : 450);
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [win]);

  // ------------------------------------------------------------ geometry
  /** Everything in the frame's coordinates, measured fresh for each throw. */
  const measure = useCallback((): Geo => {
    const sec = frameRef.current!.getBoundingClientRect();
    const plane = planeRef.current!;
    const pr = plane.getBoundingClientRect();
    const wr = win.root.current!.getBoundingClientRect();
    const [ox0, oy0, ox1, oy1] = WIN.opening;
    const sx = wr.width / WIN.w;
    const sy = wr.height / WIN.h;
    const home = { x: pr.left + pr.width / 2 - sec.left, y: pr.top + pr.height / 2 - sec.top };
    // Measured with the plane at rest; take out any transform still on it.
    const tr = getComputedStyle(plane).transform;
    if (tr && tr !== 'none') {
      const t = new DOMMatrix(tr);
      home.x -= t.e;
      home.y -= t.f;
    }
    const open = {
      x0: wr.left - sec.left + ox0 * sx,
      y0: wr.top - sec.top + oy0 * sy,
      x1: wr.left - sec.left + ox1 * sx,
      y1: wr.top - sec.top + oy1 * sy,
    };
    const frame = { x0: wr.left - sec.left + 213 * sx, y0: wr.top - sec.top + 24 * sy, x1: wr.left - sec.left + 545 * sx, y1: wr.top - sec.top + 498 * sy };
    const target = { x: (open.x0 + open.x1) / 2, y: (open.y0 + open.y1) / 2 };
    const D = Math.hypot(target.x - home.x, target.y - home.y);
    const pad = 14;
    const easy = window.matchMedia('(min-width: 1024px)').matches
      ? null
      : { x0: wr.left - sec.left - pad, y0: wr.top - sec.top - pad, x1: wr.right - sec.left + pad, y1: wr.bottom - sec.top + pad };
    return { home, open, frame, target, u: D / 1000, D, w: sec.width, h: sec.height, easy };
  }, [win.root]);

  // ------------------------------------------------------------ the plane
  const setPlane = (x: number, y: number, rot: number, scale = 1) => {
    planeRef.current!.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
  };

  const respawn = useCallback(async (delay = 0) => {
    const plane = planeRef.current!;
    await sleep(delay);
    plane.style.transition = 'none';
    plane.style.transform = '';
    plane.style.opacity = '';
    plane.animate(
      [{ transform: 'translate3d(0,-18px,0) rotate(-8deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: reduced() ? 1 : 520, easing: 'cubic-bezier(.16,1,.3,1)' },
    );
    plane.dataset.state = 'home';
    busy.current = false;
  }, []);

  const deliver = useCallback(async () => {
    say('sending');
    const send = fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(form),
    })
      .then((r) => r.ok)
      .catch(() => false);
    // He takes it in and shuts the window; it stays shut a moment.
    await win.close();
    const [ok] = await Promise.all([send, sleep(1900)]);
    if (ok) {
      say('sent', 5200);
      toast.success('Message delivered. Talk soon!');
      setForm({ name: '', email: '', message: '' });
    } else {
      say('failed', 3200);
      toast.error("Didn't go through. Try again.");
    }
    await win.open(true);
    respawn();
  }, [form, say, win, respawn]);

  /** Fly a launched plane; resolves with where it ended up. */
  const fly = useCallback((g: Geo, v0: Vec, from: Vec) => {
    const plane = planeRef.current!;
    plane.dataset.state = 'flying';
    say('flying');
    const p = { ...from };
    const v = { ...v0 };
    let acc = 0;
    let last = performance.now();
    let t = 0;
    return new Promise<Hit>((resolve) => {
      const frame = (now: number) => {
        acc += Math.min(now - last, 50);
        last = now;
        let hit: Hit = null;
        while (acc >= STEP && !hit) {
          step(g, p, v);
          acc -= STEP;
          t += STEP;
          hit = hitTest(g, p);
          if (t > 3200) hit = 'out';
        }
        const travelled = Math.min(1, Math.hypot(p.x - g.home.x, p.y - g.home.y) / g.D);
        const rot = (Math.atan2(v.y, v.x) * 180) / Math.PI - NOSE + Math.sin(t / 90) * 3;
        // Smaller as it goes: it's flying away from you, into the window.
        setPlane(p.x - g.home.x, p.y - g.home.y, rot, 1 - 0.3 * travelled);
        if (!hit) {
          requestAnimationFrame(frame);
          return;
        }
        const from = plane.style.transform;
        if (hit === 'in') {
          // Into the dark: a little further along, shrinking, gone.
          const dx = v.x * 60;
          const dy = v.y * 60;
          plane.animate(
            [{ transform: from, opacity: 1 }, { transform: `translate3d(${(p.x - g.home.x + dx).toFixed(1)}px,${(p.y - g.home.y + dy).toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg) scale(.12)`, opacity: 0 }],
            { duration: 380, easing: 'cubic-bezier(.4,0,.9,.6)', fill: 'forwards' },
          ).finished.then((a) => {
            plane.style.opacity = '0';
            a.cancel();
          });
        } else {
          // Off the frame, or off into nowhere: it drops away.
          const kick = hit === 'bonk' ? -0.35 : 1;
          plane.animate(
            [{ transform: from, opacity: 1 }, { transform: `translate3d(${(p.x - g.home.x + v.x * 120 * kick).toFixed(1)}px,${(p.y - g.home.y + 140).toFixed(1)}px,0) rotate(${(rot + 70).toFixed(1)}deg) scale(.8)`, opacity: 0 }],
            { duration: 620, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' },
          ).finished.then((a) => {
            plane.style.opacity = '0';
            a.cancel();
          });
        }
        resolve(hit);
      };
      requestAnimationFrame(frame);
    });
  }, [say]);

  const launch = useCallback(async (g: Geo, v0: Vec, from: Vec) => {
    const hit = await fly(g, v0, from);
    if (hit === 'in') deliver();
    else {
      say('missed', 2400);
      respawn(700);
    }
  }, [fly, deliver, say, respawn]);

  const refuse = useCallback(() => {
    formRef.current?.reportValidity();
    say('invalid', 2600);
    planeRef.current?.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(0)' }],
      { duration: 480, easing: 'ease-out' },
    );
  }, [say]);

  // Aim: drag from the plane toward where it should go. It cocks back
  // against the pull, the dotted line shows the flight, and letting go
  // throws it.
  const aim = useRef<{ g: Geo; id: number; start: Vec; v: Vec; from: Vec; maxPull: number; len: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busy.current || e.button !== 0) return;
    if (!formRef.current?.checkValidity()) {
      refuse();
      return;
    }
    e.preventDefault();
    const g = measure();
    aim.current = { g, id: e.pointerId, start: { x: e.clientX, y: e.clientY }, v: { x: 0, y: 0 }, len: 0, from: { ...g.home }, maxPull: Math.min(Math.max(g.D * 0.3, 110), 260) };
    e.currentTarget.setPointerCapture(e.pointerId);
    planeRef.current!.dataset.state = 'aiming';
    say('aim');
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = aim.current;
    if (!a || e.pointerId !== a.id) return;
    let dx = e.clientX - a.start.x;
    let dy = e.clientY - a.start.y;
    const len = Math.hypot(dx, dy);
    a.len = len;
    if (len > a.maxPull) {
      dx *= a.maxPull / len;
      dy *= a.maxPull / len;
    }
    const pull = Math.min(len, a.maxPull) / a.maxPull;
    // On a phone every pull is a sensible throw: the range is narrowed to
    // the speeds that reach the window.
    const power = a.g.easy ? 0.42 + pull * 0.36 : pull;
    // (dx, dy) is clamped to maxPull by now: its direction, at full length.
    const l = Math.min(len, a.maxPull) || 1;
    a.v = { x: (dx / l) * power * VMAX * a.g.u, y: (dy / l) * power * VMAX * a.g.u };
    const rot = len > 4 ? (Math.atan2(dy, dx) * 180) / Math.PI - NOSE : 0;
    // Cocked back against the throw, a little; it flies from there.
    setPlane(-dx * 0.14, -dy * 0.14, rot, 1 + power * 0.06);
    a.from = { x: a.g.home.x - dx * 0.14, y: a.g.home.y - dy * 0.14 };
    const { pts, hit } = simulate(a.g, a.v, a.from);
    drawDots(dotsRef.current!, len > 24 ? pts : [], hit);
    const aimed = len > 24 && hit === 'in';
    win.root.current!.dataset.aimed = String(aimed);
    setPill(aimed ? 'aimed' : 'aim');
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = aim.current;
    if (!a || e.pointerId !== a.id) return;
    aim.current = null;
    clearDots(dotsRef.current);
    win.root.current!.dataset.aimed = 'false';
    const speed = Math.hypot(a.v.x, a.v.y) / a.g.u;
    if (a.len < 24 || speed < VMAX * 0.12) {
      // Barely pulled: it settles back.
      const plane = planeRef.current!;
      plane.animate([{ transform: plane.style.transform }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
      plane.style.transform = '';
      plane.dataset.state = 'home';
      say('idle');
      return;
    }
    busy.current = true;
    launch(a.g, a.v, a.from);
  };

  /** The button (and Enter): a throw worked out to land in the window. */
  const autoThrow = useCallback(async () => {
    const g = measure();
    const base = Math.atan2(g.target.y - g.home.y, g.target.x - g.home.x);
    let best: Vec | null = null;
    // Lob it: try launch angles above the straight line, and for each the
    // speed that lands nearest the middle of the opening.
    for (let lift = 0.2; lift < 0.8 && !best; lift += 0.05) {
      const ang = base - lift;
      let lo = 0.15;
      let hi = 1;
      for (let i = 0; i < 18; i++) {
        const s = (lo + hi) / 2;
        const v = { x: Math.cos(ang) * s * VMAX * g.u, y: Math.sin(ang) * s * VMAX * g.u };
        const p = { ...g.home };
        const vv = { ...v };
        let reached = false;
        for (let t = 0; t < 2600; t += STEP) {
          step(g, p, vv);
          if ((p.x - g.target.x) * Math.sign(g.target.x - g.home.x) >= 0) {
            reached = true;
            break;
          }
          if (p.y > g.h + 80) break;
        }
        // Past the opening's centre line: high or low decides the speed.
        if (!reached || p.y > g.target.y) lo = s;
        else hi = s;
      }
      const s = (lo + hi) / 2;
      const v = { x: Math.cos(ang) * s * VMAX * g.u, y: Math.sin(ang) * s * VMAX * g.u };
      if (simulate(g, v, g.home).hit === 'in') best = v;
    }
    if (!best) return false;
    busy.current = true;
    // Show the aim, cock it back, let go.
    const v = best;
    const { pts } = simulate(g, v, g.home);
    const rot = (Math.atan2(v.y, v.x) * 180) / Math.PI - NOSE;
    if (!reduced()) {
      drawDots(dotsRef.current!, pts, 'in');
      win.root.current!.dataset.aimed = 'true';
      setPill('aimed');
      const plane = planeRef.current!;
      await plane.animate(
        [{ transform: 'none' }, { transform: `rotate(${rot}deg) scale(1.05)` }],
        { duration: 420, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' },
      ).finished.then((a) => {
        plane.style.transform = getComputedStyle(plane).transform;
        a.cancel();
      });
      clearDots(dotsRef.current);
      win.root.current!.dataset.aimed = 'false';
    }
    launch(g, v, g.home);
    return true;
  }, [measure, launch, win.root]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    autoThrow().then((ok) => {
      if (!ok) deliverDirect();
    });
  };
  // If no throw can reach (a layout too cramped to aim in), just send it.
  const deliverDirect = () => {
    busy.current = true;
    planeRef.current!.style.opacity = '0';
    deliver();
  };

  const pillKey = useRef(0);
  const lastPill = useRef(pill);
  if (lastPill.current !== pill && PILL[lastPill.current] !== PILL[pill]) pillKey.current++;
  lastPill.current = pill;
  const label = pill === 'idle' && valid ? PILL.ready : PILL[pill];

  return (
    <section id="contact" ref={sectionRef} className="cx" data-in="false">
      <div ref={frameRef} className="cx-frame">
        <h2 className="cx-title cx-rise" style={{ '--d': 0 } as React.CSSProperties}>
          <span className="cx-br" aria-hidden="true">[</span>Contact<span className="cx-br" aria-hidden="true">]</span>
        </h2>
        <p className="cx-lede cx-rise" style={{ '--d': 1 } as React.CSSProperties}>
          Have a project, an idea, or just want to <br className="cx-br-d" />
          say hello? I&apos;d love to hear from you.
        </p>

        <form ref={formRef} onSubmit={onSubmit} className="cx-form" noValidate={false}>
          <label className="cx-field cx-name cx-rise" style={{ '--d': 2 } as React.CSSProperties}>
            <span className="cx-label">Name<i aria-hidden="true">*</i></span>
            <input type="text" name="name" required autoComplete="name" value={form.name} onChange={update('name')} />
            <span className="cx-line" aria-hidden="true" />
          </label>
          <label className="cx-field cx-email cx-rise" style={{ '--d': 2.5 } as React.CSSProperties}>
            <span className="cx-label">Email ID<i aria-hidden="true">*</i></span>
            <input type="email" name="email" required autoComplete="email" value={form.email} onChange={update('email')} />
            <span className="cx-line" aria-hidden="true" />
          </label>
          <label className="cx-field cx-msg cx-rise" style={{ '--d': 3 } as React.CSSProperties}>
            <span className="cx-label">Message:</span>
            <textarea name="message" rows={3} value={form.message} onChange={update('message')} />
            <span className="cx-line" aria-hidden="true" />
          </label>

          <div
            ref={planeRef}
            className="cx-plane cx-rise"
            style={{ '--d': 4 } as React.CSSProperties}
            data-state="home"
            data-ready={valid}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/plane.png" alt="" draggable={false} />
          </div>
          <button type="submit" className="cx-pill cx-rise" style={{ '--d': 4.5 } as React.CSSProperties} data-state={pill} aria-label={`${label}. Sends your message.`}>
            <span key={pillKey.current} className="cx-pill-text" aria-live="polite">
              {label}
            </span>
          </button>

          <div ref={win.root} className="cx-window" data-shut="true" data-aimed="false" aria-hidden="true">
            {/* eslint-disable @next/next/no-img-element */}
            <img className="cx-room" src="/contact/room.webp" alt="" draggable={false} />
            <img className="cx-scene" src="/contact/scene.webp" alt="" draggable={false} />
            <Shutter side="l" />
            <Shutter side="r" />
            <img className="cx-hands" src="/contact/hands.webp" alt="" draggable={false} />
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </form>

        <svg ref={dotsRef} className="cx-dots" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} r={i < 3 ? 1.6 : 2.1} opacity="0" />
          ))}
        </svg>

        <footer className="cx-foot">
          <p>© {new Date().getFullYear()} Goutham Gopinath</p>
          <p className="cx-foot-mid">AI Full Stack Developer &amp; Product Designer</p>
          <a href="#" className="cx-top">
            Back to top
            <ArrowUpRight className="cx-top-arrow" strokeWidth={1.75} aria-hidden="true" />
          </a>
        </footer>
      </div>
    </section>
  );
}
