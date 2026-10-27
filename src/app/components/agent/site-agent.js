"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { TARGETS_BY_ID } from "@/data/site-map";
import "./site-agent.css";

const CHIPS = ["Take me to his project page", "What’s in your kit?", "How can I reach you?"];
const STORE_KEY = "g-agent-chat";
const VEIL_MS = 420;

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Arrow(props) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" {...props}>
      <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* [label](url) links in a reply become real links; everything else is text. */
function Rich({ text }) {
  const parts = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer" className="ag-link">
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Resolve when `selector` exists on the page (or give up after `ms`). */
function waitFor(selector, ms = 4000) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (performance.now() - t0 > ms) return resolve(null);
      setTimeout(tick, 80);
    };
    tick();
  });
}

/** Bring an element to the middle of the screen, through Lenis when it runs. */
function scrollToEl(el) {
  const r = el.getBoundingClientRect();
  const h = Math.min(r.height, window.innerHeight * 0.8);
  const top = Math.max(0, r.top + window.scrollY - (window.innerHeight - h) / 2);
  const lenis = window.__lenis;
  if (lenis) lenis.scrollTo(top, { duration: reduceMotion() ? 0 : 1.2 });
  else window.scrollTo({ top, behavior: reduceMotion() ? "auto" : "smooth" });
  return new Promise((r2) => setTimeout(r2, reduceMotion() ? 50 : 900));
}

/**
 * The spotlight: the page dims except for a ring around the target, and a
 * note from the agent pops up beside it. It follows the element while the
 * page settles and lets go on the next click, scroll or after a few seconds.
 */
function Spotlight({ spot, onDone }) {
  const ringRef = useRef(null);
  const noteRef = useRef(null);

  useEffect(() => {
    if (!spot) return;
    let raf = 0;
    const place = () => {
      const r = spot.el.getBoundingClientRect();
      const pad = 10;
      const ring = ringRef.current;
      if (ring) {
        ring.style.transform = `translate3d(${r.left - pad}px, ${r.top - pad}px, 0)`;
        ring.style.width = `${r.width + pad * 2}px`;
        ring.style.height = `${r.height + pad * 2}px`;
      }
      const note = noteRef.current;
      if (note) {
        const below = r.bottom + 70 < window.innerHeight;
        const x = Math.min(Math.max(12, r.left + r.width / 2 - note.offsetWidth / 2), window.innerWidth - note.offsetWidth - 12);
        const y = below ? r.bottom + pad + 12 : r.top - pad - 12 - note.offsetHeight;
        note.style.transform = `translate3d(${x}px, ${Math.max(12, y)}px, 0)`;
      }
      raf = requestAnimationFrame(place);
    };
    place();
    const t = setTimeout(onDone, 5200);
    const armed = setTimeout(() => {
      window.addEventListener("pointerdown", onDone, { once: true });
      window.addEventListener("wheel", onDone, { once: true, passive: true });
      window.addEventListener("touchmove", onDone, { once: true, passive: true });
    }, 700);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      clearTimeout(armed);
      window.removeEventListener("pointerdown", onDone);
      window.removeEventListener("wheel", onDone);
      window.removeEventListener("touchmove", onDone);
    };
  }, [spot, onDone]);

  if (!spot) return null;
  return (
    <div className="ag-spot" key={spot.key} aria-hidden="true">
      <span ref={ringRef} className="ag-ring" />
      <span ref={noteRef} className="ag-note font-outfit">
        <span className="ag-note-face">
          <Image src="/agenticon.png" width={114} height={88} alt="" sizes="24px" />
        </span>
        {spot.note}
      </span>
    </div>
  );
}

/**
 * The G-Talk agent, stuck to the bottom-left of every page. Closed it is a
 * pill ("Hey! What's on your mind?"); opened it grows into a small chat
 * card. Replies can carry actions (see src/data/site-map.ts): it takes the
 * visitor to pages and sections, opens 1G-works panels, spotlights things,
 * and offers external links as buttons (a new tab can't be opened for them
 * after a network round trip without the browser blocking it).
 *
 * Cmd/Ctrl+K toggles it, Escape closes it. The conversation survives
 * navigation and reloads for the length of the visit.
 */
