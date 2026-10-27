"""Separate the irises from the eyes and rebuild the whites behind them.

Writes, into OUT_DIR:
  base_noiris.png   portrait with both irises removed (whites rebuilt)
  iris_<eye>.png    each iris as a full disk with alpha (catchlight removed)
  eyes.json         per eye: centre, radius, catchlight, lid curves, mask box
  masks.png         debug: aperture masks
"""
import json
import sys

import cv2
import numpy as np
from PIL import Image

SRC, LM, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

rgba = np.array(Image.open(SRC).convert("RGBA")).astype(np.float32)
H, W = rgba.shape[:2]
rgb = rgba[..., :3]
lm = json.load(open(LM))

lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
base = rgb.copy()
meta = {}
shades = {}

def refine_iris(cx, cy, r):
    """The landmarker's iris circle runs small and a little off centre.
    Find the real limbus (dark iris to bright white) along rays through the
    visible sides of the eye and fit a circle to those points."""
    pts = []
    for ang in list(range(-35, 36, 5)) + list(range(145, 216, 5)):
        a = np.radians(ang)
        ts = np.arange(r * 0.6, r * 1.7, 0.25)
        xs = cx + np.cos(a) * ts
        ys = cy + np.sin(a) * ts
        prof = cv2.remap(lum, xs.astype(np.float32)[None], ys.astype(np.float32)[None], cv2.INTER_LINEAR)[0]
        inner = np.median(prof[ts < r * 0.85])
        outer = np.percentile(prof, 90)
        if outer - inner < 25:
            continue  # this ray runs into lid or lashes, not white
        mid = (inner + outer) / 2
        hit = np.nonzero((prof > mid) & (ts > r * 0.85))[0]
        if len(hit):
            t = ts[hit[0]]
            pts.append((cx + np.cos(a) * t, cy + np.sin(a) * t))
    if len(pts) < 6:
        return cx, cy, r
    P = np.array(pts)
    # Algebraic circle fit: x^2 + y^2 + Dx + Ey + F = 0.
    A = np.c_[P[:, 0], P[:, 1], np.ones(len(P))]
    b = -(P[:, 0] ** 2 + P[:, 1] ** 2)
    D, E, F = np.linalg.lstsq(A, b, rcond=None)[0]
    nx, ny = -D / 2, -E / 2
    nr = np.sqrt(nx * nx + ny * ny - F)
    # Trust it only if it is a modest correction.
    if abs(nx - cx) > r * 0.3 or abs(ny - cy) > r * 0.3 or not (r * 0.9 < nr < r * 1.4):
        return cx, cy, r
    return float(nx), float(ny), float(nr)


