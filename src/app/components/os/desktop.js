"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Paint, { FW, FH } from "./paint";

/**
 * Goutham OS: the right half of the About section, a little desktop that
 * works. Icons open things (double-click, or one tap on a phone), Paint
 * drags, minimises to the taskbar, maximises and closes, the Start menu
 * goes everywhere on the site, right-click the desktop for a menu, and the
 * clock is Goutham's own time (IST).
 *
 * Sizes are in --u, one pixel of the 488 x 482 design, from the desktop's
 * own size.
 */

const ICONS = [
  { id: "player", label: "1G Media Player", img: "/os/icon-player.webp", open: "player" },
  { id: "lab", label: "1GarTLab", img: "/os/icon-paint.webp", open: "/margin" },
  { id: "projects", label: "1Gprojects", img: "/os/icon-projects.webp", open: "/projects" },
];

const START = [
  { label: "1G Media Player", img: "/os/icon-player.webp", open: "player" },
  { label: "1GarTLab", img: "/os/icon-paint.webp", open: "/margin" },
  { label: "1Gprojects", img: "/os/icon-projects.webp", open: "/projects" },
  { label: "Paint", img: "/os/paint-icon.webp", open: "paint" },
  { sep: true },
  { label: "Arcade", open: "/arcade" },
  { label: "1G-works", open: "/works" },
  { label: "Contact Goutham", open: "#contact" },
  { sep: true },
  { label: "Shut Down…", open: "shutdown" },
];

const VEIL_MS = 420;
const coarse = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/** Goutham's time: India, whatever the visitor's clock says. */
function useIST() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    // On the minute, then every minute.
    let id = 0;
    const t = setTimeout(() => {
      tick();
      id = setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000) + 50);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);
  if (!now) return { time: "", full: "" };
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(now);
  const full = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  return { time, full };
}

