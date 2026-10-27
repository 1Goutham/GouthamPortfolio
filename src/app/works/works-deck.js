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
    img: pub("software&AI.png"),
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

const TRANSITION_MS = 1050;

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
      <Image src="/whoweare.png" width={1000} height={1182} alt="Goutham as a 3D character in sunglasses" sizes="(max-width: 767px) 50vw, 20vw" priority draggable={false} />
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
        <Image src="/1GKeys.png" width={600} height={267} alt="Three keyboard keys: 1, G and a heart" sizes="160px" draggable={false} />
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
                width={400}
                height={400}
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

/**
 * 1G-works. The page does not scroll: a wheel flick, a swipe or the arrow
 * keys move between four full-screen slides. The next slide wipes up over
 * the current one, which sinks back as it goes; going up, the current
 * slide peels down to uncover the one before. The nav and footer sit above
 * everything in difference blend, so they flip between white and black
 * along the wipe line.
 *
 * A slide whose content is taller than the screen (phones) scrolls on its
 * own first and only hands over at its top or bottom edge.
 */
export default function WorksDeck() {
  const rootRef = useRef(null);
  const slideRefs = useRef([]);
  const [ready, setReady] = useState(false);
  const [{ index, prev, dir }, setNav] = useState({ index: 0, prev: -1, dir: 1 });
  const lock = useRef({ until: 0, quiet: 0, acc: 0, accT: 0, touchY: null });
  const indexRef = useRef(0);
  indexRef.current = index;

  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setReady(true));
    const t = setTimeout(() => alive && setReady(true), 600);
    const fromHash = SLIDES.findIndex((s) => `#${s.id}` === window.location.hash);
    if (fromHash > 0) setNav({ index: fromHash, prev: -1, dir: 1 });
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  const go = useCallback((to) => {
    const from = indexRef.current;
    if (to < 0 || to >= SLIDES.length || to === from) return;
    const now = performance.now();
    if (now < lock.current.until) return;
    lock.current.until = now + (reduceMotion() ? 150 : TRANSITION_MS);
    setNav({ index: to, prev: from, dir: to > from ? 1 : -1 });
    const el = slideRefs.current[to];
    if (el) el.scrollTop = to > from ? 0 : el.scrollHeight;
    window.history.replaceState(null, "", to === 0 ? window.location.pathname : `#${SLIDES[to].id}`);
  }, []);

  // Can this slide still scroll itself in this direction?
  const innerScroll = (d) => {
    const el = slideRefs.current[indexRef.current];
    if (!el || el.scrollHeight <= el.clientHeight + 2) return false;
    return d > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 2 : el.scrollTop > 2;
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const d = Math.sign(e.deltaY);
      if (innerScroll(d)) return;
      e.preventDefault();
      const l = lock.current;
      const now = performance.now();
      // Trackpad momentum keeps firing after a change; wait for it to die
      // down before a new gesture can move again.
      if (now < l.until || now < l.quiet) {
        l.quiet = now + 160;
        l.acc = 0;
        return;
      }
      if (now - l.accT > 220) l.acc = 0;
      l.accT = now;
      l.acc += e.deltaY;
      if (Math.abs(l.acc) > 28) {
        l.acc = 0;
        l.quiet = now + 160;
        go(indexRef.current + d);
      }
    };

    const onTouchStart = (e) => {
      lock.current.touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e) => {
      const y0 = lock.current.touchY;
      lock.current.touchY = null;
      if (y0 == null) return;
      const dy = y0 - e.changedTouches[0].clientY;
      if (Math.abs(dy) < 50) return;
      const d = Math.sign(dy);
      if (innerScroll(d)) return;
      go(indexRef.current + d);
    };

    const onKey = (e) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !(t instanceof HTMLButtonElement))) {
        e.preventDefault();
        go(indexRef.current + 1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(indexRef.current - 1);
      } else if (e.key === "Home") {
        go(0);
      } else if (e.key === "End") {
        go(SLIDES.length - 1);
      }
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [go]);

  const stateOf = (i) => (i === index ? "active" : i === prev ? "leaving" : "idle");
  const next = () => go(index + 1);

  return (
    <main
      ref={rootRef}
      className="works-page font-outfit"
      data-ready={ready}
      data-dir={dir > 0 ? "down" : "up"}
      data-lenis-prevent
    >
      {/* Slide 1 */}
      <section ref={(el) => (slideRefs.current[0] = el)} className="wk-slide wk-dark" data-state={stateOf(0)} aria-hidden={index !== 0}>
        <div className="wk-inner wk-center">
          <div className="wk-intro">
            <h1 className="wk-mark font-hand wk-rise" style={{ "--i": 1 }}>
              <span className="wk-write">1G-works</span>
            </h1>
            <ScrollPill onClick={next} />
          </div>
        </div>
      </section>

      {/* Slide 2 */}
      <section ref={(el) => (slideRefs.current[1] = el)} className="wk-slide wk-light" data-state={stateOf(1)} aria-hidden={index !== 1}>
        <div className="wk-inner wk-center">
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
        </div>
      </section>

      {/* Slide 3 */}
      <section ref={(el) => (slideRefs.current[2] = el)} className="wk-slide wk-dark" data-state={stateOf(2)} aria-hidden={index !== 2}>
        <div className="wk-inner wk-center">
          <Services />
        </div>
      </section>

      {/* Slide 4 */}
      <section ref={(el) => (slideRefs.current[3] = el)} className="wk-slide wk-light" data-state={stateOf(3)} aria-hidden={index !== 3}>
        <div className="wk-inner wk-center">
          <Enquiry />
        </div>
      </section>

      {/* Chrome: drawn in white and blended by difference over the slides. */}
      <div className="wk-chrome" aria-label="Site">
        <TransitionLink href="/" aria-label="Home" className="wk-logo">
          <Image src="/logo.png" width={368} height={214} alt="Goutham logo" priority />
        </TransitionLink>

        <p className="wk-title" aria-live="polite">
          <span key={index} className="wk-title-text" data-dir={dir > 0 ? "down" : "up"}>
            {SLIDES[index].title}
          </span>
        </p>

        <button type="button" className="wk-contact btn-tactile" onClick={() => go(SLIDES.length - 1)}>
          Contact <Arrow className="wk-arrow" />
        </button>

        <p className="wk-foot-l">&copy; 2026 1GWorks. No rights reserved.</p>
        <TransitionLink href="/" className="wk-foot-r">
          1Goutham <s>Space</s> Works <Arrow className="wk-arrow" />
        </TransitionLink>
      </div>
    </main>
  );
}
