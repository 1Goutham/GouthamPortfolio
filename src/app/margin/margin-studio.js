"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Copy, Download, Instagram, Mail, Share2, X } from "lucide-react";
import toast from "react-hot-toast";
import TransitionLink from "../components/layout/transition-link";
import Toolbar from "./toolbar";
import { TOOLS, TOOL_ORDER, compositeLayer, pointWidth, renderStroke } from "./brushes";

const EMAIL = "gouthamgopinath.tsi@gmail.com";
const INSTAGRAM = "https://www.instagram.com/tanger.ineee/";
const FILE_NAME = "margin-1gartlab.png";

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* "[ label ]" with the brackets easing outward on hover, as everywhere else. */
function Brackets({ children }) {
  return (
    <>
      <span className="bracket-link-l" aria-hidden="true">[</span>
      <span className="bracket-link-text">{children}</span>
      <span className="bracket-link-r" aria-hidden="true">]</span>
    </>
  );
}

function CameraIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.2l1.4-2h6.8l1.4 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle className="mg-lens" cx="12" cy="12.6" r="3.3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function download(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILE_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Where a finished drawing goes. The print drops in on a slight tilt; the
 * options are whichever this browser can actually do.
 */
function ShareSheet({ art, onClose }) {
  const [canShare, setCanShare] = useState(false);
  const [canCopy, setCanCopy] = useState(false);

  useEffect(() => {
    if (!art) return;
    const file = new File([art.blob], FILE_NAME, { type: "image/png" });
    setCanShare(!!navigator.canShare?.({ files: [file] }));
    setCanCopy(typeof window.ClipboardItem !== "undefined" && !!navigator.clipboard?.write);
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [art, onClose]);

  if (!art) return null;

  const email = () => {
    download(art.blob);
    const subject = encodeURIComponent("Made this on Margin");
    const body = encodeURIComponent("Hey Goutham,\n\nI drew something on your Margin. It's attached (just downloaded as " + FILE_NAME + ").\n\n");
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
    toast.success("Saved. Attach it to the email :)");
  };
  const insta = () => {
    download(art.blob);
    window.open(INSTAGRAM, "_blank", "noopener,noreferrer");
    toast.success("Saved. Drop it in my DMs :)");
  };
  const share = async () => {
    try {
      const file = new File([art.blob], FILE_NAME, { type: "image/png" });
      await navigator.share({ files: [file], title: "Margin", text: `For Goutham (${EMAIL})` });
    } catch {
      /* dismissed */
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": art.blob })]);
      toast.success("Copied. Paste it anywhere");
    } catch {
      toast.error("Couldn't copy, try saving it instead");
    }
  };

  return (
    <div className="mg-sheet-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mg-sheet font-outfit" role="dialog" aria-modal="true" aria-labelledby="mg-sheet-title">
        <button type="button" className="mg-sheet-close" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="mg-print">
          <span className="mg-tape" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art.url} alt="Your drawing" />
        </div>
        <h2 id="mg-sheet-title" className="mt-6 text-lg font-bold text-black">Send it my way</h2>
        <p className="mt-1 text-sm leading-relaxed text-black/65">
          Your art is saved as a PNG. Pick how it reaches me.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" className="mg-action" onClick={email}>
            <Mail aria-hidden="true" /> Email
          </button>
          <button type="button" className="mg-action" onClick={insta}>
            <Instagram aria-hidden="true" /> Instagram
          </button>
          {canShare && (
            <button type="button" className="mg-action" onClick={share}>
              <Share2 aria-hidden="true" /> Share
            </button>
          )}
          {canCopy && (
            <button type="button" className="mg-action" onClick={copy}>
              <Copy aria-hidden="true" /> Copy image
            </button>
          )}
          <button type="button" className="mg-action" onClick={() => download(art.blob)}>
            <Download aria-hidden="true" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Margin: the whole page is paper. Pick a tool from the tray and draw
 * anywhere, the copy dims out of the way while the pen is down, and the
 * result can be saved or sent to me.
 *
 * Shortcuts: 1-6 pick a tool, Cmd/Ctrl+Z undoes, Shift+Cmd/Ctrl+Z redoes.
 */
export default function MarginStudio() {
  const pageRef = useRef(null);
  const mainRef = useRef(null);
  const liveRef = useRef(null);
  const cursorRef = useRef(null);
  const flashRef = useRef(null);
  const qRef = useRef(null);
  const layer = useRef(null);
  const hist = useRef({ strokes: [], redo: [] });
  const live = useRef({ stroke: null, raf: 0, lastT: 0 });
  const view = useRef({ w: 0, h: 0, dpr: 1 });

  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState("fountain");
  const [color, setColor] = useState("#000000");
  const [custom, setCustom] = useState(null);
  const [, setVersion] = useState(0);
  const [art, setArt] = useState(null);
  const bump = () => setVersion((v) => v + 1);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  toolRef.current = tool;
  colorRef.current = color;

  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setReady(true));
    const t = setTimeout(() => alive && setReady(true), 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  const redrawAll = useCallback(() => {
    const main = mainRef.current;
    if (!main) return;
    const ctx = main.getContext("2d");
    const lctx = layer.current.getContext("2d");
    const { dpr } = view.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, main.width, main.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of hist.current.strokes) {
      if (s.tool === "clear") {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, main.width, main.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else if (s.tool === "eraser") {
        renderStroke(ctx, s);
      } else {
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, main.width, main.height);
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderStroke(lctx, s);
        compositeLayer(ctx, layer.current, s.tool);
      }
    }
  }, []);

  // Size every canvas to the viewport at device resolution, then replay.
  useEffect(() => {
    const l = live.current;
    layer.current = document.createElement("canvas");
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w === view.current.w && h === view.current.h && dpr === view.current.dpr) return;
      view.current = { w, h, dpr };
      for (const c of [mainRef.current, liveRef.current, layer.current]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      redrawAll();
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(l.raf);
    };
  }, [redrawAll]);

  const paint = useCallback(() => {
    const l = live.current;
    l.raf = 0;
    const s = l.stroke;
    if (!s) return;
    if (s.tool === "eraser") {
      renderStroke(mainRef.current.getContext("2d"), s);
      return;
    }
    const lc = liveRef.current;
    const ctx = lc.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, lc.width, lc.height);
    ctx.restore();
    renderStroke(ctx, s);
  }, []);

  const addPoint = (s, e) => {
    const l = live.current;
    const prev = s.pts[s.pts.length - 1];
    const x = e.clientX;
    const y = e.clientY;
    if (prev && Math.hypot(x - prev.x, y - prev.y) < 0.75) return;
    const now = e.timeStamp || performance.now();
    const w = pointWidth(s.tool, prev, x, y, now - l.lastT, e.pointerType === "pen" ? e.pressure : 0);
    l.lastT = now;
    s.pts.push({ x, y, w: +w.toFixed(2) });
  };

  const moveCursor = (e) => {
    const c = cursorRef.current;
    if (!c || e.pointerType !== "mouse") return;
    c.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 || live.current.stroke) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = toolRef.current;
    const stroke = { tool: t, color: colorRef.current, seed: (Math.random() * 1e9) | 0, pts: [] };
    live.current.stroke = stroke;
    live.current.lastT = e.timeStamp || performance.now();
    const lc = liveRef.current;
    lc.style.opacity = String(TOOLS[t].alpha ?? 1);
    lc.style.mixBlendMode = TOOLS[t].blend ?? "normal";
    addPoint(stroke, e);
    pageRef.current.dataset.drawing = "true";
    paint();
  };

  const onPointerMove = (e) => {
    moveCursor(e);
    const l = live.current;
    if (!l.stroke) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    if (events.length) events.forEach((ev) => addPoint(l.stroke, ev));
    else addPoint(l.stroke, e);
    if (!l.raf) l.raf = requestAnimationFrame(paint);
  };

  const onPointerUp = () => {
    const l = live.current;
    const s = l.stroke;
    if (!s) return;
    cancelAnimationFrame(l.raf);
    l.raf = 0;
    paint();
    l.stroke = null;
    if (s.tool !== "eraser") {
      compositeLayer(mainRef.current.getContext("2d"), liveRef.current, s.tool);
      const lc = liveRef.current;
      const ctx = lc.getContext("2d");
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, lc.width, lc.height);
      ctx.restore();
    }
    hist.current.strokes.push(s);
    hist.current.redo = [];
    pageRef.current.dataset.drawing = "false";
    bump();
  };

  const undo = useCallback(() => {
    const h = hist.current;
    if (!h.strokes.length) return;
    h.redo.push(h.strokes.pop());
    redrawAll();
    bump();
  }, [redrawAll]);

  const redo = useCallback(() => {
    const h = hist.current;
    if (!h.redo.length) return;
    h.strokes.push(h.redo.pop());
    redrawAll();
    bump();
  }, [redrawAll]);

  // Clearing is a step in the history too, so it can be undone. The ink
  // fades out rather than vanishing.
  const clear = useCallback(() => {
    const h = hist.current;
    if (!h.strokes.length || h.strokes[h.strokes.length - 1].tool === "clear") return;
    const main = mainRef.current;
    const finish = () => {
      h.strokes.push({ tool: "clear", pts: [] });
      h.redo = [];
      redrawAll();
      main.classList.remove("mg-wipe");
      bump();
    };
    if (reduceMotion()) return finish();
    main.classList.add("mg-wipe");
    setTimeout(finish, 380);
  }, [redrawAll]);

  // Anything visible on the page since the last clear?
  const hasArt = () => {
    const s = hist.current.strokes;
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i].tool === "clear") return false;
      if (s[i].tool !== "eraser") return true;
    }
    return false;
  };

  const exportBlob = () =>
    new Promise((resolve) => {
      const main = mainRef.current;
      const { dpr } = view.current;
      const out = document.createElement("canvas");
      out.width = main.width;
      out.height = main.height;
      const ctx = out.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(main, 0, 0);
      const family = getComputedStyle(document.body).getPropertyValue("--font-outfit") || "sans-serif";
      ctx.font = `500 ${13 * dpr}px ${family}`;
      ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("1Gartlab / margin", out.width - 18 * dpr, out.height - 14 * dpr);
      out.toBlob(resolve, "image/png");
    });

  const nudgeEmpty = () => {
    toast("Draw something first :)", { icon: "✏️" });
    const q = qRef.current;
    if (!q) return;
    q.classList.remove("mg-q-shake");
    void q.offsetWidth;
    q.classList.add("mg-q-shake");
  };

  const snapshot = async () => {
    if (!hasArt()) return nudgeEmpty();
    const f = flashRef.current;
    if (f && !reduceMotion()) {
      f.classList.remove("mg-flash-on");
      void f.offsetWidth;
      f.classList.add("mg-flash-on");
    }
    download(await exportBlob());
    toast.success("Saved to your downloads");
  };

  const openShare = async () => {
    if (!hasArt()) return nudgeEmpty();
    const blob = await exportBlob();
    setArt({ blob, url: URL.createObjectURL(blob) });
  };

  const closeShare = useCallback(() => {
    setArt((a) => {
      if (a) setTimeout(() => URL.revokeObjectURL(a.url), 500);
      return null;
    });
  }, []);

  const pickColor = (c, isCustom) => {
    setColor(c);
    setCustom(isCustom ? c : null);
    if (toolRef.current === "eraser") setTool("fountain");
  };

  // Keyboard: undo / redo and number keys for the tools.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (!mod && !e.altKey && e.key >= "1" && e.key <= "6") {
        setTool(TOOL_ORDER[+e.key - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const h = hist.current;
  const cursorSize = Math.max(TOOLS[tool].size, 6);

  return (
    <main ref={pageRef} className="margin-page font-outfit text-black" data-ready={ready} data-drawing="false">
      <canvas
        ref={mainRef}
        className="mg-canvas"
        aria-label="Drawing canvas"
        role="img"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={(e) => {
          moveCursor(e);
          cursorRef.current?.setAttribute("data-on", "");
        }}
        onPointerLeave={() => cursorRef.current?.removeAttribute("data-on")}
      />
      <canvas ref={liveRef} className="mg-canvas mg-live" aria-hidden="true" />

      <div className="mg-content">
        <nav className="mg-nav">
          <TransitionLink
            href="/"
            aria-label="Home"
            className="mg-hit mg-logo transition-transform duration-500 ease-out hover:rotate-[-6deg] hover:scale-105"
          >
            <Image src="/logo.png" width={368} height={214} alt="Goutham logo" priority className="invert" />
          </TransitionLink>
          <TransitionLink
            href="/#contact"
            className="mg-hit mg-contact btn-tactile btn-tactile-dark group inline-flex items-center justify-center bg-black text-white shadow-md hover:bg-[#1a1a1a]"
          >
            Contact
            <ArrowUpRight className="nudge-diag" strokeWidth={2} aria-hidden="true" />
          </TransitionLink>
        </nav>

        <h1 className="mg-star-wrap">
          <span className="sr-only">Margin by 1Gartlab</span>
          <span className="mg-star mg-hit">
            <Image src="/1gartlabcenterlogo.png" width={772} height={321} alt="" priority draggable={false} sizes="(max-width: 767px) 60vw, 22vw" />
          </span>
        </h1>

        <div className="mg-copy">
          <p className="mg-rise" style={{ "--i": 1 }}>
            Can you make something out of this{" "}
            <span ref={qRef} className="mg-q mg-hit" aria-label="question marks">
              <span>?</span>
              <span>?</span>
              <span>?</span>
            </span>{" "}
            Play around with the tools, draw something weird, make some art, or just have fun with it. When
            you&rsquo;re done, send it my way! I&rsquo;d love to see what you create.
          </p>
          <p className="mg-rise mg-bold" style={{ "--i": 2 }}>
            Got thoughts on design, art, or anything creative?{" "}
            <TransitionLink href="/#contact" className="mg-hit mg-talk">
              Let&rsquo;s talk.
            </TransitionLink>
          </p>

          <div className="mg-rise mg-actions font-anonymous-pro" style={{ "--i": 3 }}>
            <button type="button" className="mg-hit mg-camera" onClick={snapshot} aria-label="Save your art as an image">
              <CameraIcon />
            </button>
            <button type="button" className="mg-hit bracket-link bracket-link-dark" onClick={openShare}>
              <Brackets>Share your art</Brackets>
            </button>
            <TransitionLink href="/#margin" className="mg-hit bracket-link bracket-link-dark">
              <Brackets>Back</Brackets>
            </TransitionLink>
          </div>
        </div>
      </div>

      <Toolbar
        tool={tool}
        color={color}
        custom={custom}
        onTool={setTool}
        onColor={pickColor}
        onUndo={undo}
        onRedo={redo}
        onClear={clear}
        canUndo={h.strokes.length > 0}
        canRedo={h.redo.length > 0}
        ready={ready}
      />

      <span
        ref={cursorRef}
        className="mg-cursor"
        aria-hidden="true"
        data-tool={tool}
        style={{ "--s": `${cursorSize}px`, "--c": tool === "eraser" ? "#fff" : color }}
      >
        <span />
      </span>
      <span ref={flashRef} className="mg-flash" aria-hidden="true" />

      <ShareSheet art={art} onClose={closeShare} />
    </main>
  );
}
