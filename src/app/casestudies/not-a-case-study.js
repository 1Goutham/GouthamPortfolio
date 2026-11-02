"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import MinimalNav from "../components/layout/navbar";
import TransitionLink from "../components/layout/transition-link";

/**
 * Not a Case Study, typed out on a typewriter as you scroll.
 *
 * The machine is pinned to the bottom of the screen with a sheet in it; the
 * woven patch is the sheet's letterhead. On arrival the first paragraph
 * types itself; after that the scroll is the typist: each character is
 * struck in at the typing line (in slightly uneven ink), the carriage
 * creeps along the line and the paper feeds up a line at its end, and the
 * machine jolts with the keystrokes. Scrolling back un-types it. The whole
 * text is in the page from the start, so it reads and searches as text;
 * with reduced motion it is simply all there.
 */

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About me", href: "/#about" },
  { label: "Projects", href: "/projects" },
];

const PATCH = "/notacasestudy.webp";
const MACHINE = "/typewriter.webp"; // public/printer.png with its paper cut out

// Where things are on the typewriter image, as shares of its width:
//  show:   its height (it stands on the bottom of the screen)
//  type:   the typing line, on the strip of paper under the bail rod
//  platen: where the paper disappears into the roller
//  paperX / paperW: the sheet's left edge and width
const TW = { show: 0.5977, type: 0.207, platen: 0.2226, paperX: 0.1356, paperW: 0.7192 };

const SCROLL_PER_LINE = 34; // px of scroll per typed line
const FEED_OUT = 4; // lines' worth of scroll to feed the signed sheet out
const INTRO_MS_PER_CHAR = 14; // the first paragraph types itself at this pace

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

const B = ({ children }) => <b className="nc-key">{children}</b>;

// The essay, a paragraph per idea.
const PARAGRAPHS = [
  <>
    I&rsquo;ve always been <B>curious</B> about how things are made, why certain products <B>feel so good to use</B>,
    and what makes something <B>stand out</B> from everything else around it.
  </>,
  <>
    I don&rsquo;t particularly enjoy following the usual patterns or sticking to what a traditional AI developer or
    designer is expected to do. I like <B>exploring</B>, <B>experimenting</B>, trying things that might or might not
    work, and finding little ways to make something <B>feel different</B>. I want the things I create to have their
    own <B>identity</B>, something people can recognise and associate with the way I think and make things.
    That&rsquo;s what I&rsquo;m slowly trying to build with <B>1G</B>.
  </>,
  <>
    I&rsquo;m a big admirer of <B>Teenage Engineering</B> and the way they approach their products. There&rsquo;s
    something incredibly interesting about how they bring together <B>thoughtful design</B>,{" "}
    <B>playful interactions</B>, <B>unusual details</B> and <B>genuinely useful functionality</B>. Their work reminds
    me that even the simplest product can have so much <B>personality</B> when enough thought goes into it.
  </>,
  <>
    I believe a great product isn&rsquo;t just about how it looks or how well it functions; it&rsquo;s about finding
    that <B>sweet spot</B> where <B>good design</B>, <B>great functionality</B> and <B>purposeful technology</B> come
    together to create something <B>meaningful</B>.
  </>,
  <>
    And I feel the same way about <B>AI</B>. I don&rsquo;t think AI needs to be squeezed into every product just
    because it&rsquo;s exciting or trending. I&rsquo;d rather spend time figuring out <B>where it actually makes
    sense</B>, what it can improve, and whether it can make an experience more useful or open up possibilities that
    weren&rsquo;t there before.
  </>,
  <>
    That&rsquo;s also how I approach my own work. The things you see here aren&rsquo;t simply projects I&rsquo;ve
    picked up to add to my r&eacute;sum&eacute;. Most of them started with <B>a random thought</B>, a problem I wanted
    to explore, or <B>an idea I couldn&rsquo;t stop thinking about</B>. From there, it&rsquo;s a lot of brainstorming,
    research, collecting references, exploring possibilities, questioning decisions, sketching things out, designing
    interfaces, experimenting with interactions, figuring out the engineering behind them, integrating AI{" "}
    <B>where it genuinely belongs</B>, and eventually finding a way to <B>ship something that works</B>.
  </>,
  <>
    Sometimes things turn out exactly as I imagined, sometimes they take a completely different direction, and
    sometimes I end up <B>learning more from the things that don&rsquo;t work</B>. I enjoy that entire{" "}
    <B>process</B> just as much as seeing the final result.
  </>,
  <>
    Even this portfolio has been <B>one big experiment</B> for me. I&rsquo;ve been refining it for months, revisiting
    sections, changing interactions, adjusting layouts and spending an almost unreasonable amount of time thinking
    about individual <B>details and pixels</B>. Not because every little thing needs to be perfect, but because I
    genuinely enjoy figuring out how all those small decisions come together to create one{" "}
    <B>cohesive experience</B>.
  </>,
  <>
    I want my work to feel <B>thoughtful</B> without being too serious, <B>functional</B> without being boring, and{" "}
    <B>experimental</B> without losing its purpose. I&rsquo;m still exploring, learning, changing my mind and
    discovering new ways to make things, and I think that&rsquo;s what makes this journey exciting. I don&rsquo;t have
    a fixed formula for everything, and I probably don&rsquo;t want one either. I&rsquo;d rather{" "}
    <B>stay curious</B>, keep experimenting and see <B>how far an idea can go</B>.
  </>,
];

