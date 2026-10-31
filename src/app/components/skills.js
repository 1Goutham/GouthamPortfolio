"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import ScrollReveal from "./layout/scrollreveal";
import BracketHeading from "./layout/bracket-heading";

const TAGLINE = ["Engineering", "meets", "imagination."];

// The floating cards, placed on the portrait as in the mock: x/y are the
// card's left edge and vertical centre, as a share of the portrait's box
// (the full 1195x1444 artwork). depth sets how far each one drifts with the
// cursor, so they sit at different distances in front of him.
const CARDS = [
  { label: "AI Product Engineering", x: 53.7, y: 20.4, depth: 1.4 },
  { label: "Full-stack development", x: 0, y: 61.4, depth: 1 },
  { label: "Creative technology", x: 67.8, y: 88.6, depth: 1.8 },
];

export default function Skills() {
  const stageRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Cards drop in once, the first time the portrait is on screen.
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        stage.dataset.in = "true";
        io.disconnect();
      },
      { threshold: 0.3 }
    );
    io.observe(stage);
    if (still) return () => io.disconnect();

    // The cursor's place over the section, eased, as --px/--py in -1..1.
    const section = stage.closest("#skills");
    let tx = 0,
      ty = 0,
      x = 0,
      y = 0,
      raf = 0;
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      stage.style.setProperty("--px", x.toFixed(4));
      stage.style.setProperty("--py", y.toFixed(4));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const aim = (nx, ny) => {
      tx = nx;
      ty = ny;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const r = section.getBoundingClientRect();
      aim(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const onLeave = () => aim(0, 0);
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // A card can be pulled off him; let go and it springs back to its place.
  const onCardDown = (e) => {
    if (e.button !== 0) return;
    const card = e.currentTarget;
    const x0 = e.clientX,
      y0 = e.clientY;
    card.setPointerCapture(e.pointerId);
    card.dataset.drag = "true";
    const move = (ev) => {
      card.style.setProperty("--dx", `${ev.clientX - x0}px`);
      card.style.setProperty("--dy", `${ev.clientY - y0}px`);
      card.style.setProperty("--tilt", `${Math.max(-12, Math.min(12, (ev.clientX - x0) / 8))}deg`);
    };
    const up = () => {
      delete card.dataset.drag;
      card.style.setProperty("--dx", "0px");
      card.style.setProperty("--dy", "0px");
      card.style.setProperty("--tilt", "0deg");
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", up);
      card.removeEventListener("pointercancel", up);
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", up);
    card.addEventListener("pointercancel", up);
  };

  // From the keyboard: arrows nudge a card about, and it springs home when
  // the focus moves on (or on Escape).
  const home = (card) => {
    card.style.setProperty("--dx", "0px");
    card.style.setProperty("--dy", "0px");
    card.style.setProperty("--tilt", "0deg");
  };
  const onCardKey = (e) => {
    const card = e.currentTarget;
    if (e.key === "Escape") return home(card);
    const step = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, -14], ArrowDown: [0, 14] }[e.key];
    if (!step) return;
    e.preventDefault();
    const dx = parseFloat(card.style.getPropertyValue("--dx")) || 0;
    const dy = parseFloat(card.style.getPropertyValue("--dy")) || 0;
    card.style.setProperty("--dx", `${Math.max(-160, Math.min(160, dx + step[0]))}px`);
    card.style.setProperty("--dy", `${Math.max(-160, Math.min(160, dy + step[1]))}px`);
    card.style.setProperty("--tilt", `${Math.max(-12, Math.min(12, (dx + step[0]) / 8))}deg`);
  };

  return (
    <div id="skills" className="sk">
      {/* The portrait, standing on the section's bottom edge, with the cards on him. */}
      <div className="sk-art">
        <div ref={stageRef} className="sk-stage">
          <Image
            className="sk-photo"
            src="/skill-suit.png"
            alt="Goutham in a grey suit and tie, with glasses"
            width={1195}
            height={1444}
            sizes="(max-width: 767px) 78vw, 482px"
            draggable={false}
          />
          {CARDS.map((c, i) => (
            <span
              key={c.label}
              className="sk-card"
              style={{ "--x": `${c.x}%`, "--y": `${c.y}%`, "--d": c.depth, "--i": i }}
              tabIndex={0}
              aria-label={`${c.label}. Arrow keys move it.`}
              onPointerDown={onCardDown}
              onKeyDown={onCardKey}
              onBlur={(e) => home(e.currentTarget)}
            >
              <span className="sk-card-in">
                <span className="sk-b" aria-hidden="true">[</span>
                {c.label}
                <span className="sk-b" aria-hidden="true">]</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="sk-text">
        <ScrollReveal baseOpacity={0} enableBlur={true} blurStrength={10}>
          <BracketHeading as="h2" dark className="text-black font-anonymous-pro text-3xl md:text-5xl">
            Skills
          </BracketHeading>
        </ScrollReveal>

        <ScrollReveal baseOpacity={0} enableBlur={true} blurStrength={10}>
          <div>
            {/* Each word underlines in turn, left to right, on hover. */}
            <h3 className="sk-tagline skills-tagline mt-6 text-black font-outfit text-xl md:mt-8">
              {TAGLINE.map((w, i) => (
                <span key={w} className="skills-word" style={{ "--i": i }}>
                  {w}
                  {i < TAGLINE.length - 1 ? " " : ""}
                </span>
              ))}
            </h3>
            <p className="sk-para mt-3 font-outfit text-sm leading-relaxed text-black/75">
              I bring together full-stack engineering, AI, and product design to build digital experiences from the
              first sketch to deployment. I care about how things look, how systems work, and whether the final
              product genuinely solves a problem.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
