"""Build a closed upper lid for each eye, for blinks.

The live portrait rolls this lid down over the eye instead of stretching
pixels from the photo (which would drag the glasses frame and lens glare
along). For each eye, between the top of the lid strip and the lower lid:

  - skin colour per column from clean lid skin only (frame, glare and
    lashes rejected), smoothed along the lid;
  - the shading of a closed lid: a soft crease shadow near the top, a
    rounded middle, darkening into the lash line;
  - the skin's own grain, taken from the real lid;
  - the real lash line, moved down to where the lid closes.

Writes OUT_DIR/lids.png (full size, transparent outside the lids).
"""
import json
import sys

import cv2
import numpy as np
from PIL import Image

BASE, DATA, OUT = sys.argv[1:4]

base = np.array(Image.open(BASE).convert("RGBA")).astype(np.float32)
H, W = base.shape[:2]
rgb = base[..., :3]
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
data = json.load(open(DATA))

TOP = 22.0      # lid strip starts this far above the lash line
SKIN_LO = 8.0   # clean skin: from TOP down to this far above the lash line
LASH = 6.0      # height of the dark lash line

out = np.zeros((H, W, 4), np.float32)
rng = np.random.default_rng(11)

for e in data["eyes"]:
    x0, x1 = e["x"]
    n = len(e["up"])
    xs_ctrl = np.linspace(x0, x1, n)
    cols = np.arange(int(np.floor(x0)) - 2, int(np.ceil(x1)) + 3)
    up = np.interp(cols, xs_ctrl, e["up"])
    lo = np.interp(cols, xs_ctrl, e["lo"])

    # Skin colour per column from clean skin only.
    colours = []
    for x, yu in zip(cols, up):
        ys = np.arange(int(yu - TOP + 1), int(yu - SKIN_LO))
        px = rgb[ys, x]
        lv = lum[ys, x]
        med = np.median(lv)
        ok = (lv < med + 14) & (lv > med - 26)
        colours.append(np.median(px[ok], 0) if ok.any() else np.median(px, 0))
    colours = np.array(colours)
    # Reject whole columns that are still bright (the frame crossing the
    # strip at the inner corner) and fill them from their neighbours.
    cl = colours @ np.array([0.299, 0.587, 0.114])
    good = cl < np.median(cl) + 12
    idx = np.arange(len(cols))
    for c in range(3):
        colours[:, c] = np.interp(idx, idx[good], colours[good, c])
    colours = cv2.GaussianBlur(colours[None].astype(np.float32), (0, 0), sigmaX=4, sigmaY=0.01)[0]

    # Grain: high-pass of the real skin strip, mirrored to fill the lid.
    strip_rows = []
    for x, yu in zip(cols, up):
        ys = np.arange(int(yu - TOP + 1), int(yu - SKIN_LO))
        strip_rows.append(lum[ys, x])
    strip = np.array(strip_rows).T  # rows x cols
    real_grain = strip - cv2.GaussianBlur(strip.astype(np.float32), (0, 0), 1.6)
    amp = float(np.clip(real_grain.std(), 1.0, 6.0))
    # Fresh grain at the real strength (tiling the real strip would repeat
    # in bands), finer across than down like lid skin.
    gh = int(TOP + 60)
    grain = rng.normal(0, amp * 1.6, (gh, len(cols))).astype(np.float32)
    grain = cv2.GaussianBlur(grain, (0, 0), sigmaX=1.1, sigmaY=0.7)

    # Lash line from the photo, per column.
    lash = []
    for x, yu in zip(cols, up):
        ys = np.arange(int(round(yu - LASH)), int(round(yu)) + 1)
        lash.append(rgb[np.clip(ys, 0, H - 1), x])
    lash = np.array(lash)  # cols x LASH+1 x 3

    span_x = x1 - x0
    for ci, (x, yu, yl) in enumerate(zip(cols, up, lo)):
        top = yu - TOP
        y_end = yl + 1.0
        rows = np.arange(int(np.floor(top)), int(np.ceil(y_end)) + 1)
        for y in rows:
            v = np.clip((y - top) / max(yl - top, 1), 0, 1)
            # Closed lid shading.
            shade = (
                0.97
                + 0.05 * np.sin(np.pi * v)
                - 0.05 * np.exp(-(((v - 0.14) / 0.07) ** 2))
                - 0.14 * np.clip((v - 0.78) / 0.22, 0, 1) ** 1.5
            )
            g = grain[min(int(y - rows[0]), grain.shape[0] - 1), ci]
            c = colours[ci] * shade + g
            # The lash line sits at the closing edge.
            d_edge = yl - y
            if d_edge <= LASH and d_edge >= -1:
                k = int(np.clip(round(LASH - d_edge), 0, LASH))
                lc = lash[ci, k]
                wlash = np.clip(1 - d_edge / LASH, 0, 1) ** 0.6
                c = c * (1 - wlash) + lc * wlash
            # Continuity with the real skin at the top of the strip.
            wtop = np.clip((y - top) / 5.0, 0, 1)
            real = rgb[int(np.clip(y, 0, H - 1)), x]
            c = real * (1 - wtop) + c * wtop
            # The corners do not move; there the lid is the photo itself.
            tx = (x - x0) / span_x
            taper = np.clip(min(tx, 1 - tx) / 0.16, 0, 1)
            taper = taper * taper * (3 - 2 * taper)
            c = real * (1 - taper) + c * taper
            yy = int(y)
            if 0 <= yy < H:
                out[yy, x, :3] = c
                out[yy, x, 3] = 255

# Soften inside each lid a touch so the per-column build leaves no stripes.
a = out[..., 3:] / 255
blur = cv2.GaussianBlur(out[..., :3] * a, (0, 0), sigmaX=1.2, sigmaY=0.6)
den = cv2.GaussianBlur(a[..., 0], (0, 0), sigmaX=1.2, sigmaY=0.6)[..., None]
soft = np.where(den > 1e-3, blur / np.maximum(den, 1e-3), 0)
out[..., :3] = np.where(a > 0, soft * 0.6 + out[..., :3] * 0.4, 0)

Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").save(f"{OUT}/lids.png", optimize=True)
view = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
bg = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGBA").convert("RGBA")
bg.alpha_composite(view)
crop = bg.convert("RGB").crop((300, 600, 790, 760))
crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS).save(f"{OUT}/lids_view.png")
print("lids written")