const CLOSING = (
  <>
    Ultimately, I hope everything I make carries a little bit of that <B>1G identity</B>: not just in how it looks,
    but in <B>how it works</B>, <B>how it feels</B> and <B>the thought that goes into making it</B>.
  </>
);

/** The patch, a real thing on the page: it tilts toward the pointer and the light moves over its threads. */
function Patch() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    let p = null;
    const paint = () => {
      raf = 0;
      el.style.setProperty("--tx", p ? `${(-p.y * 14).toFixed(2)}deg` : "0deg");
      el.style.setProperty("--ty", p ? `${(p.x * 18).toFixed(2)}deg` : "0deg");
      el.style.setProperty("--sx", p ? `${((0.5 - p.x) * 100 + 50).toFixed(1)}%` : "50%");
      el.style.setProperty("--sy", p ? `${((p.y + 0.5) * 100).toFixed(1)}%` : "0%");
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      p = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
      el.dataset.hot = "true";
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      p = null;
      delete el.dataset.hot;
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
  return (
    <div ref={ref} className="nc-patch" style={{ "--mask": `url(${PATCH})` }}>
      <div className="nc-tilt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PATCH} alt="Not a case study" width={760} height={369} draggable={false} />
        <span className="nc-sheen" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Wrap every printed character of the sheet in its own span, with its own
 * ink: a touch lighter or darker, a hair off the line, as type bars leave
 * them. Spaces stay plain text, so the justification still works.
 */
function wrapChars(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    for (const ch of node.textContent) {
      if (/\s/.test(ch)) {
        frag.appendChild(document.createTextNode(ch));
        continue;
      }
      const s = document.createElement("span");
      s.className = "ty-c";
      s.textContent = ch;
      s.style.setProperty("--o", (0.74 + rnd() * 0.26).toFixed(2));
      s.style.setProperty("--j", `${((rnd() - 0.5) * 0.7).toFixed(2)}px`);
      frag.appendChild(s);
    }
    node.replaceWith(frag);
  }
  return [...root.querySelectorAll(".ty-c")];
}

export default function NotACaseStudy() {
  const stageRef = useRef(null);
  const paperRef = useRef(null);
  const sheetRef = useRef(null);
  const textRef = useRef(null);
  const machineRef = useRef(null);
  const signRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    const paper = paperRef.current;
    const sheet = sheetRef.current;
    const text = textRef.current;
    const machine = machineRef.current;
    const sign = signRef.current;
    const body = machine?.querySelector(".ty-body");
    if (!stage || !text) return;
    const still = reduced();
    let chars = [];
    let lines = [];
    let shown = 0;
    let intro = 0; // lines typed by the opening, before any scrolling
    let introTarget = 0;
    let raf = 0;
    let alive = true;

    // Each character's place in the typing order: its line, plus how far
    // along that line it sits (the line is typed in its first 80%).
    const measure = () => {
      // Layout coordinates (offsets), which the sheet's 3D tilt doesn't touch.
      lines = [];
      const at = [];
      for (const c of chars) {
        const top = c.offsetTop;
        const left = c.offsetLeft;
        let line = lines[lines.length - 1];
        if (!line || Math.abs(line.top - top) > 4) {
          line = { top, bottom: top + c.offsetHeight, left, right: left + c.offsetWidth };
          lines.push(line);
        }
        line.right = Math.max(line.right, left + c.offsetWidth);
        at.push({ line: lines.length - 1, x: left });
      }
      chars.forEach((c, i) => {
        const L = lines[at[i].line];
        const f = (at[i].x - L.left) / Math.max(1, L.right - L.left);
        c._t = at[i].line + 0.8 * f;
      });
      // The opening types the first paragraph.
      const lastOfFirst = [...(text.querySelector(".nc-p")?.querySelectorAll(".ty-c") || [])].pop();
      introTarget = lastOfFirst ? Math.floor(lastOfFirst._t) + 0.999 : 0;
      // Scroll room for the rest, and a little for the sheet to feed out.
      stage.style.setProperty("--run", `${(Math.max(0, lines.length - introTarget) + FEED_OUT) * SCROLL_PER_LINE + 80}px`);
    };

    // The typing line, on screen; and the top of the paper's box (worked
    // out from the machine, as its tilt would skew a measured box).
    const geometry = () => {
      const m = machine.getBoundingClientRect();
      return { typeY: m.top + TW.type * m.width, clipTop: m.top + TW.platen * m.width - paper.offsetHeight };
    };

    // The sheet's motion is simulated, not set: it glides to where the
    // typing puts it, and it hangs on gravity. The more of it is out, the
    // further it leans back over the paper rest; fed up quickly it lags,
    // then flops back and settles with a little sway (a damped spring).
    const sim = { y: 0, x: 0, a: 7, av: 0, last: 0, kick: 0, on: false };
    let doneNow = false;

    const frame = (t = performance.now()) => {
      raf = 0;
      if (!alive || !lines.length) return;
      const dt = sim.last ? Math.min(48, t - sim.last) : 16;
      sim.last = t;
      const top = stage.getBoundingClientRect().top;
      const scrolled = Math.max(0, -top);
      const p = still ? lines.length + FEED_OUT : intro + scrolled / SCROLL_PER_LINE;

      // Strike in (or lift out) the characters up to p.
      const before = shown;
      while (shown < chars.length && chars[shown]._t <= p) chars[shown++].classList.add("on");
      while (shown > 0 && chars[shown - 1]._t > p) chars[--shown].classList.remove("on");
      // A fast scroll lands whole lines at once: no strike animation for those.
      if (Math.abs(shown - before) > 25) text.classList.add("ty-fast");
      else if (shown !== before) text.classList.remove("ty-fast");
      // The machine gives a little with the keystrokes (not every frame).
      if (shown > before && !still && t - sim.kick > 70) {
        sim.kick = t;
        body.animate([{ transform: "none" }, { transform: "translateY(0.9px)" }, { transform: "none" }], { duration: 90, easing: "ease-out" });
      }
      const nowDone = shown === chars.length;
      if (nowDone !== doneNow) setDone((doneNow = nowDone));

      // Where the typing wants the paper: the line being typed on the
      // typing line, feeding up to the next at its end; past the last
      // line, out until the signature is up.
      const n = lines.length;
      const i = Math.min(Math.floor(p), n - 1);
      const frac = p - Math.floor(p);
      const cur = lines[Math.max(0, i)];
      const next = lines[Math.min(n - 1, i + 1)];
      let y = cur.bottom + (p < n ? smooth((frac - 0.75) / 0.25) * (next.bottom - cur.bottom) : 0);
      if (p >= n) {
        const signEnd = sign.offsetTop + sign.offsetHeight - text.offsetTop + 24;
        y = lines[n - 1].bottom + smooth((p - n) / FEED_OUT) * (signEnd - lines[n - 1].bottom);
      }
      const { typeY, clipTop } = geometry();
      const ty = typeY - clipTop - text.offsetTop - y;
      // The carriage creeps left along the line and returns at its end.
      const tx = p < n ? (0.5 - Math.min(1, frac / 0.75)) * 14 : 0;

      if (!sim.on || still) {
        sim.on = true;
        sim.y = ty;
        sim.x = tx;
      }
      const prevY = sim.y;
      sim.y += (ty - sim.y) * (1 - Math.exp(-dt / 80));
      sim.x += (tx - sim.x) * (1 - Math.exp(-dt / 110));
      const vy = (sim.y - prevY) / dt; // px per ms; negative as it rises

      // Gravity: lean by how much paper is out, plus a lag when it moves.
      const out = Math.max(0, paper.offsetHeight - sim.y);
      const lean = 6 + 9 * Math.min(1.2, out / window.innerHeight) + Math.max(-3, Math.min(4, -vy * 9));
      if (still) sim.a = lean;
      sim.av += ((lean - sim.a) * 0.00014 - sim.av * 0.013) * dt;
      sim.a += sim.av * dt;

      paper.style.transform = `perspective(1500px) rotateX(${sim.a.toFixed(3)}deg)`;
      sheet.style.transform = `translate3d(${sim.x.toFixed(2)}px, ${sim.y.toFixed(2)}px, 0)`;

      // Keep going while anything is still moving.
      const moving = Math.abs(ty - sim.y) > 0.2 || Math.abs(tx - sim.x) > 0.05 || Math.abs(sim.av) > 0.0002 || Math.abs(lean - sim.a) > 0.01;
      if (moving && !still) raf = requestAnimationFrame(frame);
      else sim.last = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const start = async () => {
      await document.fonts?.ready;
      if (!alive) return;
      chars = wrapChars(text);
      measure();
      setReady(true);
      if (still) return frame();
      // The opening: the first paragraph types itself.
      const t0 = performance.now();
      const count = chars.filter((c) => c._t <= introTarget).length;
      const total = count * INTRO_MS_PER_CHAR;
      const step = (t) => {
        if (!alive) return;
        // (a frame can be stamped a touch before t0)
        const k = Math.max(0, Math.min(1, (t - t0) / total));
        const idx = Math.min(chars.length - 1, Math.floor(k * count));
        intro = k >= 1 ? introTarget : chars[idx]._t;
        kick();
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    start();

    const ro = new ResizeObserver(() => {
      if (!chars.length) return;
      measure();
      kick();
    });
    ro.observe(text);
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
    };
  }, []);

  return (
    <main className="nc-page min-h-screen bg-white font-outfit text-black" data-ready={ready}>
      <nav className="nc-nav relative z-20 flex items-center justify-between px-6 py-6 md:px-12">
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

      <h1 className="sr-only">Not a case study</h1>

      {/* The typewriter: pinned while the sheet is typed. */}
      <section
        ref={stageRef}
        className="ty-stage"
        style={{ "--px": TW.paperX, "--pw": TW.paperW, "--show": TW.show, "--platen": TW.platen, "--type": TW.type }}
      >
        <div className="ty-pin">
          <div ref={machineRef} className="ty-machine" data-ready={ready}>
            {/* The paper, cut off where it goes into the roller. */}
            <div ref={paperRef} className="ty-paper-clip">
              <div ref={sheetRef} className="ty-sheet">
                <div className="ty-head">
                  <Patch />
                </div>
                <div ref={textRef} className="ty-text">
                  {PARAGRAPHS.map((para, i) => (
                    <p key={i} className="nc-p">
                      {para}
                    </p>
                  ))}
                  <p className="nc-p nc-closing">{CLOSING}</p>
                </div>
                <p ref={signRef} className="ty-sign" data-on={done} aria-hidden="true">
                  Goutham
                </p>
              </div>
            </div>
            {/* Where the paper curls round into the platen, it falls into shadow. */}
            <span className="ty-shade" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ty-body" src={MACHINE} alt="" width={1800} height={1076} draggable={false} />
          </div>
        </div>
      </section>

      <footer className="nc-end">
        <TransitionLink href="/projects" className="bracket-link bracket-link-dark font-anonymous-pro text-lg text-black md:text-xl">
          <span className="bracket-link-l" aria-hidden="true">[</span>
          <span className="bracket-link-text">See the work</span>
          <span className="bracket-link-r" aria-hidden="true">]</span>
        </TransitionLink>
        <TransitionLink href="/#contact" className="bracket-link bracket-link-dark font-anonymous-pro text-lg text-black md:text-xl">
          <span className="bracket-link-l" aria-hidden="true">[</span>
          <span className="bracket-link-text">Let&rsquo;s talk</span>
          <span className="bracket-link-r" aria-hidden="true">]</span>
        </TransitionLink>
      </footer>
    </main>
  );
}
