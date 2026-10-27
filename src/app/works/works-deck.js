"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import TransitionLink from "../components/layout/transition-link";

const FORM_ENDPOINT = "https://formspree.io/f/xgvzewbv";

// Files in /public whose names have spaces and "&" in them.
const pub = (name) => `/${encodeURIComponent(name)}`;

const SERVICES = [
  {
    n: "01",
    name: "Brand & Creative",
    img: pub("Brand & Creative.png"),
    line: "We shape how your business looks, feels and connects with people.",
    tags: ["Branding", "Visual identity", "Graphic design", "Content creation"],
  },
  {
    n: "02",
    name: "Web & Digital",
    img: pub("Web & Digital.png"),
    line: "We design and build fast, beautiful websites and digital products.",
    tags: ["Websites", "Web apps", "UI/UX design", "E-commerce"],
  },
  {
    n: "03",
    name: "Digital Growth",
    img: pub("Digital Growth.png"),
    line: "We help the right people find your business, and keep them coming back.",
    tags: ["SEO", "Social media", "Performance marketing", "Analytics"],
  },
  {
    n: "04",
    name: "Software & AI",
    img: pub("software&Ai.png"),
    line: "We build custom software and AI that quietly does the heavy lifting.",
    tags: ["Custom software", "AI integration", "Automation", "Chatbots"],
  },
];

const SLIDES = [
  { id: "intro", title: "Ideas into digital impact :)", tone: "dark" },
  { id: "who", title: "Who we are", tone: "light" },
  { id: "services", title: "Our Services", tone: "dark" },
  { id: "contact", title: "Contact to get started", tone: "light" },
];


const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Arrow(props) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" {...props}>
      <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScrollPill({ onClick }) {
  return (
    <button type="button" className="wk-scroll wk-rise" style={{ "--i": 3 }} onClick={onClick}>
      <span className="wk-scroll-fill" aria-hidden="true" />
      <span className="wk-scroll-text">
        Scroll <Arrow className="wk-arrow" />
      </span>
    </button>
  );
}

