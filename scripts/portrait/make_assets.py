"""Pack the portrait layers for the browser.

Writes into PUBLIC_DIR:
  base.webp   the portrait with irises and lettering removed
  aux.png     R depth, G/B eye openings (image-left / image-right), A lid shadow
              (half resolution; all smooth fields)
  iris.png    both irises side by side
  text.png    the "[Vanakamm!]" lettering, cropped
and DATA_JSON with every measurement the shader needs.
"""
import json
import sys

import numpy as np
from PIL import Image

OUT, PUBLIC, DATA = sys.argv[1:4]

base = Image.open(f"{OUT}/base_clean.png").convert("RGBA")
W, H = base.size
base.save(f"{PUBLIC}/base.webp", "WEBP", quality=92, method=6)

eyes = json.load(open(f"{OUT}/eyes.json"))
names = ["left_img", "right_img"]

depth = np.load(f"{OUT}/depth.npy")
masks = [np.array(Image.open(f"{OUT}/mask_{n}.png")).astype(np.float32) / 255 for n in names]
shade = np.minimum(*[np.load(f"{OUT}/shade_{n}.npy") for n in names])
aux = np.stack([depth, masks[0], masks[1], shade], -1)
aux_img = Image.fromarray(np.clip(aux * 255, 0, 255).astype(np.uint8), "RGBA")
aux_img.resize((W // 2, H // 2), Image.LANCZOS).save(f"{PUBLIC}/aux.png", optimize=True)

irises = [Image.open(f"{OUT}/iris_{n}.png").convert("RGBA") for n in names]
aw = sum(i.width for i in irises) + 2
ah = max(i.height for i in irises)
atlas = Image.new("RGBA", (aw, ah), (0, 0, 0, 0))
x = 0
rects = []
for i in irises:
    atlas.paste(i, (x, 0))
    rects.append([x, 0, i.width, i.height])
    x += i.width + 2
atlas.save(f"{PUBLIC}/iris.png", optimize=True)

cov = np.load(f"{OUT}/text_alpha.npy")
ys, xs = np.nonzero(cov > 0.01)
tx0, ty0, tx1, ty1 = int(xs.min()) - 2, int(ys.min()) - 2, int(xs.max()) + 3, int(ys.max()) + 3
crop = cov[ty0:ty1, tx0:tx1]
la = np.stack([np.full_like(crop, 255), crop * 255], -1).astype(np.uint8)
Image.fromarray(la, "LA").save(f"{PUBLIC}/text.png", optimize=True)

# Gaze range per eye: how far the iris centre can travel inside the opening.
LID_N = 24


def lid_lines(mask, x0, x1):
    """The opening's top and bottom edge, traced from the mask, at LID_N columns."""
    xs = np.linspace(x0, x1, LID_N)
    up, lo = [], []
    for x in xs:
        col = mask[:, int(round(np.clip(x, 0, W - 1)))]
        ys = np.nonzero(col > 0.5)[0]
        if len(ys):
            # Sub-pixel edge: where the soft mask crosses one half.
            t, b = ys[0], ys[-1]
            ft = t - (col[t] - 0.5) / max(col[t] - col[max(t - 1, 0)], 1e-3)
            fb = b + (col[b] - 0.5) / max(col[b] - col[min(b + 1, H - 1)], 1e-3)
            up.append(float(ft))
            lo.append(float(fb))
        else:
            up.append(np.nan)
            lo.append(np.nan)
    up, lo = np.array(up), np.array(lo)
    mid = np.nanmean((up + lo) / 2)
    # The very ends close up onto the corner.
    up = np.where(np.isnan(up), mid, up)
    lo = np.where(np.isnan(lo), mid, lo)
    k = np.array([0.25, 0.5, 0.25])
    up = np.convolve(np.pad(up, 1, mode="edge"), k, "valid")
    lo = np.convolve(np.pad(lo, 1, mode="edge"), k, "valid")
    return [round(v, 2) for v in up], [round(v, 2) for v in lo]


data = {"size": [W, H], "text": [tx0, ty0, tx1 - tx0, ty1 - ty0], "atlas": [aw, ah], "lidN": LID_N, "eyes": []}
for n, rect, mask in zip(names, rects, masks):
    e = eyes[n]
    x0, x1 = e["xRange"]
    up_line, lo_line = lid_lines(mask, x0, x1)
    half = (x1 - x0) / 2
    r = e["radius"]
    data["eyes"].append(
        {
            "c": [round(e["center"][0], 2), round(e["center"][1], 2)],
            "r": round(r, 2),
            "texR": e["irisTexRadius"],
            "rect": rect,
            "catch": [round(v, 2) for v in e["catch"]],
            "up": up_line,
            "lo": lo_line,
            "x": [round(x0, 1), round(x1, 1)],
            "maxX": round(max(6.0, (half - r * 0.78) * 0.85), 2),
            "maxUp": round(r * 0.16, 2),
            "maxDown": round(r * 0.2, 2),
        }
    )
json.dump(data, open(DATA, "w"), indent=1)
print(json.dumps(data, indent=1))