export default function Desktop() {
  const router = useRouter();
  const deskRef = useRef(null);
  const paintApi = useRef(null);
  const [selected, setSelected] = useState(null);
  const [iconPos, setIconPos] = useState({}); // id -> { x, y } once moved
  // Paint: open | minimized | closed; where it is once dragged; maximised?
  const [paint, setPaint] = useState("open");
  const [paintPos, setPaintPos] = useState(null);
  const [maxed, setMaxed] = useState(false);
  const [active, setActive] = useState("paint");
  const [start, setStart] = useState(false);
  const [ctx, setCtx] = useState(null); // desktop right-click menu at { x, y }
  const [dialog, setDialog] = useState(null); // "about-paint" | "props"
  const [power, setPower] = useState("on"); // on | off | booting
  const { time, full } = useIST();

  // ------------------------------------------------------------- opening
  const go = useCallback(
    (href) => {
      if (href.startsWith("#")) {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      const v = document.createElement("span");
      v.className = "page-veil";
      v.setAttribute("aria-hidden", "true");
      document.body.appendChild(v);
      setTimeout(() => {
        router.push(href);
        setTimeout(() => v.remove(), 1200);
      }, VEIL_MS);
    },
    [router]
  );
  const open = (what) => {
    setStart(false);
    setCtx(null);
    if (what === "player") window.dispatchEvent(new CustomEvent("intro:open"));
    else if (what === "paint") {
      setPaint("open");
      setActive("paint");
    } else if (what === "shutdown") shutDown();
    else go(what);
  };

  // ------------------------------------------------------------- icons
  const onIconDown = (e, id) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setStart(false);
    setCtx(null);
    setSelected(id);
    const el = e.currentTarget;
    const desk = deskRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, ox: r.left - desk.left, oy: r.top - desk.top, moved: false };
    el.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) < 5) return;
      start.moved = true;
      const x = Math.max(0, Math.min(desk.width - r.width, start.ox + dx));
      const y = Math.max(0, Math.min(desk.height - r.height, start.oy + dy));
      setIconPos((p) => ({ ...p, [id]: { x, y } }));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      // One tap opens on a phone (there is no double-tap on a desktop
      // you're holding in your hand).
      if (!start.moved && coarse()) open(ICONS.find((i) => i.id === id).open);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  // ------------------------------------------------------------- Paint window
  const onTitleDown = (e) => {
    if (e.button !== 0 || maxed) return;
    setActive("paint");
    const win = e.currentTarget.closest(".os-window");
    const desk = deskRef.current.getBoundingClientRect();
    const r = win.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, ox: r.left - desk.left, oy: r.top - desk.top };
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    win.setAttribute("data-dragging", "");
    const move = (ev) => {
      // Keep enough of the title bar on the desktop to grab it again.
      const x = Math.max(-r.width + 80, Math.min(desk.width - 80, start.ox + ev.clientX - start.x));
      const y = Math.max(0, Math.min(desk.height - 30, start.oy + ev.clientY - start.y));
      setPaintPos({ x, y });
    };
    const up = () => {
      win.removeAttribute("data-dragging");
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const minimize = () => {
    setPaint("minimized");
    setActive(null);
  };
  const close = () => {
    setPaint("closed");
    setMaxed(false);
    setActive(null);
    setDialog((d) => (d === "about-paint" ? null : d));
  };
  const taskClick = () => {
    if (paint === "minimized") {
      setPaint("open");
      setActive("paint");
    } else if (active === "paint") minimize();
    else setActive("paint");
  };

  // ------------------------------------------------------------- power
  const shutDown = () => {
    setPower("off");
  };
  const powerOn = () => {
    setPower("booting");
    setTimeout(() => {
      setPower("on");
      setPaint("open");
      setPaintPos(null);
      setMaxed(false);
      setActive("paint");
    }, 1600);
  };

  // Menus close on a click elsewhere, or Escape.
  useEffect(() => {
    if (!start && !ctx) return;
    const off = (e) => {
      if (e.target.closest?.(".os-start, .os-startbtn, .os-ctx")) return;
      setStart(false);
      setCtx(null);
    };
    const esc = (e) => e.key === "Escape" && (setStart(false), setCtx(null));
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", esc);
    };
  }, [start, ctx]);

  const onDeskDown = (e) => {
    if (e.target !== e.currentTarget) return;
    setSelected(null);
    setActive(null);
  };
  const onDeskContext = (e) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    const r = deskRef.current.getBoundingClientRect();
    setCtx({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const paintStyle = maxed
    ? { left: "50%", top: 0, height: "100%", width: "auto", aspectRatio: `${FW} / ${FH}`, translate: "-50% 0" }
    : paintPos
      ? { left: `${paintPos.x}px`, top: `${paintPos.y}px` }
      : undefined;

  return (
    <div className="os" onContextMenu={(e) => e.preventDefault()}>
      <div ref={deskRef} className="os-desk" onPointerDown={onDeskDown} onContextMenu={onDeskContext}>
        {/* Desktop icons. */}
        {ICONS.map((ic, i) => (
          <button
            key={ic.id}
            type="button"
            className="os-icon"
            data-selected={selected === ic.id}
            style={iconPos[ic.id] ? { left: `${iconPos[ic.id].x}px`, top: `${iconPos[ic.id].y}px` } : { "--row": i }}
            onPointerDown={(e) => onIconDown(e, ic.id)}
            onDoubleClick={() => open(ic.open)}
            onKeyDown={(e) => e.key === "Enter" && open(ic.open)}
            onFocus={() => setSelected(ic.id)}
            aria-label={`Open ${ic.label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ic.img} alt="" draggable={false} />
            <span>{ic.label}</span>
          </button>
        ))}

        {/* Paint. */}
        {paint !== "closed" && (
          <div
            className="os-window os-paint"
            data-state={paint}
            data-active={active === "paint"}
            data-max={maxed}
            style={paintStyle}
            onPointerDown={() => setActive("paint")}
          >
            <Paint
              api={paintApi}
              active={active === "paint"}
              onTitleDown={onTitleDown}
              onMinimize={minimize}
              onMaximize={() => setMaxed((m) => !m)}
              onClose={close}
              onOpenMargin={() => go("/margin")}
              onAbout={() => setDialog("about-paint")}
            />
          </div>
        )}

        {/* Dialogs. */}
        {dialog && (
          <div className="os-dialog" role="dialog" aria-label={dialog === "props" ? "System Properties" : "About Paint"}>
            <div className="os-dialog-bar">
              <span>{dialog === "props" ? "System Properties" : "About Paint"}</span>
              <button type="button" onClick={() => setDialog(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="os-dialog-body">
              {dialog === "props" ? (
                <>
                  <strong>Goutham OS</strong>
                  <span>Version 2026 · Build 1G</span>
                  <span>Registered to: you, the visitor</span>
                  <span>Processor: curiosity @ 24/7</span>
                  <span>Memory: every 2px out of place</span>
                  <span>Location: Coimbatore, India (IST)</span>
                </>
              ) : (
                <>
                  <strong>Paint</strong>
                  <span>Goutham OS edition.</span>
                  <span>Start on him to draw on him;</span>
                  <span>start anywhere else to paint behind him.</span>
                  <span>He won&rsquo;t mind.</span>
                </>
              )}
              <button type="button" className="os-ok" onClick={() => setDialog(null)} autoFocus>
                OK
              </button>
            </div>
          </div>
        )}

        {/* Right-click on the desktop. */}
        {ctx && (
          <ul className="os-menu os-ctx" role="menu" style={{ left: `${ctx.x}px`, top: `${ctx.y}px` }}>
            <li role="none">
              <button type="button" role="menuitem" onClick={() => (setIconPos({}), setCtx(null))}>
                <span className="os-check" />
                <span className="os-mlabel">Arrange Icons</span>
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setCtx(null);
                  deskRef.current.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.25)" }, { filter: "brightness(1)" }], { duration: 260 });
                }}
              >
                <span className="os-check" />
                <span className="os-mlabel">Refresh</span>
              </button>
            </li>
            <li className="os-sep" role="separator" />
            <li role="none">
              <button type="button" role="menuitem" onClick={() => (setDialog("props"), setCtx(null))}>
                <span className="os-check" />
                <span className="os-mlabel">Properties</span>
              </button>
            </li>
          </ul>
        )}

        {/* Shut down, and back. */}
        {power !== "on" && (
          <button type="button" className="os-power" data-state={power} onClick={power === "off" ? powerOn : undefined}>
            {power === "off" ? (
              <>
                <span className="os-power-text">It&rsquo;s now safe to turn off your computer.</span>
                <span className="os-power-hint">(or click to turn it back on)</span>
              </>
            ) : (
              <span className="os-boot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/os/flag.webp" alt="" />
                <span>Starting Goutham OS…</span>
              </span>
            )}
          </button>
        )}
      </div>

      {/* Start menu. */}
      {start && (
        <div className="os-start" role="menu">
          <div className="os-start-band" aria-hidden="true">
            <b>1Goutham</b> OS
          </div>
          <ul>
            {START.map((it, i) =>
              it.sep ? (
                <li key={i} className="os-sep" role="separator" />
              ) : (
                <li key={it.label} role="none">
                  <button type="button" role="menuitem" onClick={() => open(it.open)}>
                    {it.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.img} alt="" />
                    ) : (
                      <span className="os-start-dot" aria-hidden="true" />
                    )}
                    <span>{it.label}</span>
                  </button>
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {/* Taskbar. */}
      <div className="os-taskbar">
        <button type="button" className="os-startbtn" data-on={start} onClick={() => setStart((s) => !s)} aria-expanded={start} aria-haspopup="menu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/os/flag.webp" alt="" />
          <b>Start</b>
        </button>
        <span className="os-task-sep" aria-hidden="true" />
        {paint !== "closed" && (
          <button type="button" className="os-task" data-on={paint === "open" && active === "paint"} onClick={taskClick}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/os/paint-icon.webp" alt="" />
            <span>untitled - Paint</span>
          </button>
        )}
        <div className="os-tray" title={full ? `${full} · IST, Goutham's time` : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/os/tray.webp" alt="" />
          <span className="os-clock" aria-label={time ? `Goutham's time: ${time} IST` : undefined}>
            {time}
          </span>
        </div>
      </div>
    </div>
  );
}