/* Slide 2: the avatar leans toward the pointer in 3D. */
function WhoFigure() {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height - 0.5) * -10).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(2)}deg`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className="wk-who-fig wk-rise" style={{ "--i": 1 }} onPointerMove={onMove} onPointerLeave={onLeave}>
      <Image src="/whoweare.png" width={859} height={902} alt="Goutham as a 3D character in sunglasses" sizes="(max-width: 767px) 50vw, 20vw" priority draggable={false} />
    </div>
  );
}

/* Slide 3: tabs on the left, the service card on the right. */
function Services() {
  const [active, setActive] = useState(0);
  const s = SERVICES[active];
  return (
    <div className="wk-svc">
      <div className="wk-keys wk-rise" style={{ "--i": 1 }}>
        <Image src="/1GCkeys.png" width={326} height={175} alt="Three keyboard keys: 1, G and a heart" sizes="160px" draggable={false} />
      </div>
      <h2 className="wk-svc-title wk-rise" style={{ "--i": 2 }}>Everything it takes to grow your business.</h2>
      <p className="wk-svc-copy wk-rise" style={{ "--i": 3 }}>
        From branding and digital experiences to custom software and AI,
        <br className="hidden md:inline" /> we bring the right ideas and technology together to help your business move forward.
      </p>

      <div className="wk-svc-body wk-rise" style={{ "--i": 4 }}>
        <div className="wk-tabs" role="tablist" aria-label="Services">
          {SERVICES.map((x, i) => (
            <button
              key={x.n}
              type="button"
              role="tab"
              id={`wk-tab-${x.n}`}
              aria-selected={active === i}
              aria-controls="wk-svc-panel"
              className="wk-tab"
              data-active={active === i}
              onClick={() => setActive(i)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
            >
              <span>({x.n})</span> {x.name}
            </button>
          ))}
        </div>

        <div id="wk-svc-panel" role="tabpanel" aria-labelledby={`wk-tab-${s.n}`} className="wk-svc-panel">
          <div className="wk-card">
            {SERVICES.map((x, i) => (
              <Image
                key={x.n}
                src={x.img}
                width={206}
                height={190}
                alt={i === active ? x.name : ""}
                sizes="120px"
                draggable={false}
                className="wk-card-img"
                data-active={i === active}
              />
            ))}
          </div>
          <div key={s.n} className="wk-card-copy">
            <p className="wk-card-line">{s.line}</p>
            <p className="wk-card-tags">{s.tags.join(" · ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Slide 4: the enquiry, written as a sentence. */
function Enquiry() {
  const [form, setForm] = useState({ name: "", reach: "", message: "" });
  const [picked, setPicked] = useState([]);
  const [status, setStatus] = useState("idle");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (name) => setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const submit = async (e) => {
    e.preventDefault();
    if (status !== "idle") return;
    if (!form.name.trim() || !form.reach.trim()) {
      toast.error("Tell me your name and where to reach you");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "1G-works enquiry",
          name: form.name,
          contact: form.reach,
          services: picked.join(", ") || "Not sure yet",
          message: form.message,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      toast.success("Enquiry sent. Talk soon!");
      setForm({ name: "", reach: "", message: "" });
      setPicked([]);
      setTimeout(() => setStatus("idle"), 3200);
    } catch {
      setStatus("idle");
      toast.error("Couldn't send it. Try again?");
    }
  };

  return (
    <form className="wk-form" onSubmit={submit}>
      <div className="wk-row wk-rise" style={{ "--i": 1 }}>
        <label className="wk-q" htmlFor="wk-name">What&rsquo;s your name?</label>
        <span className="wk-field wk-field-name">
          <input id="wk-name" autoComplete="name" value={form.name} onChange={set("name")} />
        </span>
        <label className="wk-q" htmlFor="wk-reach">Where can we reach you?</label>
        <span className="wk-field wk-grow">
          <input id="wk-reach" autoComplete="email" placeholder="" value={form.reach} onChange={set("reach")} />
        </span>
      </div>

      <div className="wk-row wk-rise" style={{ "--i": 2 }} role="group" aria-labelledby="wk-help">
        <span className="wk-q" id="wk-help">What can we help you with?</span>
        <span className="wk-opts">
          {SERVICES.map((x) => (
            <button
              key={x.n}
              type="button"
              className="wk-opt"
              aria-pressed={picked.includes(x.name)}
              data-on={picked.includes(x.name)}
              onClick={() => toggle(x.name)}
            >
              <span className="wk-opt-n">[{x.n}]</span>
              <span className="wk-opt-t">{x.name}</span>
            </button>
          ))}
        </span>
      </div>

      <div className="wk-row wk-rise" style={{ "--i": 3 }}>
        <label className="wk-q" htmlFor="wk-msg">Anything else we should know?</label>
        <span className="wk-field wk-grow">
          <input id="wk-msg" value={form.message} onChange={set("message")} />
        </span>
        <button type="submit" className="wk-send" data-status={status} disabled={status !== "idle"}>
          <span className="wk-scroll-fill" aria-hidden="true" />
          <span className="wk-scroll-text">
            {status === "sent" ? "Sent :)" : status === "sending" ? "Sending" : "Send enquiry"}
          </span>
        </button>
      </div>
    </form>
  );
}

/* "1G-works": the letters are inked in one by one, a scribble underlines
   them, and afterwards they lift toward the cursor like the contact title. */
function Wordmark() {
  const ref = useRef(null);
  const raf = useRef(0);
  const onMove = (e) => {
    if (e.pointerType !== "mouse" || reduceMotion() || raf.current) return;
    const h = ref.current;
    const cx = e.clientX;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      h?.querySelectorAll(".wk-ch").forEach((ch) => {
        const r = ch.getBoundingClientRect();
        const d = (r.left + r.width / 2 - cx) / 70;
        const k = Math.exp(-d * d);
        ch.style.setProperty("--lift", `${(-k * 0.18).toFixed(3)}em`);
        ch.style.setProperty("--tilt", `${(Math.sign(d) * k * -8).toFixed(2)}deg`);
      });
    });
  };
  const onLeave = () =>
    ref.current?.querySelectorAll(".wk-ch").forEach((ch) => {
      ch.style.removeProperty("--lift");
      ch.style.removeProperty("--tilt");
    });

  return (
    <h1 ref={ref} className="wk-mark font-hand" aria-label="1G-works" onPointerMove={onMove} onPointerLeave={onLeave}>
      {"1G-works".split("").map((c, i) => (
        <span key={i} className="wk-ch" style={{ "--i": i }} aria-hidden="true">
          <span>{c}</span>
        </span>
      ))}
      <svg className="wk-scribble" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
        <path d="M3 10.5C38 6 83 4.2 120 5.4c24 .8 46 2.4 62 4.6 6 .8 10 1.6 14 2.4" pathLength="1" />
      </svg>
    </h1>
  );
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const INTERACTIVE = "a, button, input, label, textarea, [role='tab']";

/**
 * 1G-works scrolls sideways. The four panels sit in a row and any vertical
 * input (wheel, trackpad, swipe, a mouse drag, the arrow keys) moves the
 * row; it eases after the input and settles on the nearest panel once you
 * let go, one panel per gesture. While it moves, each panel's content
 * trails a little behind its frame and leans with the speed.
 *
 * The nav and footer sit above in difference blend, so they flip between
 * white and black exactly where two panels meet. A panel taller than the
 * screen (phones) scrolls up and down on its own first.
 */
export default function WorksDeck() {
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const panelRefs = useRef([]);
  const innerRefs = useRef([]);
  const barRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const activeRef = useRef(0);
  const m = useRef({ cur: 0, target: 0, vel: 0, raf: 0, idle: 0, dir: 0, from: null, drag: null, touch: null, vw: 1, vh: 1 });

  const render = useCallback(() => {
    const s = m.current;
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = `translate3d(${(-s.cur * s.vw).toFixed(2)}px, 0, 0)`;
    const skew = clamp(-s.vel * 55, -3, 3);
    innerRefs.current.forEach((el, i) => {
      if (!el) return;
      const off = i - s.cur;
      if (Math.abs(off) > 1.2) return;
      el.style.transform = `translate3d(${(-off * 0.3 * s.vw).toFixed(1)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
      el.style.opacity = (1 - Math.min(Math.abs(off), 1) * 0.55).toFixed(3);
    });
    if (barRef.current) barRef.current.style.transform = `scaleX(${(s.cur / (SLIDES.length - 1)).toFixed(4)})`;
  }, []);

  const frame = useCallback(() => {
    const s = m.current;
    const prev = s.cur;
    s.cur += (s.target - s.cur) * (reduceMotion() ? 1 : 0.085);
    if (Math.abs(s.target - s.cur) < 0.0005) s.cur = s.target;
    s.vel = s.cur - prev;
    render();
    // The panel being headed for counts as active, so its copy is already
    // rising in as it slides into view.
    const a = Math.round(s.target);
    if (a !== activeRef.current) {
      setDir(a > activeRef.current ? 1 : -1);
      activeRef.current = a;
      setActive(a);
      window.history.replaceState(null, "", a === 0 ? window.location.pathname : `#${SLIDES[a].id}`);
    }
    s.raf = s.cur !== s.target ? requestAnimationFrame(frame) : 0;
    if (!s.raf) {
      s.vel = 0;
      render();
    }
  }, [render]);

  const setTarget = useCallback(
    (t) => {
      const s = m.current;
      // One panel per gesture, however hard the flick.
      const from = s.from ?? Math.round(s.cur);
      s.target = clamp(t, Math.max(0, from - 1), Math.min(SLIDES.length - 1, from + 1));
      if (!s.raf) s.raf = requestAnimationFrame(frame);
    },
    [frame]
  );

  const snap = useCallback(() => {
    const s = m.current;
    const base = Math.floor(s.target);
    const f = s.target - base;
    const t = s.dir > 0 ? (f > 0.14 ? base + 1 : base) : s.dir < 0 ? (f < 0.86 ? base : base + 1) : Math.round(s.target);
    setTarget(t);
    s.from = null;
  }, [setTarget]);

  const go = useCallback(
    (i) => {
      const s = m.current;
      s.dir = 0;
      s.from = i;
      setTarget(i);
      s.from = null;
    },
    [setTarget]
  );

  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setReady(true));
    const t = setTimeout(() => alive && setReady(true), 600);
    const s = m.current;
    const fit = () => {
      s.vw = window.innerWidth;
      s.vh = window.innerHeight;
      render();
    };
    fit();
    const fromHash = SLIDES.findIndex((x) => `#${x.id}` === window.location.hash);
    if (fromHash > 0) {
      s.cur = s.target = fromHash;
      activeRef.current = fromHash;
      setActive(fromHash);
      render();
    }
    window.addEventListener("resize", fit);
    return () => {
      alive = false;
      clearTimeout(t);
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(s.raf);
      clearTimeout(s.idle);
    };
  }, [render]);

  // Can the current panel still scroll itself in this direction?
  const innerScroll = (d) => {
    const el = panelRefs.current[activeRef.current];
    if (!el || el.scrollHeight <= el.clientHeight + 2) return false;
    return d > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 2 : el.scrollTop > 2;
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const s = m.current;
    const begin = () => {
      if (s.from == null) s.from = Math.round(s.cur);
    };
    const later = () => {
      clearTimeout(s.idle);
      s.idle = setTimeout(snap, 150);
    };

    const onWheel = (e) => {
      const vertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
      let d = vertical ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) d *= 16;
      if (vertical && innerScroll(Math.sign(d))) return;
      e.preventDefault();
      if (!d) return;
      begin();
      s.dir = Math.sign(d);
      setTarget(s.target + d / (s.vw * 0.75));
      later();
    };

    const onTouchStart = (e) => {
      const t = e.touches[0];
      clearTimeout(s.idle);
      s.touch = { x: t.clientX, y: t.clientY, t0: s.target, axis: null, lx: t.clientX, ly: t.clientY };
    };
    const onTouchMove = (e) => {
      const tc = s.touch;
      if (!tc) return;
      const t = e.touches[0];
      const dx = t.clientX - tc.x;
      const dy = t.clientY - tc.y;
      if (!tc.axis) {
        if (Math.hypot(dx, dy) < 8) return;
        tc.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (tc.axis === "y" && innerScroll(-Math.sign(dy))) tc.axis = "native";
      }
      if (tc.axis === "native") return;
      e.preventDefault();
      begin();
      const step = tc.axis === "x" ? (tc.lx - t.clientX) : (tc.ly - t.clientY);
      if (step) s.dir = Math.sign(step);
      tc.lx = t.clientX;
      tc.ly = t.clientY;
      const d = tc.axis === "x" ? -dx / s.vw : -dy / (s.vh * 0.8);
      setTarget(tc.t0 + d);
    };
    const onTouchEnd = () => {
      if (s.touch && s.touch.axis && s.touch.axis !== "native") snap();
      s.touch = null;
    };

    const onPointerDown = (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest(INTERACTIVE)) return;
      clearTimeout(s.idle);
      s.drag = { x: e.clientX, t0: s.target, lx: e.clientX, moved: false };
    };
    const onPointerMove = (e) => {
      const dg = s.drag;
      if (!dg) return;
      const dx = e.clientX - dg.x;
      if (!dg.moved && Math.abs(dx) < 4) return;
      if (!dg.moved) {
        dg.moved = true;
        root.dataset.dragging = "true";
        root.setPointerCapture(e.pointerId);
      }
      begin();
      if (e.clientX !== dg.lx) s.dir = Math.sign(dg.lx - e.clientX);
      dg.lx = e.clientX;
      setTarget(dg.t0 - (dx * 1.15) / s.vw);
    };
    const onPointerUp = () => {
      if (s.drag?.moved) snap();
      s.drag = null;
      delete root.dataset.dragging;
    };

    const onKey = (e) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      const i = Math.round(s.target);
      if (["ArrowDown", "ArrowRight", "PageDown"].includes(e.key) || (e.key === " " && !(t instanceof HTMLButtonElement))) {
        e.preventDefault();
        go(i + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === "Home") {
        go(0);
      } else if (e.key === "End") {
        go(SLIDES.length - 1);
      }
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [go, setTarget, snap]);

  const next = () => go(active + 1);
  const panel = (i, tone, children) => (
    <section
      ref={(el) => (panelRefs.current[i] = el)}
      className={`wk-panel ${tone === "dark" ? "wk-dark" : "wk-light"}`}
      data-state={active === i ? "active" : "idle"}
      aria-hidden={active !== i}
      aria-label={SLIDES[i].title}
    >
      <div ref={(el) => (innerRefs.current[i] = el)} className="wk-inner wk-center">
        {children}
      </div>
    </section>
  );

  return (
    <main ref={rootRef} className="works-page font-outfit" data-ready={ready} data-lenis-prevent>
      <div ref={trackRef} className="wk-track">
        {panel(
          0,
          "dark",
          <div className="wk-intro">
            <Wordmark />
            <ScrollPill onClick={next} />
          </div>
        )}

        {panel(
          1,
          "light",
          <div className="wk-who">
            <WhoFigure />
            <div className="wk-who-copy">
              <h2 className="wk-who-title wk-rise" style={{ "--i": 2 }}>
                Let&rsquo;s build your <strong>digital presence</strong>{" "}
                <strong className="wk-wink" aria-hidden="true">
                  ,&rsquo;<span className="wk-wink-eye">:</span>)
                </strong>
              </h2>
              <p className="wk-who-text wk-rise" style={{ "--i": 3 }}>
                We bring design, technology and AI together to help your business build a stronger online presence,
                reach the right audience and turn ideas into meaningful growth.
              </p>
              <ScrollPill onClick={next} />
            </div>
          </div>
        )}

        {panel(2, "dark", <Services />)}
        {panel(3, "light", <Enquiry />)}
      </div>

      {/* Chrome: drawn in white and blended by difference over the panels. */}
      <div className="wk-chrome">
        <TransitionLink href="/" aria-label="Home" className="wk-logo">
          <Image src="/logo.png" width={368} height={214} alt="Goutham logo" priority />
        </TransitionLink>

        <p className="wk-title" aria-live="polite">
          <span key={active} className="wk-title-text" data-dir={dir > 0 ? "down" : "up"}>
            {SLIDES[active].title}
          </span>
        </p>

        <button type="button" className="wk-contact btn-tactile" onClick={() => go(SLIDES.length - 1)}>
          Contact <Arrow className="wk-arrow" />
        </button>

        <span className="wk-progress" aria-hidden="true">
          <span ref={barRef} />
        </span>

        <p className="wk-foot-l">&copy; 2026 1GWorks. No rights reserved.</p>
        <TransitionLink href="/" className="wk-foot-r">
          1Goutham <s>Space</s> Works <Arrow className="wk-arrow" />
        </TransitionLink>
      </div>
    </main>
  );
}
