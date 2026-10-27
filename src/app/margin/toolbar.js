"use client";

import { useEffect, useRef, useState } from "react";
import { Redo2, Trash2, Undo2 } from "lucide-react";
import { TOOLS } from "./brushes";

export const SWATCHES = [
  { color: "#f1f0ec", name: "Chalk" },
  { color: "#c8c8c8", name: "Silver" },
  { color: "#4a494c", name: "Graphite" },
  { color: "#000000", name: "Ink" },
  { color: "#a1a1a1", name: "Ash" },
  { color: "#6aa898", name: "Sage" },
  { color: "#ffffff", name: "White" },
];

// The tray is drawn in the design's own units (the bar is 320 x 47) and laid
// out in container units, so it scales as one piece. Each tool's column
// spans the full height of the bar, so the whole strip is the hit area.
//   l / w : column left and width, cqw   t : top of the drawing, cqw
const SLOTS = {
  eraser: { l: 11.48, w: 7.03, t: 4.69 },
  fountain: { l: 21.1, w: 3.75, t: 1.56 },
  pencil: { l: 27.7, w: 4.06, t: 2.1 },
  marker: { l: 34.6, w: 6.4, t: 2.19 },
  fineliner: { l: 43.75, w: 4.3, t: 2.19 },
  brush: { l: 51.17, w: 3.52, t: 1.25 },
};
const SWATCH_POS = [
  [78.9, 4.61],
  [85.16, 4.61],
  [91.4, 4.61],
  [75.78, 9.92],
  [82.03, 9.92],
  [88.28, 9.92],
  [94.53, 9.92],
];

// Tool drawings, in design pixels; each runs well past the bottom of the
// bar so a raised tool still has a body below it.
function ToolArt({ id }) {
  switch (id) {
    case "eraser":
      return (
        <svg viewBox="0 0 22.5 46" aria-hidden="true">
          <defs>
            <linearGradient id="mg-er-cap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a3a1a0" />
              <stop offset="1" stopColor="#7f7d7c" />
            </linearGradient>
            <linearGradient id="mg-er-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2b2928" />
              <stop offset="0.5" stopColor="#363433" />
              <stop offset="1" stopColor="#252322" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="22.5" height="11" rx="1.6" fill="url(#mg-er-cap)" />
          <rect x="0" y="9.3" width="22.5" height="37" fill="url(#mg-er-body)" />
        </svg>
      );
    case "fountain":
      return (
        <svg viewBox="0 0 12 58" aria-hidden="true">
          <defs>
            <linearGradient id="mg-fp-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e8a50e" />
              <stop offset="0.45" stopColor="#f7c935" />
              <stop offset="1" stopColor="#d9960a" />
            </linearGradient>
            <linearGradient id="mg-fp-nib" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e4e3df" />
              <stop offset="0.5" stopColor="#ffffff" />
              <stop offset="1" stopColor="#d6d5d1" />
            </linearGradient>
          </defs>
          <path d="M6 0C7.6 4 11.6 8.4 11.6 13.5V26H.4V13.5C.4 8.4 4.4 4 6 0Z" fill="url(#mg-fp-nib)" />
          <path d="M6 1.2V10.2" stroke="#2a2a2a" strokeWidth="0.55" />
          <circle cx="6" cy="11.4" r="1.15" fill="#1b1b1b" />
          <rect x="0" y="25.5" width="12" height="33" fill="url(#mg-fp-body)" />
        </svg>
      );
    case "pencil":
      return (
        <svg viewBox="0 0 13 57" aria-hidden="true">
          <defs>
            <linearGradient id="mg-pc-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#9c4320" />
              <stop offset="0.5" stopColor="#c0622f" />
              <stop offset="1" stopColor="#8f3d1c" />
            </linearGradient>
          </defs>
          <path d="M6.5 0 9 6.5H4Z" fill="#8f8e8e" />
          <path d="M4 6.5H9L13 21.5H0Z" fill="#3b3837" />
          <rect x="0" y="21.3" width="13" height="36" fill="url(#mg-pc-body)" />
        </svg>
      );
    case "marker":
      return (
        <svg viewBox="0 0 20.5 57" aria-hidden="true">
          <defs>
            <linearGradient id="mg-mk-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3f5e5b" />
              <stop offset="0.5" stopColor="#557672" />
              <stop offset="1" stopColor="#3a5653" />
            </linearGradient>
            <linearGradient id="mg-mk-cap" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#252322" />
              <stop offset="0.5" stopColor="#33302f" />
              <stop offset="1" stopColor="#222020" />
            </linearGradient>
          </defs>
          <path d="M5.8 5.2C5.8 1.6 7.8 0 10.25 0S14.7 1.6 14.7 5.2Z" fill="#8f8e8d" />
          <path d="M5 4.8H15.5L20.5 12V26H0V12Z" fill="url(#mg-mk-cap)" />
          <rect x="0" y="25.6" width="20.5" height="32" fill="url(#mg-mk-body)" />
        </svg>
      );
    case "fineliner":
      return (
        <svg viewBox="0 0 13.75 57" aria-hidden="true">
          <defs>
            <linearGradient id="mg-fl-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#5c483b" />
              <stop offset="0.5" stopColor="#77604f" />
              <stop offset="1" stopColor="#554236" />
            </linearGradient>
          </defs>
          <path d="M5.6 4.2C5.6 1 6.2 0 6.88 0S8.15 1 8.15 4.2Z" fill="#8f8e8d" />
          <path d="M4.6 4H9.15L13.75 19V22.5H0V19Z" fill="#292726" />
          <rect x="0" y="22" width="13.75" height="35" fill="url(#mg-fl-body)" />
        </svg>
      );
    case "brush":
      return (
        <svg viewBox="0 0 11.25 59" aria-hidden="true">
          <defs>
            <linearGradient id="mg-br-hair" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#6d6c6c" />
              <stop offset="0.45" stopColor="#a5a4a4" />
              <stop offset="1" stopColor="#5f5e5e" />
            </linearGradient>
            <linearGradient id="mg-br-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#5a4766" />
              <stop offset="0.5" stopColor="#77628a" />
              <stop offset="1" stopColor="#523f5e" />
            </linearGradient>
          </defs>
          <path d="M5.6 0C8.6 5 11 10.5 11 16.5 11 21.5 9.4 24.6 8.6 27H2.6C1.8 24.6.25 21.5.25 16.5.25 10.5 2.6 5 5.6 0Z" fill="url(#mg-br-hair)" />
          <rect x="1.5" y="26.5" width="8.25" height="33" fill="url(#mg-br-body)" />
        </svg>
      );
    default:
      return null;
  }
}

function PenIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M15.2 4.6a2.1 2.1 0 0 1 3 0l1.2 1.2a2.1 2.1 0 0 1 0 3L9.2 19 4.5 19.5 5 14.8Z" fill="currentColor" />
    </svg>
  );
}

function DropperIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="m14.5 6.5 3 3M16.6 3.4a2.1 2.1 0 0 1 3 3l-2.1 2.1-3-3Zm-2.1 3.1-8.3 8.3-1 4 4-1 8.3-8.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const readable = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 160 ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.6)";
};

export default function Toolbar({ tool, color, custom, onTool, onColor, onUndo, onRedo, onClear, canUndo, canRedo, ready }) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  // The tray menu closes on any press outside it, or on Escape.
  useEffect(() => {
    if (!menu) return;
    const away = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenu(false);
    };
    const esc = (e) => e.key === "Escape" && setMenu(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const run = (fn) => () => {
    fn();
    setMenu(false);
  };

  return (
    <div className="mg-tray" data-ready={ready} role="toolbar" aria-label="Drawing tools">
      <div className="mg-bar">
        <div ref={menuRef} className="mg-menu-wrap">
          <button
            type="button"
            className="mg-menu-btn"
            aria-label="Canvas options"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            <PenIcon className="mg-menu-icon" />
          </button>
          <div className="mg-menu" data-open={menu} role="menu">
            <button type="button" role="menuitem" onClick={run(onUndo)} disabled={!canUndo}>
              <Undo2 strokeWidth={1.75} aria-hidden="true" /> Undo
            </button>
            <button type="button" role="menuitem" onClick={run(onRedo)} disabled={!canRedo}>
              <Redo2 strokeWidth={1.75} aria-hidden="true" /> Redo
            </button>
            <button type="button" role="menuitem" onClick={run(onClear)} disabled={!canUndo}>
              <Trash2 strokeWidth={1.75} aria-hidden="true" /> Clear
            </button>
          </div>
        </div>

        {Object.entries(SLOTS).map(([id, s], i) => (
          <button
            key={id}
            type="button"
            className="mg-tool"
            data-active={tool === id}
            aria-pressed={tool === id}
            aria-label={TOOLS[id].label}
            title={`${TOOLS[id].label}  (${i + 1})`}
            onClick={() => onTool(id)}
            style={{ "--l": s.l, "--w": s.w, "--t": s.t, "--i": i }}
          >
            <span className="mg-tool-art">
              <ToolArt id={id} />
            </span>
          </button>
        ))}

        <label className="mg-picker" style={{ "--fill": custom || "#f2f1ee" }} title="Pick any colour">
          <DropperIcon className="mg-picker-icon" style={{ color: readable(custom || "#f2f1ee") }} />
          <input
            type="color"
            className="mg-picker-input"
            value={color}
            aria-label="Pick any colour"
            onChange={(e) => onColor(e.target.value, true)}
          />
        </label>

        <span className="mg-panel" aria-hidden="true" />
        <div className="mg-palette" role="radiogroup" aria-label="Colours">
          {SWATCHES.map((s, i) => (
            <button
              key={s.color}
              type="button"
              role="radio"
              aria-checked={!custom && color === s.color}
              aria-label={s.name}
              className="mg-swatch"
              data-active={!custom && color === s.color}
              style={{ "--x": SWATCH_POS[i][0], "--y": SWATCH_POS[i][1], "--c": s.color, "--i": i }}
              onClick={() => onColor(s.color, false)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
