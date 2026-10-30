"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

/**
 * Paint, as it came with Windows: the designed frame (public/os/paint.webp,
 * from scripts/os/build.py) with every part working over its own picture.
 *
 * The picture is three layers: paint, then Goutham (cut out, with a soft
 * shadow), then ink. Start a stroke on him and it draws on him; start it
 * anywhere else and it goes behind him (Options can fix it to one or the
 * other). Undo, all sixteen tools, the colours, the menus and the status
 * line work; Save downloads the picture.
 */

// The frame, in its own pixels.
export const FW = 942;
export const FH = 1416;
const box = ([x0, y0, x1, y1]) => ({
  left: `${(x0 / FW) * 100}%`,
  top: `${(y0 / FH) * 100}%`,
  width: `${((x1 - x0) / FW) * 100}%`,
  height: `${((y1 - y0) / FH) * 100}%`,
});
export const PG = {
  title: [8, 8, 765, 70],
  min: [772, 16, 818, 62],
  max: [822, 16, 868, 62],
  close: [876, 16, 922, 62],
  menus: [
    ["File", [24, 74, 90, 124]],
    ["Edit", [108, 74, 182, 124]],
    ["View", [200, 74, 290, 124]],
    ["Image", [308, 74, 416, 124]],
    ["Options", [432, 74, 563, 124]],
    ["Help", [580, 74, 665, 124]],
  ],
  canvas: [194, 133, 873, 1130],
  options: [38, 752, 162, 940],
  fg: [28, 1222, 68, 1260],
  bg: [50, 1244, 90, 1282],
  status: [30, 1345, 718, 1400],
  coords: [733, 1345, 820, 1400],
};
const CW = PG.canvas[2] - PG.canvas[0]; // 679
const CH = PG.canvas[3] - PG.canvas[1]; // 997

// Tools, as the toolbox lays them out (two columns, eight rows).
const TOOLS = [
  ["free", "Free-Form Select", "Selects a free-form part of the picture to move, copy, or edit."],
  ["select", "Select", "Selects a rectangular part of the picture to move, copy, or edit."],
  ["eraser", "Eraser/Color Eraser", "Erases a portion of the picture, using the selected eraser shape."],
  ["fill", "Fill With Color", "Fills an area with the current drawing color."],
  ["picker", "Pick Color", "Picks up a color from the picture for drawing."],
  ["zoom", "Magnifier", "Changes the magnification."],
  ["pencil", "Pencil", "Draws a free-form line one pixel wide."],
  ["brush", "Brush", "Draws using a brush with the selected shape and size."],
  ["airbrush", "Airbrush", "Draws using an airbrush of the selected size."],
  ["text", "Text", "Inserts text into the picture."],
  ["line", "Line", "Draws a straight line with the selected line width."],
  ["curve", "Curve", "Draws a curved line with the selected line width."],
  ["rect", "Rectangle", "Draws a rectangle with the selected fill style."],
  ["polygon", "Polygon", "Draws a polygon with the selected fill style."],
  ["ellipse", "Ellipse", "Draws an ellipse with the selected fill style."],
  ["round", "Rounded Rectangle", "Draws a rounded rectangle with the selected fill style."],
];
const cell = (i) => {
  const c = i % 2;
  const r = Math.floor(i / 2);
  return [24 + c * 76, 125 + r * 77, 24 + c * 76 + 76, 125 + r * 77 + 77];
};
// Sizes (canvas px) offered in the options box, small to large.
const SIZES = { brush: [6, 12, 22], eraser: [10, 20, 34], airbrush: [12, 22, 36], line: [3, 7, 12], curve: [3, 7, 12], polygon: [3, 7, 12], rect: [3, 7, 12], ellipse: [3, 7, 12], round: [3, 7, 12] };

