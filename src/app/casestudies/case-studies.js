"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Github } from "lucide-react";
import MinimalNav from "../components/layout/navbar";
import TransitionLink from "../components/layout/transition-link";
import BracketHeading from "../components/layout/bracket-heading";
import { CASES } from "./cases";

/**
 * Case Studies: a case file on the right, with one object per product lying
 * on it (a notebook, a study planner, a fabric swatch, a dossier, a
 * polaroid). Pick one up and it lifts out of the folder and flies over to
 * the left, where its case study opens. The address keeps the open file
 * (/casestudies#ztudylock), so a case can be linked to directly.
 */

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About me", href: "/#about" },
  { label: "Projects", href: "/projects" },
];

// Where each object lies on the folder, as a share of the pocket: x, y and
// a resting tilt. The label sits beside the object (side) or above it (top),
// as on a contents sheet.
const SPOTS = [
  { x: 9, y: 8, r: -4, label: "side" },
  { x: 57, y: 6, r: 3, label: "top" },
  { x: 9, y: 37, r: 2, label: "side" },
  { x: 57, y: 35, r: -3, label: "top" },
  { x: 9, y: 66, r: -2, label: "side" },
];

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (n) => String(n).padStart(2, "0");

/* ------------------------------------------------------------------ */
/*  The objects                                                        */
/* ------------------------------------------------------------------ */

/** The product's mark on its own tile (the coloured ones stand alone). */
function Mark({ c, className = "" }) {
  const bare = c.id === "ideako" || c.id === "portfolio";
  return (
    <span className={`cs-mark ${bare ? "cs-mark-bare" : ""} ${className}`} style={{ "--tile": c.tile }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.icon} alt="" draggable={false} loading="lazy" decoding="async" />
    </span>
  );
}

