"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import MinimalNav from "../components/layout/navbar";
import TransitionLink from "../components/layout/transition-link";
import BracketHeading from "../components/layout/bracket-heading";
import { CASES } from "./cases";

/**
 * Case Studies: a case file on the right holding one index card per
 * product. Pick a card and it lifts out of the folder and flies to the left
 * page, where its case study opens. The address keeps the open file
 * (/casestudies#ztudylock), so a case can be linked to directly.
 */

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About me", href: "/#about" },
  { label: "Projects", href: "/projects" },
];

// Each card's resting tilt on the folder.
const TILT = [-2.5, 2, 1.5, -2, -1];

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (n) => String(n).padStart(2, "0");

/** The product's mark on its tile (Ideako's robot and the avatar stand alone). */
function Mark({ c }) {
  return (
    <span className={`cs-mark ${c.bare ? "cs-mark-bare" : ""}`} style={{ "--tile": c.tile }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.icon} alt="" draggable={false} loading="lazy" decoding="async" />
    </span>
  );
}

/** An index card: number, mark, name. */
function Card({ c, n }) {
  return (
    <span className="cs-card">
      <span className="cs-card-top">
        <span>{pad(n + 1)}</span>
        <span>*</span>
      </span>
      <Mark c={c} />
      <span className="cs-card-name">{c.name}</span>
      <span className="cs-card-tag">{c.tagline}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  The left page                                                      */
/* ------------------------------------------------------------------ */

function Intro() {
  return (
    <div className="cs-view" key="intro">
      <p className="cs-in cs-kicker" style={{ "--i": 0 }}>
        Case file &mdash; {pad(CASES.length)} products
      </p>
      <p className="cs-in cs-lead" style={{ "--i": 1 }}>
        Five products, filed the way I&rsquo;d hand them to you: the reason each one exists, and the calls made
        along the way.
      </p>
      <p className="cs-in cs-p" style={{ "--i": 2 }}>
        Every file covers the problem, what was built, how it flows, the decisions behind it, and what comes next.
      </p>
      <p className="cs-in cs-hint" style={{ "--i": 3 }}>
        <span className="cs-hint-d">Pick a file</span>
        <span className="cs-hint-m">Pick a file above</span>
        <ArrowRight className="cs-hint-arrow" strokeWidth={1.5} aria-hidden="true" />
      </p>
    </div>
  );
}

function CaseView({ c, index, total, slotRef, landed, onNext }) {
  const next = CASES[(index + 1) % total];
  return (
    <article className="cs-view" aria-labelledby="cs-title">
      <div className="cs-in cs-file-row" style={{ "--i": 0 }}>
        <span ref={slotRef} className="cs-slot" data-landed={landed}>
          <Mark c={c} />
        </span>
        <span className="cs-kicker">
          File {pad(index + 1)} &mdash; {pad(total)}
        </span>
      </div>

      <h2 id="cs-title" tabIndex={-1} className="cs-in cs-name" style={{ "--i": 1 }}>
        {c.name}
      </h2>
      <p className="cs-in cs-tagline" style={{ "--i": 2 }}>
        {c.tagline}
      </p>
      <p className="cs-in cs-brief" style={{ "--i": 3 }}>
        {c.brief}
      </p>

      <dl className="cs-in cs-meta" style={{ "--i": 4 }}>
        <div>
          <dt>Role</dt>
          <dd>{c.role}</dd>
        </div>
        <div>
          <dt>Stack</dt>
          <dd>{c.stack.join(", ")}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className="cs-live-dot" aria-hidden="true" />
            Live
          </dd>
        </div>
      </dl>

      <section className="cs-in cs-sec" style={{ "--i": 5 }}>
        <h3>
          <span>01</span>Problem
        </h3>
        <p>{c.problem}</p>
      </section>

      <section className="cs-in cs-sec" style={{ "--i": 6 }}>
        <h3>
          <span>02</span>What I built
        </h3>
        <p>{c.built}</p>
      </section>

      <section className="cs-in cs-sec" style={{ "--i": 7 }}>
        <h3>
          <span>03</span>Flow
        </h3>
        <ol className="cs-flow">
          {c.flow.map((s, i) => (
            <li key={s} style={{ "--s": i }}>
              {s}
            </li>
          ))}
        </ol>
      </section>

      <figure className={`cs-in cs-shot ${c.wide ? "cs-shot-wide" : ""}`} style={{ "--i": 8 }}>
        <Image
          src={c.screen}
          alt={`${c.name}, ${c.wide ? "the homepage" : "on a phone"}`}
          width={c.wide ? 1200 : 589}
          height={c.wide ? 630 : 1120}
          sizes={c.wide ? "(max-width: 767px) 88vw, 480px" : "(max-width: 767px) 52vw, 230px"}
        />
      </figure>

      <section className="cs-in cs-sec" style={{ "--i": 9 }}>
        <h3>
          <span>04</span>Decisions
        </h3>
        <ul className="cs-decisions">
          {c.decisions.map(([t, d]) => (
            <li key={t}>
              <b>{t}</b>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="cs-in cs-sec" style={{ "--i": 10 }}>
        <h3>
          <span>05</span>Next
        </h3>
        <p>{c.next}</p>
      </section>

      <div className="cs-in cs-links" style={{ "--i": 11 }}>
        <a href={c.live} target="_blank" rel="noopener noreferrer" className="cs-btn">
          {c.id === "portfolio" ? "You're on it" : "Open live"}
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        {c.code && (
          <a href={c.code} target="_blank" rel="noopener noreferrer" className="cs-textlink">
            Code
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>

      <button type="button" className="cs-in cs-next" style={{ "--i": 12 }} onClick={onNext}>
        <span className="cs-kicker">Next file</span>
        <span className="cs-next-name">
          {next.name}
          <ArrowRight className="cs-next-arrow" strokeWidth={1.5} aria-hidden="true" />
        </span>
      </button>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  The page                                                           */
/* ------------------------------------------------------------------ */

export default function CaseStudies() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(null); // index, or null for the intro
  const [landed, setLanded] = useState(true);
  const cardRefs = useRef([]);
  const slotRef = useRef(null);
  const leftRef = useRef(null);
  const folderRef = useRef(null);
  const flying = useRef(null);

  useEffect(() => {
    let alive = true;
    const go = () => alive && setReady(true);
    if (document.fonts?.ready) document.fonts.ready.then(go);
    else go();
    const t = setTimeout(go, 600);
    // Arrived at /casestudies#<file>: open it, without the flight.
    const at = CASES.findIndex((c) => `#${c.id}` === location.hash);
    if (at >= 0) setOpen(at);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  // A soft light on the folder follows the pointer, and the cards lean to it.
  useEffect(() => {
    const el = folderRef.current;
    if (!el || reduced()) return;
    let raf = 0;
    let p = { x: 0.5, y: 0.3 };
    const paint = () => {
      raf = 0;
      el.style.setProperty("--lx", `${(p.x * 100).toFixed(1)}%`);
      el.style.setProperty("--ly", `${(p.y * 100).toFixed(1)}%`);
      el.style.setProperty("--fx", (p.x - 0.5).toFixed(3));
      el.style.setProperty("--fy", (p.y - 0.5).toFixed(3));
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      p = { x: 0.5, y: 0.3 };
      if (!raf) raf = requestAnimationFrame(paint);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Keyboard and screen-reader users land on the case's title.
  const headFocus = () => document.getElementById("cs-title")?.focus({ preventScroll: true });

  const choose = useCallback(
    (i) => {
      if (i === open) return;
      flying.current?.remove();
      // On a narrow screen the case opens below the folder, and the page
      // goes down to it instead of the card flying there.
      const narrow = window.matchMedia("(max-width: 767px)").matches;
      const card = cardRefs.current[i];
      const from = card?.getBoundingClientRect();
      const fly = !reduced() && !narrow && from && from.width > 0;
      setLanded(!fly);
      setOpen(i);
      history.replaceState(history.state, "", `#${CASES[i].id}`);

      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (narrow) {
            const top = leftRef.current.getBoundingClientRect().top + window.scrollY - 24;
            if (window.__lenis) window.__lenis.scrollTo(top, { duration: 0.9 });
            else window.scrollTo({ top, behavior: reduced() ? "auto" : "smooth" });
          }
          if (!fly) return headFocus();
          const slot = slotRef.current;
          if (!slot) return setLanded(true);
          // The card lifts out of the folder, turns flat and shrinks into
          // the mark beside the title.
          const to = slot.getBoundingClientRect();
          const ghost = card.cloneNode(true);
          ghost.classList.add("cs-ghost");
          ghost.style.setProperty("--q", getComputedStyle(card).getPropertyValue("--q"));
          Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
          document.body.appendChild(ghost);
          flying.current = ghost;
          const dx = to.left + to.width / 2 - (from.left + from.width / 2);
          const dy = to.top + to.height / 2 - (from.top + from.height / 2);
          const k = to.width / from.width;
          const anim = ghost.animate(
            [
              { transform: `translate(0,0) rotate(${TILT[i]}deg) scale(1)`, boxShadow: "0 10px 24px -14px rgba(0,0,0,.35)" },
              { transform: `translate(${dx * 0.3}px, ${dy * 0.3 - 50}px) rotate(${TILT[i] - 5}deg) scale(1.06)`, boxShadow: "0 40px 60px -24px rgba(0,0,0,.35)", offset: 0.35 },
              { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${k * 1.4})`, opacity: 1, offset: 0.82 },
              { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${k})`, opacity: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" },
            ],
            { duration: 820, easing: "cubic-bezier(.5,0,.15,1)", fill: "forwards" }
          );
          setTimeout(() => setLanded(true), 640);
          anim.finished.then(
            () => {
              ghost.remove();
              if (flying.current === ghost) flying.current = null;
              headFocus();
            },
            () => {}
          );
        })
      );
    },
    [open]
  );

  useEffect(() => () => flying.current?.remove(), []);

  const c = open === null ? null : CASES[open];

  return (
    <main className="cs-page min-h-screen font-outfit text-black" data-ready={ready}>
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <TransitionLink
          href="/"
          aria-label="Home"
          className="transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105"
        >
          <Image src="/logo.png" width={40} height={40} alt="Goutham logo" priority className="invert" />
        </TransitionLink>
        <div className="hidden md:block md:fixed md:top-6 md:left-1/2 md:z-50 md:-translate-x-1/2">
          <MinimalNav items={NAV_ITEMS} initialActiveIndex={2} />
        </div>
        <TransitionLink
          href="/#contact"
          className="btn-tactile btn-tactile-dark group inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-5 text-sm font-medium text-white shadow-md hover:bg-[#1a1a1a]"
        >
          Contact
          <ArrowUpRight className="nudge-diag h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </TransitionLink>
      </nav>

      <header className="cs-rise flex justify-center pt-8 md:pt-16" style={{ "--i": 0 }}>
        <BracketHeading as="h1" dark className="font-anonymous-pro text-[34px] text-black md:text-7xl">
          Case Studies
        </BracketHeading>
      </header>

      <div className="cs-stage">
        <div ref={leftRef} className="cs-left" aria-live="polite">
          {c ? (
            <CaseView
              key={c.id}
              c={c}
              index={open}
              total={CASES.length}
              slotRef={slotRef}
              landed={landed}
              onNext={() => choose((open + 1) % CASES.length)}
            />
          ) : (
            <Intro />
          )}
        </div>

        <div className="cs-right">
          <div ref={folderRef} className="cs-folder cs-rise" style={{ "--i": 1 }}>
            <span className="cs-folder-tab" aria-hidden="true" />
            <span className="cs-folder-back" aria-hidden="true" />
            <span className="cs-sheet" aria-hidden="true" />
            <div className="cs-pocket">
              <span className="cs-light" aria-hidden="true" />
              <div className="cs-cards" role="group" aria-label="Case files">
                {CASES.map((cs, i) => (
                  <button
                    key={cs.id}
                    type="button"
                    className="cs-item"
                    data-open={open === i}
                    aria-pressed={open === i}
                    aria-label={`File ${pad(i + 1)}: ${cs.name}, ${cs.tagline}`}
                    style={{ "--r": `${TILT[i]}deg`, "--n": i }}
                    onClick={() => choose(i)}
                  >
                    <span className="cs-item-in" ref={(el) => (cardRefs.current[i] = el)}>
                      <Card c={cs} n={i} />
                    </span>
                  </button>
                ))}
              </div>
              <p className="cs-contents" aria-hidden="true">
                Contents of the case file
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