export default function SiteAgent() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState(false);
  const [spot, setSpot] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const rootRef = useRef(null);
  const pathRef = useRef(pathname);
  const veils = useRef([]);
  pathRef.current = pathname;

  // Restore the conversation for this visit.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
      if (Array.isArray(saved)) setMsgs(saved.slice(-20));
    } catch {
      /* nothing saved */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-20)));
    } catch {
      /* storage blocked */
    }
  }, [msgs]);

  // A finished navigation lifts any veil the agent laid down.
  useEffect(() => {
    const vs = veils.current.splice(0);
    const t = setTimeout(() => vs.forEach((v) => v.remove()), 60);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 380);
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const navigate = useCallback(
    (href) =>
      new Promise((resolve) => {
        if (reduceMotion()) {
          router.push(href);
          return resolve();
        }
        const v = document.createElement("span");
        v.className = "page-veil";
        v.setAttribute("aria-hidden", "true");
        document.body.appendChild(v);
        veils.current.push(v);
        setTimeout(() => {
          router.push(href);
          resolve();
        }, VEIL_MS);
      }),
    [router]
  );

  /** Carry out one action from a reply. */
  const run = useCallback(
    async (action) => {
      const t = TARGETS_BY_ID.get(action.target);
      if (!t || t.url) return;
      const here = pathRef.current;
      if (t.path === "/works" && here === "/works") {
        window.location.hash = t.hash || "";
        if (!t.hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
        return;
      }
      if (t.path && t.path !== here) {
        await navigate(t.hash ? `${t.path}#${t.hash}` : t.path);
        if (!t.selector) return;
      }
      if (!t.selector) return;
      const el = await waitFor(t.selector);
      if (!el) return;
      await scrollToEl(el);
      if (action.type === "point") {
        setSpot({ el, note: action.note || t.label, key: Date.now() });
      }
    },
    [navigate]
  );

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    setInput("");
    const history = msgs.slice(-8).map((m) => ({ role: m.role === "user" ? "user" : "model", text: m.text }));
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, path: pathRef.current }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.reply) {
        const reply = res.status === 429 ? "Too many questions at once. Give me a moment." : "I couldn’t reach my brain just now. Try again?";
        setMsgs((m) => [...m, { role: "agent", text: reply, actions: [] }]);
        return;
      }
      const actions = Array.isArray(data.actions) ? data.actions : [];
      setMsgs((m) => [...m, { role: "agent", text: data.reply, actions }]);
      const onSite = actions.filter((a) => a.type !== "open");
      if (onSite.length) {
        // On a phone the open card would cover what it is about to show.
        if (window.innerWidth < 768) setOpen(false);
        setActing(true);
        setTimeout(() => setActing(false), 900);
        // Let the reply land first, then move.
        await new Promise((r) => setTimeout(r, 450));
        for (const a of onSite) await run(a);
      }
    } catch {
      setMsgs((m) => [...m, { role: "agent", text: "Network hiccup. Try that again?", actions: [] }]);
    } finally {
      setBusy(false);
    }
  };

  const clearSpot = useCallback(() => setSpot(null), []);
  const route = pathname.startsWith("/works") ? "works" : pathname.startsWith("/margin") ? "margin" : "default";
  const empty = msgs.length === 0;

  return (
    <>
      <Spotlight spot={spot} onDone={clearSpot} />
      <div
        ref={rootRef}
        className="ag font-outfit"
        data-open={open}
        data-route={route}
        data-acting={acting}
        role={open ? "dialog" : undefined}
        aria-label="G-Talk agent"
      >
        <span className="ag-sheen" aria-hidden="true" />
        <span className="ag-noise" aria-hidden="true" />
        <button
          type="button"
          className="ag-head"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Minimise the G-Talk agent" : "Open the G-Talk agent"}
        >
          <span className="ag-face">
            <Image src="/agenticon.png" width={114} height={88} alt="" sizes="48px" priority draggable={false} />
            <span className="ag-online" aria-hidden="true" />
          </span>
          <span className="ag-label">
            <span className="ag-label-text">Hey! What&rsquo;s on your mind?</span>
            <span className="ag-go" aria-hidden="true">
              <Arrow className="ag-arrow" />
            </span>
          </span>
        </button>

        <div className="ag-body" aria-hidden={!open}>
          {empty ? (
            <div className="ag-intro">
              <div className="ag-logo">
                <Image src="/G-talk-logo.png" width={880} height={620} alt="G-Talk" sizes="160px" draggable={false} />
              </div>
              <div className="ag-chips">
                {CHIPS.map((c, i) => (
                  <button key={c} type="button" className="ag-chip" style={{ "--i": i }} onClick={() => send(c)} tabIndex={open ? 0 : -1}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={listRef} className="ag-list" aria-live="polite" data-lenis-prevent>
              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <p key={i} className="ag-msg ag-msg-user">
                    {m.text}
                  </p>
                ) : (
                  <div key={i} className="ag-msg ag-msg-agent">
                    <p>
                      <Rich text={m.text} />
                    </p>
                    {m.actions?.length > 0 && (
                      <div className="ag-acts">
                        {m.actions.map((a, j) => {
                          const t = TARGETS_BY_ID.get(a.target);
                          if (!t) return null;
                          return t.url ? (
                            <a key={j} href={t.url} target="_blank" rel="noopener noreferrer" className="ag-act" tabIndex={open ? 0 : -1}>
                              Open {t.label} <Arrow />
                            </a>
                          ) : (
                            <button key={j} type="button" className="ag-act" onClick={() => run(a)} tabIndex={open ? 0 : -1}>
                              {a.type === "point" ? "Show" : "Go to"} {t.label} <Arrow />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              )}
              {busy && (
                <p className="ag-msg ag-msg-agent ag-typing" aria-label="Thinking">
                  <span />
                  <span />
                  <span />
                </p>
              )}
            </div>
          )}

          <form
            className="ag-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type something to get started..."
              maxLength={500}
              aria-label="Ask the G-Talk agent"
              tabIndex={open ? 0 : -1}
            />
            <button type="submit" className="ag-send" disabled={busy || !input.trim()} aria-label="Send" tabIndex={open ? 0 : -1}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.5 8.2 13.2 3 10 13.4 7.8 9.1Z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