for name, e in lm["eyes"].items():
    cx, cy, r = refine_iris(*e["center"], e["radius"])
    print(name, "iris", [round(v, 2) for v in e["center"]], round(e["radius"], 2), "->", round(cx, 2), round(cy, 2), round(r, 2))
    poly = np.array(e["contour"], np.float32)

    # Aperture: the landmark outline, grown a touch so the lid line itself
    # is the edge, then feathered.
    hard = np.zeros((H, W), np.uint8)
    cv2.fillPoly(hard, [np.round(poly * 4).astype(np.int32)], 255, lineType=cv2.LINE_AA, shift=2)
    hard = cv2.dilate(hard, np.ones((3, 3), np.uint8))
    soft = cv2.GaussianBlur(hard.astype(np.float32) / 255, (0, 0), 1.0)

    # Iris pixels: inside the aperture and within the iris circle (a little
    # beyond, to catch its soft edge).
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dist = np.hypot(xx - cx, yy - cy)
    iris_zone = (dist < r * 1.12) & (hard > 0)

    # Catchlight: the brightest compact blob inside the iris.
    inner = (dist < r * 0.9) & (hard > 0)
    bright = inner & (lum > np.percentile(lum[inner], 99.0)) & (lum > 120)
    if bright.any():
        ys, xs = np.nonzero(bright)
        wts = lum[ys, xs]
        clx, cly = float((xs * wts).sum() / wts.sum()), float((ys * wts).sum() / wts.sum())
        clr = max(2.0, float(np.sqrt(bright.sum() / np.pi)) * 1.6)
    else:
        clx, cly, clr = cx, cy, 0.0

    # Rebuild the white: inpaint the iris zone from the whites and lids
    # around it, working on the eye crop only.
    x0, y0 = int(max(0, cx - r * 4)), int(max(0, cy - r * 2.2))
    x1, y1 = int(min(W, cx + r * 4)), int(min(H, cy + r * 2.2))
    crop = np.clip(base[y0:y1, x0:x1], 0, 255).astype(np.float32)
    m = (iris_zone[y0:y1, x0:x1].astype(np.uint8)) * 255
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    ap = hard[y0:y1, x0:x1] > 0
    dcrop = dist[y0:y1, x0:x1]
    lcrop = lum[y0:y1, x0:x1]

    # The visible white: in the opening, clear of the iris, and bright
    # (lid skin and lashes inside the outline are darker).
    cand = ap & (dcrop > r * 1.15)
    thr = np.percentile(lcrop[cand], 45) if cand.any() else 120
    white = cand & (lcrop > thr)

    # Smooth colour field from those samples (normalised convolution at
    # growing radii, so every hole gets a value from the nearest white).
    w = white.astype(np.float32)

    def normconv(sig):
        num = cv2.GaussianBlur(crop * w[..., None], (0, 0), sig)
        den = cv2.GaussianBlur(w, (0, 0), sig)
        return num / np.maximum(den, 1e-6)[..., None], den

    # A fine field where samples are close, eased into a broad one where they
    # are not, with no hard switch between them.
    fine, dfine = normconv(7)
    broad, _ = normconv(28)
    a = np.clip(dfine / 0.12, 0, 1)[..., None]
    field = fine * a + broad * (1 - a)
    # The white's own grain, measured on the samples, added back as noise.
    resid = crop - cv2.GaussianBlur(crop, (0, 0), 2.0)
    grain = float(resid[white].std()) if white.any() else 3.0
    rng0 = np.random.default_rng(3)
    noise = cv2.GaussianBlur(rng0.normal(0, grain * 0.8, crop.shape[:2]).astype(np.float32), (0, 0), 0.9)
    rebuilt = field + noise[..., None]

    # Lid shadow: the white is darker under the upper lid.
    upper = poly[: len(poly) // 2 + 1]
    lower = np.vstack([poly[len(poly) // 2 :], poly[:1]])
    up_fit = np.polyfit(upper[:, 0], upper[:, 1], 2)
    lo_fit = np.polyfit(lower[:, 0], lower[:, 1], 2)
    gx = np.arange(x0, x1, dtype=np.float32)
    up_y = np.polyval(up_fit, gx)
    lo_y = np.polyval(lo_fit, gx)
    gy = np.arange(y0, y1, dtype=np.float32)[:, None]
    depth_below = np.clip((gy - up_y[None]) / np.maximum(lo_y - up_y, 1)[None], 0, 1)
    t = np.clip(depth_below / 0.45, 0, 1)
    shade = 0.62 + 0.38 * (t * t * (3 - 2 * t))
    # Match the rebuilt white's brightness to the real white beside it.
    if white.any():
        ref = float(lcrop[white].mean())
        rl = 0.299 * field[..., 0] + 0.587 * field[..., 1] + 0.114 * field[..., 2]
        gain = ref / max(1.0, float(rl[m > 0].mean()))
        rebuilt = rebuilt * min(1.12, max(0.95, gain))
    rebuilt = rebuilt * shade[..., None]
    # Fill the iris hole (wide enough to take the dark rim around the iris
    # too) with the rebuilt white, feathered into the real white; the eye
    # corners are left as they are.
    hole = (dcrop < r * 1.3) & ap
    soft_ap = soft[y0:y1, x0:x1]
    wgt = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 2.0)
    wgt = np.maximum(wgt, (dcrop < r * 1.12).astype(np.float32)) * soft_ap
    out = crop * (1 - wgt[..., None]) + rebuilt * wgt[..., None]
    base[y0:y1, x0:x1] = out

    # The lid shadow, for the shader to lay over the iris as it moves.
    shade_full = np.ones((H, W), np.float32)
    shade_full[y0:y1, x0:x1] = shade
    shades[name] = shade_full

    # The iris as a full disk. Visible iris pixels keep their colour; the
    # parts hidden by the lids are filled ring by ring from the visible ring.
    R = int(np.ceil(r * 1.12)) + 2
    size = 2 * R + 1
    disk = np.zeros((size, size, 4), np.float32)
    dy, dx = np.mgrid[-R : R + 1, -R : R + 1].astype(np.float32)
    rr = np.hypot(dx, dy)
    sx = np.clip(np.round(cx + dx).astype(int), 0, W - 1)
    sy = np.clip(np.round(cy + dy).astype(int), 0, H - 1)
    src = rgb[sy, sx]
    core = lum[sy, sx][(rr < r * 0.8) & (hard[sy, sx] > 200)]
    dark_thr = float(np.median(core)) + 30 if core.size else 90
    # Keep clear of both lid lines so no skin or wet lid edge gets in.
    py = cy + dy
    px = cx + dx
    clear = (py > np.polyval(up_fit, px) + 2.5) & (py < np.polyval(lo_fit, px) - 3.0)
    vis = (hard[sy, sx] > 200) & (rr < r * 1.02) & (lum[sy, sx] < dark_thr) & clear
    # Drop the catchlight from the texture; it is drawn separately.
    cl_mask = np.hypot(cx + dx - clx, cy + dy - cly) < clr * 1.6
    vis &= ~cl_mask
    ring = np.round(rr).astype(int)
    fill = np.zeros_like(src)
    rng = np.random.default_rng(7)
    for k in range(R + 1):
        sel = ring == k
        pool = src[sel & vis]
        if len(pool) < 6:
            near = (np.abs(ring - k) <= 2) & vis
            pool = src[near] if near.any() else src[vis]
        med = np.median(pool, axis=0)
        n = sel.sum()
        picks = pool[rng.integers(0, len(pool), n)] * 0.35 + med * 0.65
        fill[sel] = picks
    tex = np.where(vis[..., None], src, fill)
    tex = cv2.GaussianBlur(tex, (0, 0), 0.6) * 0.4 + tex * 0.6
    # Soft limbal edge.
    alpha = np.clip((r * 1.04 - rr) / (r * 0.12), 0, 1)
    disk[..., :3] = tex
    disk[..., 3] = alpha * 255
    Image.fromarray(np.clip(disk, 0, 255).astype(np.uint8), "RGBA").save(f"{OUT}/iris_{name}.png")

    # White under the catchlight for the shader.
    meta[name] = {
        "center": [cx, cy],
        "radius": r,
        "irisTexSize": size,
        "irisTexRadius": R,
        "catch": [clx - cx, cly - cy, clr],
        "upper": [float(v) for v in up_fit],
        "lower": [float(v) for v in lo_fit],
        "xRange": [float(poly[:, 0].min()), float(poly[:, 0].max())],
        "box": [x0, y0, x1, y1],
    }
    cv2.imwrite(f"{OUT}/mask_{name}.png", (soft * 255).astype(np.uint8))
    np.save(f"{OUT}/shade_{name}.npy", shades[name])

out_rgba = rgba.copy()
out_rgba[..., :3] = base
Image.fromarray(np.clip(out_rgba, 0, 255).astype(np.uint8), "RGBA").save(f"{OUT}/base_noiris.png")
json.dump(meta, open(f"{OUT}/eyes.json", "w"), indent=1)
print(json.dumps(meta, indent=1))