const PALETTE = [
  "#000000", "#5f5e5e", "#7e7e7e", "#9b0101", "#a85b03", "#e4e132", "#0c8a18", "#08b56f", "#06727d", "#299efc", "#0e6afe", "#0227c7", "#5111f9", "#8e02a1", "#63350f",
  "#ffffff", "#b2b2b2", "#fb0000", "#f9a215", "#fdfc20", "#31eb3e", "#10f9d1", "#0bcaed", "#43f6fd", "#53a1fd", "#578efc", "#b272fa", "#d84c85", "#fd7e74",
];
// The 28 swatches on the frame, row by row (black is the colour box's own).
const SWATCHES = PALETTE.slice(1).map((c, i) => {
  const col = i % 14;
  const row = Math.floor(i / 14);
  const x = 108 + col * 49.07;
  const y = row ? 1257 : 1208;
  return [c, [x, y, x + 45, y + 42]];
});

const DEFAULT_STATUS = "For Help, click Help Topics on the Help Menu.";

// Where Goutham stands in the picture (canvas px).
const CUT_H = Math.round(CH * 0.92);
const CUT_W = Math.round((CUT_H * 650) / 928);
const CUT_X = Math.round((CW - CUT_W) / 2);
const CUT_Y = CH - CUT_H - 18;
const SHADOW = "drop-shadow(0 10px 14px rgba(0,0,0,0.28)) drop-shadow(0 2px 3px rgba(0,0,0,0.25))";

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const toRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export default function Paint({ api, onClose, onMinimize, onMaximize, onTitleDown, onOpenMargin, onAbout, active }) {
  const backRef = useRef(null);
  const frontRef = useRef(null);
  const previewRef = useRef(null);
  const stackRef = useRef(null);
  const cutRef = useRef(null);
  const maskRef = useRef(null); // Goutham's alpha, for "did this start on him?"
  const [tool, setTool] = useState("pencil");
  const prevTool = useRef("pencil");
  const [fg, setFg] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const [size, setSize] = useState(1);
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [coords, setCoords] = useState("");
  const [menu, setMenu] = useState(null);
  const [layerMode, setLayerMode] = useState("auto"); // auto | on | behind
  const [zoom, setZoom] = useState(null); // { x, y } in canvas px, or null
  const [flip, setFlip] = useState(false);
  const [invert, setInvert] = useState(false);
  const [text, setText] = useState(null); // { x, y, layer, value }
  const undo = useRef([]);
  // The tools that take more than one gesture: a lifted selection, a curve
  // waiting to be bent, a polygon still being clicked out.
  const sel = useRef(null);
  const [selOn, setSelOn] = useState(false);
  const curve = useRef(null);
  const poly = useRef(null);
  const drag = useRef(null);
  const spray = useRef(0);

  // --------------------------------------------------------------- setup
  useEffect(() => {
    const b = backRef.current.getContext("2d");
    b.fillStyle = "#ffffff";
    b.fillRect(0, 0, CW, CH);
    // Goutham's outline, for deciding which layer a stroke belongs to.
    const img = new Image();
    img.src = "/os/cutout.webp";
    img.onload = () => {
      const m = document.createElement("canvas");
      m.width = CW;
      m.height = CH;
      const c = m.getContext("2d", { willReadFrequently: true });
      c.drawImage(img, CUT_X, CUT_Y, CUT_W, CUT_H);
      maskRef.current = c.getImageData(0, 0, CW, CH).data;
    };
  }, []);

  const onHim = (x, y) => {
    const m = maskRef.current;
    if (!m) return false;
    const i = (Math.round(y) * CW + Math.round(x)) * 4 + 3;
    return (m[i] || 0) > 40;
  };
  const layerFor = (x, y) => {
    if (layerMode === "on") return frontRef.current;
    if (layerMode === "behind") return backRef.current;
    return onHim(x, y) ? frontRef.current : backRef.current;
  };

  const snapshot = (canvas) => {
    const ctx = canvas.getContext("2d");
    undo.current.push({ canvas, data: ctx.getImageData(0, 0, CW, CH) });
    if (undo.current.length > 8) undo.current.shift();
  };
  const doUndo = useCallback(() => {
    // A selection, curve or polygon in progress is dropped first; the lift's
    // snapshot below puts back what it took.
    if (sel.current || curve.current || poly.current) {
      sel.current = curve.current = poly.current = null;
      setSelOn(false);
      previewRef.current.getContext("2d").clearRect(0, 0, CW, CH);
    }
    const u = undo.current.pop();
    if (!u) return setStatus("Nothing to undo.");
    u.canvas.getContext("2d").putImageData(u.data, 0, 0);
  }, []);
  const clearAll = useCallback(() => {
    sel.current = curve.current = poly.current = null;
    setSelOn(false);
    previewRef.current.getContext("2d").clearRect(0, 0, CW, CH);
    snapshot(backRef.current);
    snapshot(frontRef.current);
    const b = backRef.current.getContext("2d");
    b.fillStyle = bg;
    b.fillRect(0, 0, CW, CH);
    frontRef.current.getContext("2d").clearRect(0, 0, CW, CH);
  }, [bg]);

  // The whole picture, as you see it, for Save and for the fill and picker.
  const composite = useCallback(() => {
    const c = document.createElement("canvas");
    c.width = CW;
    c.height = CH;
    const ctx = c.getContext("2d");
    if (flip) {
      ctx.translate(CW, 0);
      ctx.scale(-1, 1);
    }
    if (invert) ctx.filter = "invert(1)";
    ctx.drawImage(backRef.current, 0, 0);
    ctx.save();
    ctx.filter = `${invert ? "invert(1) " : ""}${SHADOW}`;
    if (cutRef.current?.complete) ctx.drawImage(cutRef.current, CUT_X, CUT_Y, CUT_W, CUT_H);
    ctx.restore();
    ctx.drawImage(frontRef.current, 0, 0);
    return c;
  }, [flip, invert]);

  const save = useCallback(() => {
    composite().toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "untitled.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setStatus("Saved as untitled.png");
    }, "image/png");
  }, [composite]);

  useImperativeHandle(api, () => ({ save, clearAll }), [save, clearAll]);

  // --------------------------------------------------------------- drawing
  const at = (e) => {
    const r = stackRef.current.getBoundingClientRect();
    let x = ((e.clientX - r.left) / r.width) * CW;
    const y = ((e.clientY - r.top) / r.height) * CH;
    if (flip) x = CW - x;
    return { x, y };
  };
  const width = () => (SIZES[tool] ? SIZES[tool][size] : 3);

  const stroke = (ctx, a, b, w, colour, erase) => {
    ctx.save();
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.lineCap = tool === "eraser" ? "square" : "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  };

  const shape = (ctx, kind, a, b, w, colour) => {
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const ww = Math.abs(b.x - a.x);
    const hh = Math.abs(b.y - a.y);
    if (kind === "line") {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    } else if (kind === "rect") ctx.rect(x, y, ww, hh);
    else if (kind === "ellipse") ctx.ellipse(x + ww / 2, y + hh / 2, ww / 2, hh / 2, 0, 0, Math.PI * 2);
    else if (kind === "round") ctx.roundRect(x, y, ww, hh, Math.min(28, ww / 3, hh / 3));
    ctx.stroke();
    ctx.restore();
  };

  const sprayAt = (ctx, p, colour) => {
    const r = width();
    ctx.fillStyle = colour;
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * r;
      ctx.fillRect(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.6, 1.6);
    }
  };

  const flood = (target, p, colour) => {
    const src = composite().getContext("2d").getImageData(0, 0, CW, CH).data;
    // The composite may be flipped; fill in its frame, write in the layer's.
    const sx = flip ? CW - 1 - Math.round(p.x) : Math.round(p.x);
    const sy = Math.round(p.y);
    const i0 = (sy * CW + sx) * 4;
    const [r0, g0, b0] = [src[i0], src[i0 + 1], src[i0 + 2]];
    const [r1, g1, b1] = toRGB(colour);
    const ctx = target.getContext("2d");
    const out = ctx.getImageData(0, 0, CW, CH);
    const seen = new Uint8Array(CW * CH);
    const tol = 48;
    const same = (j) => {
      const k = j * 4;
      return Math.abs(src[k] - r0) + Math.abs(src[k + 1] - g0) + Math.abs(src[k + 2] - b0) <= tol;
    };
    const stack = [sy * CW + sx];
    while (stack.length) {
      const j = stack.pop();
      if (seen[j] || !same(j)) continue;
      seen[j] = 1;
      const x = j % CW;
      const y = (j / CW) | 0;
      const tx = flip ? CW - 1 - x : x;
      const k = (y * CW + tx) * 4;
      out.data[k] = r1;
      out.data[k + 1] = g1;
      out.data[k + 2] = b1;
      out.data[k + 3] = 255;
      if (x > 0) stack.push(j - 1);
      if (x < CW - 1) stack.push(j + 1);
      if (y > 0) stack.push(j - CW);
      if (y < CH - 1) stack.push(j + CW);
    }
    ctx.putImageData(out, 0, 0);
  };

  const pick = (p, right) => {
    const d = composite().getContext("2d").getImageData(flip ? CW - 1 - Math.round(p.x) : Math.round(p.x), Math.round(p.y), 1, 1).data;
    const c = hex(d[0], d[1], d[2]);
    if (right) setBg(c);
    else setFg(c);
    setTool(prevTool.current);
  };


  // --------------------------------------------------- selections
  // A selection is lifted off its layer into its own canvas (what's left
  // behind is the background colour, or clear on the ink layer), floats on
  // the preview with marching ants, moves with the pointer, and is put down
  // again on a click outside it, a new tool, or Escape. Delete throws it away.
  const lift = (layer, path, bx) => {
    const x = Math.max(0, Math.floor(bx.x0));
    const y = Math.max(0, Math.floor(bx.y0));
    const w = Math.min(CW, Math.ceil(bx.x1)) - x;
    const h = Math.min(CH, Math.ceil(bx.y1)) - y;
    if (w < 3 || h < 3) return false;
    snapshot(layer);
    const img = document.createElement("canvas");
    img.width = w;
    img.height = h;
    const ic = img.getContext("2d");
    ic.translate(-x, -y);
    ic.clip(path);
    ic.drawImage(layer, 0, 0);
    const lc = layer.getContext("2d");
    lc.save();
    lc.clip(path);
    if (layer === backRef.current) {
      lc.fillStyle = bg;
      lc.fillRect(x, y, w, h);
    } else lc.clearRect(x, y, w, h);
    lc.restore();
    sel.current = { layer, img, path, x, y, w, h, dx: 0, dy: 0, ants: 0 };
    setSelOn(true);
    setStatus("Drag the selection to move it; hold Ctrl to leave a copy. Delete removes it.");
    return true;
  };
  const drawSel = () => {
    const sl = sel.current;
    const pv = previewRef.current.getContext("2d");
    pv.clearRect(0, 0, CW, CH);
    if (!sl) return;
    pv.drawImage(sl.img, sl.x + sl.dx, sl.y + sl.dy);
    pv.save();
    pv.translate(sl.dx, sl.dy);
    pv.lineWidth = 1.5;
    pv.setLineDash([6, 5]);
    pv.strokeStyle = "#fff";
    pv.stroke(sl.path);
    pv.strokeStyle = "#000";
    pv.lineDashOffset = sl.ants;
    pv.stroke(sl.path);
    pv.restore();
  };
  const inSel = (p) => {
    const sl = sel.current;
    if (!sl) return false;
    return previewRef.current.getContext("2d").isPointInPath(sl.path, p.x - sl.dx, p.y - sl.dy);
  };
  const putDown = () => {
    const sl = sel.current;
    if (!sl) return;
    sl.layer.getContext("2d").drawImage(sl.img, sl.x + sl.dx, sl.y + sl.dy);
    sel.current = null;
    setSelOn(false);
    previewRef.current.getContext("2d").clearRect(0, 0, CW, CH);
  };
  const dropSel = () => {
    sel.current = null;
    setSelOn(false);
    previewRef.current.getContext("2d").clearRect(0, 0, CW, CH);
  };

  // The ants march while there's a selection.
  useEffect(() => {
    if (!selOn) return;
    let raf = 0;
    let t0 = 0;
    const loop = (t) => {
      if (t - t0 > 70 && sel.current) {
        t0 = t;
        sel.current.ants = (sel.current.ants + 1) % 11;
        drawSel();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [selOn]);

  // --------------------------------------------------- curve and polygon
  // Curve: drag a straight line, then click (or drag) twice to bend it.
  // Polygon: drag the first side, click each corner after; click the first
  // corner, double-click, or press Enter to close it.
  const drawCurve = (ctx, c, w) => {
    ctx.save();
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(c.a.x, c.a.y);
    const c1 = c.c1 || c.a;
    const c2 = c.c2 || c.c1 || c.b;
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, c.b.x, c.b.y);
    ctx.stroke();
    ctx.restore();
  };
  const drawPoly = (ctx, pg, w, closed) => {
    const pts = closed ? pg.pts : [...pg.pts, pg.cur];
    ctx.save();
    ctx.strokeStyle = pg.ink;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    if (closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };
  const previewOf = (fn) => {
    const pv = previewRef.current.getContext("2d");
    pv.clearRect(0, 0, CW, CH);
    fn(pv);
  };
  const finishCurve = () => {
    const c = curve.current;
    if (!c) return;
    curve.current = null;
    previewRef.current.getContext("2d").clearRect(0, 0, CW, CH);
    drawCurve(c.layer.getContext("2d"), c, c.w);
  };
  const finishPoly = () => {
    const pg = poly.current;
    if (!pg) return;
    poly.current = null;
    previewRef.current.getContext("2d").clearRect(0, 0, CW, CH);
    if (pg.pts.length < 2) return;
    snapshot(pg.layer);
    drawPoly(pg.layer.getContext("2d"), pg, pg.w, pg.pts.length > 2);
    setStatus(DEFAULT_STATUS);
  };
  // Anything half-done is finished before the next thing starts.
  const settle = () => {
    putDown();
    finishCurve();
    finishPoly();
  };

  const onDown = (e) => {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    setMenu(null);
    const right = e.button === 2;
    const colour = right ? bg : fg;
    const p = at(e);
    const capture = () => e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "select" || tool === "free") {
      if (inSel(p)) {
        // Ctrl leaves a copy where it was.
        if (e.ctrlKey || e.metaKey) sel.current.layer.getContext("2d").drawImage(sel.current.img, sel.current.x + sel.current.dx, sel.current.y + sel.current.dy);
        capture();
        drag.current = { mode: "move", from: p, dx: sel.current.dx, dy: sel.current.dy, id: e.pointerId };
        return;
      }
      putDown();
      capture();
      drag.current = { mode: tool, start: p, pts: [p], id: e.pointerId, layer: layerFor(p.x, p.y) };
      return;
    }
    if (tool === "curve") {
      const c = curve.current;
      capture();
      if (c) {
        // First click bends it towards both handles, the second sets the other.
        if (!c.c1) c.c1 = p;
        else c.c2 = p;
        drag.current = { mode: "bend", id: e.pointerId };
        previewOf((pv) => drawCurve(pv, c, c.w));
        return;
      }
      const layer = layerFor(p.x, p.y);
      snapshot(layer);
      curve.current = { layer, a: p, b: p, ink: colour, w: width() };
      drag.current = { mode: "curve", id: e.pointerId };
      return;
    }
    if (tool === "polygon") {
      const pg = poly.current;
      if (pg) {
        const first = pg.pts[0];
        if (pg.pts.length > 2 && Math.hypot(p.x - first.x, p.y - first.y) < 14) return finishPoly();
        pg.pts.push(p);
        pg.cur = p;
        previewOf((pv) => drawPoly(pv, pg, pg.w));
        return;
      }
      capture();
      poly.current = { layer: layerFor(p.x, p.y), pts: [p], cur: p, ink: colour, w: width() };
      drag.current = { mode: "polyfirst", id: e.pointerId };
      setStatus("Click each corner. Click the first one, double-click or press Enter to close it.");
      return;
    }
    if (tool === "picker") return pick(p, right);
    if (tool === "zoom") {
      setZoom((z) => (z ? null : p));
      return;
    }
    const layer = layerFor(p.x, p.y);
    if (tool === "text") {
      setText({ x: p.x, y: p.y, layer, value: "", colour });
      return;
    }
    snapshot(layer);
    if (tool === "fill") return flood(layer, p, colour);
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = layer.getContext("2d");
    const erase = tool === "eraser" && layer === frontRef.current;
    const ink = tool === "eraser" ? bg : colour;
    drag.current = { layer, ctx, start: p, last: p, ink, erase, id: e.pointerId };
    if (tool === "pencil" || tool === "brush" || tool === "eraser") stroke(ctx, p, { x: p.x + 0.01, y: p.y }, tool === "pencil" ? 3 : width(), ink, erase);
    if (tool === "airbrush") {
      sprayAt(ctx, p, ink);
      spray.current = window.setInterval(() => drag.current && sprayAt(ctx, drag.current.last, ink), 30);
    }
  };
  const onMove = (e) => {
    const p = at(e);
    if (p.x >= 0 && p.y >= 0 && p.x <= CW && p.y <= CH) setCoords(`${Math.round(p.x)},${Math.round(p.y)}`);
    // Over a selection the pointer offers to move it.
    if (sel.current || stackRef.current.style.cursor) stackRef.current.style.cursor = inSel(p) ? "move" : "";
    const pg = poly.current;
    if (pg && !drag.current) {
      pg.cur = p;
      previewOf((pv) => drawPoly(pv, pg, pg.w));
    }
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (d.mode === "move") {
      sel.current.dx = d.dx + p.x - d.from.x;
      sel.current.dy = d.dy + p.y - d.from.y;
      drawSel();
    } else if (d.mode === "select" || d.mode === "free") {
      d.last = p;
      if (d.mode === "free") d.pts.push(p);
      previewOf((pv) => {
        pv.save();
        pv.lineWidth = 1.5;
        pv.setLineDash([6, 5]);
        pv.strokeStyle = "#000";
        pv.beginPath();
        if (d.mode === "select") pv.rect(d.start.x, d.start.y, p.x - d.start.x, p.y - d.start.y);
        else d.pts.forEach((q, i) => (i ? pv.lineTo(q.x, q.y) : pv.moveTo(q.x, q.y)));
        pv.stroke();
        pv.restore();
      });
      return;
    } else if (d.mode === "curve" || d.mode === "bend") {
      const c = curve.current;
      if (d.mode === "curve") c.b = p;
      else if (c.c2) c.c2 = p;
      else c.c1 = p;
      previewOf((pv) => drawCurve(pv, c, c.w));
    } else if (d.mode === "polyfirst") {
      pg.cur = p;
      previewOf((pv) => drawPoly(pv, pg, pg.w));
    } else if (tool === "pencil" || tool === "brush" || tool === "eraser") {
      stroke(d.ctx, d.last, p, tool === "pencil" ? 3 : width(), d.ink, d.erase);
    } else if (tool === "airbrush") {
      sprayAt(d.ctx, p, d.ink);
    } else if (SIZES[tool]) {
      const pv = previewRef.current.getContext("2d");
      pv.clearRect(0, 0, CW, CH);
      shape(pv, tool, d.start, p, width(), d.ink);
    }
    d.last = p;
  };
  const onUp = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    clearInterval(spray.current);
    if (d.mode === "select" || d.mode === "free") {
      previewRef.current.getContext("2d").clearRect(0, 0, CW, CH);
      const end = at(e);
      const path = new Path2D();
      let bx;
      if (d.mode === "select") {
        const x0 = Math.min(d.start.x, end.x);
        const y0 = Math.min(d.start.y, end.y);
        const x1 = Math.max(d.start.x, end.x);
        const y1 = Math.max(d.start.y, end.y);
        path.rect(x0, y0, x1 - x0, y1 - y0);
        bx = { x0, y0, x1, y1 };
      } else {
        d.pts.forEach((q, i) => (i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y)));
        path.closePath();
        const xs = d.pts.map((q) => q.x);
        const ys = d.pts.map((q) => q.y);
        bx = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
      }
      lift(d.layer, path, bx);
    } else if (d.mode === "curve") {
      const c = curve.current;
      if (Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y) < 3) curve.current = null;
      else setStatus("Now click or drag to bend the curve, twice.");
    } else if (d.mode === "bend") {
      if (curve.current?.c2) {
        finishCurve();
        setStatus(DEFAULT_STATUS);
      }
    } else if (d.mode === "polyfirst") {
      const pg = poly.current;
      const p = at(e);
      if (Math.hypot(p.x - pg.pts[0].x, p.y - pg.pts[0].y) > 3) pg.pts.push(p);
      pg.cur = p;
    } else if (["line", "rect", "ellipse", "round"].includes(tool)) {
      previewRef.current.getContext("2d").clearRect(0, 0, CW, CH);
      shape(d.ctx, tool, d.start, at(e), width(), d.ink);
    }
    drag.current = null;
  };

  const commitText = () => {
    setText((t) => {
      if (t?.value.trim()) {
        snapshot(t.layer);
        const ctx = t.layer.getContext("2d");
        ctx.fillStyle = t.colour;
        ctx.font = "bold 34px Tahoma, Verdana, sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText(t.value, t.x, t.y);
      }
      return null;
    });
  };

  const chooseTool = (id) => {
    settle();
    if (id === "picker" && tool !== "picker") prevTool.current = tool;
    else prevTool.current = id;
    setTool(id);
    setZoom(null);
  };

  // Keyboard: Ctrl+Z, Ctrl+S, Ctrl+N, while this window is the one in front.
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea")) return;
      if (sel.current && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        return dropSel();
      }
      if (e.key === "Escape" || e.key === "Enter") {
        if (sel.current) putDown();
        if (curve.current) finishCurve();
        if (poly.current) finishPoly();
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      const act = { z: doUndo, s: save, i: () => setInvert((v) => !v) }[k];
      if (act) {
        e.preventDefault();
        act();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // The finishers only touch refs, so the first ones stay good.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, doUndo, save]);

  // Menus close on a click elsewhere, or Escape.
  useEffect(() => {
    if (!menu) return;
    const off = (e) => !e.target.closest?.(".pt-menu, .pt-menubtn") && setMenu(null);
    const esc = (e) => e.key === "Escape" && setMenu(null);
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const MENUS = {
    File: [
      { label: "New", keys: "Ctrl+N", act: clearAll },
      { label: "Save As…", keys: "Ctrl+S", act: save },
      { sep: true },
      { label: "Open 1GarTLab…", act: onOpenMargin },
      { sep: true },
      { label: "Exit", act: onClose },
    ],
    Edit: [
      { label: "Undo", keys: "Ctrl+Z", act: doUndo },
      { sep: true },
      { label: "Clear Image", keys: "Ctrl+Shft+N", act: clearAll },
    ],
    View: [{ label: zoom ? "Normal Size" : "Zoom In", act: () => setZoom((z) => (z ? null : { x: CW / 2, y: CH / 3 })), checked: !!zoom }],
    Image: [
      { label: "Flip Horizontal", act: () => setFlip((v) => !v), checked: flip },
      { label: "Invert Colors", keys: "Ctrl+I", act: () => setInvert((v) => !v), checked: invert },
      { sep: true },
      { label: "Clear Image", act: clearAll },
    ],
    Options: [
      { label: "Paint where I click", act: () => setLayerMode("auto"), checked: layerMode === "auto" },
      { label: "Draw on Goutham", act: () => setLayerMode("on"), checked: layerMode === "on" },
      { label: "Paint behind Goutham", act: () => setLayerMode("behind"), checked: layerMode === "behind" },
    ],
    Help: [
      { label: "Help Topics", act: () => setStatus("Tip: start on him to draw on him, anywhere else to paint behind him.") },
      { sep: true },
      { label: "About Paint", act: onAbout },
    ],
  };

  const zoomStyle = zoom
    ? { transform: `scale(2)`, transformOrigin: `${(zoom.x / CW) * 100}% ${(zoom.y / CH) * 100}%` }
    : undefined;

  return (
    <div className="pt" onContextMenu={(e) => e.preventDefault()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pt-frame" src="/os/paint.webp" alt="" width={FW} height={FH} draggable={false} />

      <div className="pt-drag" style={box(PG.title)} onPointerDown={onTitleDown} onDoubleClick={onMaximize} aria-hidden="true" />
      <button type="button" className="os-hit os-btn" style={box(PG.min)} onClick={onMinimize} aria-label="Minimise Paint" />
      <button type="button" className="os-hit os-btn" style={box(PG.max)} onClick={onMaximize} aria-label="Maximise Paint" />
      <button type="button" className="os-hit os-btn" style={box(PG.close)} onClick={onClose} aria-label="Close Paint" />

      {PG.menus.map(([name, b]) => (
        <div key={name} className="pt-menuwrap" style={box(b)}>
          <button
            type="button"
            className="os-hit pt-menubtn"
            data-open={menu === name}
            aria-haspopup="menu"
            aria-expanded={menu === name}
            onClick={() => setMenu((m) => (m === name ? null : name))}
            onMouseEnter={() => menu && setMenu(name)}
          >
            <span className="sr-only">{name}</span>
          </button>
          {menu === name && (
            <ul className="os-menu" role="menu">
              {MENUS[name].map((it, i) =>
                it.sep ? (
                  <li key={i} className="os-sep" role="separator" />
                ) : (
                  <li key={i} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenu(null);
                        it.act?.();
                      }}
                    >
                      <span className="os-check">{it.checked ? "✓" : ""}</span>
                      <span className="os-mlabel">{it.label}</span>
                      {it.keys && <span className="os-keys">{it.keys}</span>}
                    </button>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      ))}

      {/* The picture: paint, Goutham, ink, and the shape being drawn. */}
      <div className="pt-canvas" style={box(PG.canvas)}>
        <div
          ref={stackRef}
          className="pt-stack"
          data-tool={tool}
          style={{ ...zoomStyle, filter: invert ? "invert(1)" : undefined, scale: flip ? "-1 1" : undefined }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onDoubleClick={() => tool === "polygon" && finishPoly()}
          onPointerLeave={() => setCoords("")}
        >
          <canvas ref={backRef} width={CW} height={CH} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={cutRef}
            className="pt-cutout"
            src="/os/cutout.webp"
            alt="Goutham, standing in Paint. Draw on him."
            draggable={false}
            style={{ left: `${(CUT_X / CW) * 100}%`, top: `${(CUT_Y / CH) * 100}%`, width: `${(CUT_W / CW) * 100}%`, filter: SHADOW }}
          />
          <canvas ref={frontRef} width={CW} height={CH} />
          <canvas ref={previewRef} width={CW} height={CH} />
          {text && (
            <input
              className="pt-text"
              autoFocus
              value={text.value}
              style={{ left: `${(text.x / CW) * 100}%`, top: `${(text.y / CH) * 100}%`, color: text.colour }}
              onChange={(e) => setText((t2) => ({ ...t2, value: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && commitText()}
              onBlur={commitText}
              aria-label="Text to add to the picture"
            />
          )}
        </div>
      </div>

      {/* Toolbox. */}
      {TOOLS.map(([id, label, help], i) => (
        <button
          key={id}
          type="button"
          className="os-hit pt-tool"
          style={box(cell(i))}
          data-on={tool === id}
          aria-label={label}
          aria-pressed={tool === id}
          onClick={() => chooseTool(id)}
          onMouseEnter={() => setStatus(help)}
          onMouseLeave={() => setStatus(DEFAULT_STATUS)}
        />
      ))}

      {/* Options for the tool: three sizes. */}
      <div className="pt-options" style={box(PG.options)}>
        {SIZES[tool] &&
          SIZES[tool].map((w, i) => (
            <button key={w} type="button" className="pt-size" data-on={size === i} onClick={() => setSize(i)} aria-label={`Size ${i + 1}`}>
              <span style={{ "--s": `${Math.min(18, 3 + i * 6)}px`, borderRadius: tool === "eraser" ? 0 : "50%" }} />
            </button>
          ))}
      </div>

      {/* Colours. */}
      <span className="pt-swatch pt-bg" style={{ ...box(PG.bg), background: bg }} aria-hidden="true" />
      <span className="pt-swatch pt-fg" style={{ ...box(PG.fg), background: fg }} aria-hidden="true" />
      {SWATCHES.map(([c, b]) => (
        <button
          key={c + b[0]}
          type="button"
          className="os-hit pt-colour"
          style={box(b)}
          aria-label={`Colour ${c}`}
          onClick={() => setFg(c)}
          onContextMenu={(e) => {
            e.preventDefault();
            setBg(c);
          }}
          onMouseEnter={() => setStatus("Selects colors. Left-click for the drawing color, right-click for the background.")}
          onMouseLeave={() => setStatus(DEFAULT_STATUS)}
        />
      ))}

      <div className="pt-status" style={box(PG.status)} aria-live="polite">
        {status}
      </div>
      <div className="pt-coords" style={box(PG.coords)}>
        {coords}
      </div>
    </div>
  );
}
