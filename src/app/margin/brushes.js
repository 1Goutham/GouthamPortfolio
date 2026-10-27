// Brushes for the Margin canvas.
//
// A stroke is { tool, color, seed, pts: [{ x, y, w }] } in CSS pixels. The
// width of each point is worked out once, as the point arrives (from speed
// and pen pressure), so replaying a stroke for undo or a resize draws it
// exactly as it looked the first time.
//
// Every tool but the eraser is drawn opaque onto a layer and then laid onto
// the page at the tool's `alpha`, so a translucent marker does not darken
// where its own stroke overlaps itself.

export const TOOLS = {
  eraser: { label: "Eraser", size: 26 },
  fountain: { label: "Fountain pen", size: 4.4, alpha: 1 },
  pencil: { label: "Pencil", size: 1.7, alpha: 0.85 },
  marker: { label: "Marker", size: 15, alpha: 0.5, blend: "multiply" },
  fineliner: { label: "Fineliner", size: 2.3, alpha: 1 },
  brush: { label: "Watercolour brush", size: 20, alpha: 0.42, blend: "multiply" },
};

export const TOOL_ORDER = ["eraser", "fountain", "pencil", "marker", "fineliner", "brush"];

/** Width for a new point, from the previous one, the time between and pressure. */
export function pointWidth(tool, prev, x, y, dt, pressure) {
  const base = TOOLS[tool].size;
  const p = pressure > 0 && pressure !== 0.5 ? pressure : null;
  if (tool === "fountain" || tool === "brush") {
    const speed = prev ? Math.hypot(x - prev.x, y - prev.y) / Math.max(dt, 1) : 0;
    // Faster strokes run thinner; ease toward the target so width never jumps.
    const target = base * (p ? 0.35 + p * 1.1 : Math.max(0.32, 1.15 - speed * (tool === "brush" ? 0.35 : 0.5)));
    return prev ? prev.w + (target - prev.w) * 0.35 : target * 0.6;
  }
  return p && tool !== "eraser" ? base * (0.5 + p) : base;
}

// Small seeded PRNG so the pencil's grain replays identically.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function constantPath(ctx, pts, ox = 0, oy = 0) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x + ox, pts[0].y + oy);
  if (pts.length === 1) {
    ctx.lineTo(pts[0].x + ox + 0.01, pts[0].y + oy);
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x + ox, pts[i].y + oy, mx + ox, my + oy);
  }
  if (pts.length > 1) {
    const l = pts[pts.length - 1];
    ctx.lineTo(l.x + ox, l.y + oy);
  }
  ctx.stroke();
}

// Variable width: each piece runs midpoint to midpoint around a point, at
// that point's width, with round caps hiding the joins.
function variablePath(ctx, pts) {
  if (pts.length < 3) {
    ctx.lineWidth = pts[pts.length - 1].w;
    constantPath(ctx, pts);
    return;
  }
  let sx = pts[0].x;
  let sy = pts[0].y;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.lineWidth = pts[i].w;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    ctx.stroke();
    sx = mx;
    sy = my;
  }
  const l = pts[pts.length - 1];
  ctx.lineWidth = l.w;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(l.x, l.y);
  ctx.stroke();
}

/** Draw a whole stroke, opaque, into ctx (the eraser cuts instead). */
export function renderStroke(ctx, stroke) {
  const { tool, color, pts } = stroke;
  if (!pts.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;

  switch (tool) {
    case "eraser":
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = TOOLS.eraser.size;
      constantPath(ctx, pts);
      break;

    case "pencil": {
      // A firm core and two looser passes beside it read as graphite.
      const r = rng(stroke.seed);
      ctx.lineWidth = pts[0].w;
      constantPath(ctx, pts);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = pts[0].w * 0.55;
      for (let pass = 0; pass < 2; pass++) {
        const j = pts.map((p) => ({ x: p.x + (r() - 0.5) * 1.6, y: p.y + (r() - 0.5) * 1.6 }));
        constantPath(ctx, j);
      }
      break;
    }

    case "brush":
      // Soft edges and a fainter wash a little wider than the stroke.
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      variablePath(ctx, pts);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = pts.reduce((m, p) => Math.max(m, p.w), 0) * 1.25;
      constantPath(ctx, pts, 0.8, 0.6);
      break;

    case "fountain":
      variablePath(ctx, pts);
      break;

    default:
      ctx.lineWidth = pts[0].w;
      constantPath(ctx, pts);
  }
  ctx.restore();
}

/** Lay a finished layer onto the page canvas at the tool's opacity. */
export function compositeLayer(ctx, layer, tool) {
  const t = TOOLS[tool];
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = t.alpha ?? 1;
  ctx.globalCompositeOperation = t.blend ?? "source-over";
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}