/** Each product as a thing you'd find in a case file, built in CSS. */
function Art({ c }) {
  switch (c.art) {
    case "notebook":
      return (
        <span className="cs-obj cs-notebook">
          <span className="cs-nb-page">
            <span className="cs-nb-band" />
            <Mark c={c} />
            <span className="cs-nb-scribble" />
          </span>
          <span className="cs-pen" />
        </span>
      );
    case "planner":
      return (
        <span className="cs-obj cs-planner">
          <span className="cs-pl-back" />
          <span className="cs-pl-card">
            <span className="cs-pl-grid">
              {Array.from({ length: 20 }, (_, i) => (
                <i key={i} data-on={[2, 5, 6, 9, 13, 14, 18].includes(i)} />
              ))}
            </span>
            <Mark c={c} />
          </span>
        </span>
      );
    case "swatch":
      return (
        <span className="cs-obj cs-swatch">
          <span className="cs-sw-cloth" />
          <span className="cs-sw-tag">
            <span className="cs-sw-hole" />
            <Mark c={c} />
          </span>
        </span>
      );
    case "dossier":
      return (
        <span className="cs-obj cs-dossier">
          <span className="cs-do-file">
            <Mark c={c} />
            <span className="cs-do-lines" />
          </span>
          <span className="cs-do-stamp">Verified</span>
        </span>
      );
    default:
      return (
        <span className="cs-obj cs-polaroid">
          <span className="cs-po-photo">
            <Mark c={c} />
          </span>
          <span className="cs-po-caption">1goutham.space</span>
        </span>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  The left page                                                      */
/* ------------------------------------------------------------------ */

function Intro() {
  return (
    <div className="cs-view" key="intro">
      <p className="cs-in cs-lead" style={{ "--i": 0 }}>
        A case study isn&rsquo;t a feature list. It&rsquo;s the reason a product exists, the calls made along the
        way, and what it&rsquo;s like to hold in your hand.
      </p>
      <p className="cs-in cs-p" style={{ "--i": 1 }}>
        So each product here is filed as an object: a notebook for the writer, a planner for the student, a swatch
        for the shop, a dossier for the idea on trial, and a polaroid of the site you&rsquo;re on.
      </p>
      <p className="cs-in cs-p" style={{ "--i": 2 }}>
        Every file covers the problem, what was built, how it flows, the decisions behind it, and where it goes
        next.
      </p>
      <p className="cs-in cs-hint" style={{ "--i": 3 }}>
        <span>
          Pick a file <span className="cs-hint-d">from the folder</span>
          <span className="cs-hint-m">above</span>
        </span>
        <svg viewBox="0 0 90 30" aria-hidden="true">
          <path d="M3 18c18-12 40-14 74-4m0 0-9-9m9 9-11 5" />
        </svg>
      </p>
    </div>
  );
}

function CaseView({ c, index, total, slotRef, landed, onNext }) {
  const headRef = useRef(null);
  return (
    <article className="cs-view" key={c.id} aria-labelledby="cs-title">
      <div className="cs-in cs-file-row" style={{ "--i": 0 }}>
        <span ref={slotRef} className="cs-slot" data-landed={landed}>
          <Mark c={c} />
        </span>
        <span className="cs-file-no">
          File {pad(index + 1)} <span>/ {pad(total)}</span>
        </span>
      </div>

      <h2 id="cs-title" ref={headRef} tabIndex={-1} className="cs-in cs-name" style={{ "--i": 1 }}>
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
          <dd>{c.stack.join(" · ")}</dd>
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
        <h3>[ The problem ]</h3>
        <p>{c.problem}</p>
      </section>

      <section className="cs-in cs-sec" style={{ "--i": 6 }}>
        <h3>[ What I built ]</h3>
        <p>{c.built}</p>
      </section>

      <section className="cs-in cs-sec" style={{ "--i": 7 }}>
        <h3>[ How it flows ]</h3>
        <ol className="cs-flow">
          {c.flow.map((s, i) => (
            <li key={s} style={{ "--s": i }}>
              <span>{pad(i + 1)}</span>
              {s}
            </li>
          ))}
        </ol>
      </section>

      <figure className={`cs-in cs-shot ${c.wide ? "cs-shot-wide" : ""}`} style={{ "--i": 8 }}>
        <span className="cs-tape" aria-hidden="true" />
        <Image
          src={c.screen}
          alt={`${c.name}, ${c.wide ? "the homepage" : "on a phone"}`}
          width={c.wide ? 1200 : 589}
          height={c.wide ? 630 : 1120}
          sizes={c.wide ? "(max-width: 767px) 86vw, 420px" : "(max-width: 767px) 46vw, 220px"}
        />
      </figure>

      <section className="cs-in cs-sec" style={{ "--i": 9 }}>
        <h3>[ Decisions ]</h3>
        <ul className="cs-decisions">
          {c.decisions.map(([t, d]) => (
            <li key={t}>
              <b>{t}</b>
              {d}
            </li>
          ))}
        </ul>
      </section>

      <section className="cs-in cs-sec" style={{ "--i": 10 }}>
        <h3>[ What&rsquo;s next ]</h3>
        <p>{c.next}</p>
      </section>

      <div className="cs-in cs-links" style={{ "--i": 11 }}>
        <a href={c.live} target="_blank" rel="noopener noreferrer" className="cs-btn cs-btn-dark">
          {c.id === "portfolio" ? "You're on it" : "Open live"}
          <ArrowUpRight className="nudge-diag h-4 w-4" strokeWidth={2} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        {c.code && (
          <a href={c.code} target="_blank" rel="noopener noreferrer" className="cs-btn">
            <Github className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Code
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
        <button type="button" className="cs-next" onClick={onNext}>
          <span className="bracket-link-l" aria-hidden="true">[</span>
          Next file
          <span className="bracket-link-r" aria-hidden="true">]</span>
        </button>
      </div>
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
  const artRefs = useRef([]);
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

  // The folder leans a touch toward the pointer.
  useEffect(() => {
    const el = folderRef.current;
    if (!el || reduced()) return;
    let raf = 0;
    let p = { x: 0, y: 0 };
    const paint = () => {
      raf = 0;
      el.style.setProperty("--fx", p.x.toFixed(3));
      el.style.setProperty("--fy", p.y.toFixed(3));
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      p = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      p = { x: 0, y: 0 };
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
      // goes down to it instead of the object flying there.
      const narrow = window.matchMedia("(max-width: 767px)").matches;
      const from = artRefs.current[i]?.getBoundingClientRect();
      const fly = !reduced() && !narrow && from && from.width > 0;
      setLanded(!fly);
      setOpen(i);
      history.replaceState(history.state, "", `#${CASES[i].id}`);

      // Once the new page is in, the object lifts off the folder and flies
      // to its slot beside the title, turning flat as it lands.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (narrow) {
            const top = leftRef.current.getBoundingClientRect().top + window.scrollY - 24;
            if (window.__lenis) window.__lenis.scrollTo(top, { duration: 0.9 });
            else window.scrollTo({ top, behavior: reduced() ? "auto" : "smooth" });
          }
          if (!fly) {
            headFocus();
            return;
          }
          const slot = slotRef.current;
          const art = artRefs.current[i];
          if (!slot || !art) return setLanded(true);
          const to = slot.getBoundingClientRect();
          const ghost = art.cloneNode(true);
          ghost.classList.add("cs-ghost");
          // The objects are sized in the folder's units; carry them over.
          ghost.style.setProperty("--q", getComputedStyle(art).getPropertyValue("--q"));
          Object.assign(ghost.style, {
            left: `${from.left}px`,
            top: `${from.top}px`,
            width: `${from.width}px`,
            height: `${from.height}px`,
          });
          document.body.appendChild(ghost);
          flying.current = ghost;
          const dx = to.left + to.width / 2 - (from.left + from.width / 2);
          const dy = to.top + to.height / 2 - (from.top + from.height / 2);
          const k = Math.min(to.width / from.width, to.height / from.height) * 1.6;
          const anim = ghost.animate(
            [
              { transform: `translate(0,0) rotate(${SPOTS[i].r}deg) scale(1)`, filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))" },
              { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 70}px) rotate(${-8 + SPOTS[i].r}deg) scale(1.12)`, filter: "drop-shadow(0 26px 22px rgba(0,0,0,.28))", offset: 0.35 },
              { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${k})`, filter: "drop-shadow(0 4px 6px rgba(0,0,0,.18))", opacity: 1, offset: 0.85 },
              { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${k * 0.6})`, opacity: 0 },
            ],
            { duration: 760, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" }
          );
          setTimeout(() => setLanded(true), 590);
          anim.finished.then(() => {
            ghost.remove();
            if (flying.current === ghost) flying.current = null;
            headFocus();
          }, () => {});
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

      <header className="cs-rise flex justify-center pt-10 md:pt-20" style={{ "--i": 0 }}>
        <BracketHeading as="h1" dark className="font-anonymous-pro text-4xl text-black md:text-7xl">
          Case Studies
        </BracketHeading>
      </header>

      <div className="cs-stage">
        {/* The left page: the intro, or the open file. */}
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
          <p className="cs-sign" aria-hidden="true">
            <span>@</span>1Goutham<br />
            Space
          </p>
        </div>

        {/* The case file. */}
        <div className="cs-right">
          <div ref={folderRef} className="cs-folder cs-rise" style={{ "--i": 1 }}>
            <span className="cs-folder-tab" aria-hidden="true" />
            <span className="cs-folder-back" aria-hidden="true" />
            <span className="cs-sheet" aria-hidden="true" />
            <div className="cs-pocket" role="group" aria-label="Case files">
              {CASES.map((cs, i) => (
                <button
                  key={cs.id}
                  type="button"
                  className="cs-item"
                  data-label={SPOTS[i].label}
                  data-open={open === i}
                  aria-pressed={open === i}
                  aria-label={`File ${pad(i + 1)}: ${cs.name}, ${cs.tagline}`}
                  style={{ "--x": `${SPOTS[i].x}%`, "--y": `${SPOTS[i].y}%`, "--r": `${SPOTS[i].r}deg`, "--n": i }}
                  onClick={() => choose(i)}
                >
                  <span className="cs-item-label" aria-hidden="true">
                    <b>{pad(i + 1)}</b>
                    <span>
                      /{cs.file}
                      <i>*</i>
                    </span>
                  </span>
                  <span className="cs-item-art" ref={(el) => (artRefs.current[i] = el)}>
                    <Art c={cs} />
                  </span>
                </button>
              ))}
              <p className="cs-contents" aria-hidden="true">
                Contents
                <br />
                of the case file
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
