"""Depth map (MiDaS small, ONNX) and the "[Vanakamm!]" lettering as its own layer.

Writes into OUT_DIR:
  depth.npy        0..1, 1 = nearest, inside the portrait's alpha
  text_alpha.npy   0..1 coverage of the white lettering
  base_clean.png   base_noiris.png with the lettering painted out
"""
import sys

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

SRC, NOIRIS, MODEL, OUT = sys.argv[1:5]

orig = np.array(Image.open(SRC).convert("RGBA")).astype(np.float32)
base = np.array(Image.open(NOIRIS).convert("RGBA")).astype(np.float32)
H, W = orig.shape[:2]
alpha = orig[..., 3] / 255

# ---------------------------------------------------------------- depth
sess = ort.InferenceSession(MODEL, providers=["CPUExecutionProvider"])
inp = sess.get_inputs()[0]
side = 256
bg = orig[..., :3] * alpha[..., None] + 90 * (1 - alpha[..., None])
x = cv2.resize(bg, (side, side), interpolation=cv2.INTER_AREA) / 255.0
x = (x - np.array([0.485, 0.456, 0.406])) / np.array([0.229, 0.224, 0.225])
x = x.transpose(2, 0, 1)[None].astype(np.float32)
pred = sess.run(None, {inp.name: x})[0].squeeze()
d = cv2.resize(pred.astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
inside = alpha > 0.5
lo, hi = np.percentile(d[inside], 2), np.percentile(d[inside], 99.5)
d = np.clip((d - lo) / (hi - lo), 0, 1)
# Fade to the back plane outside the head and smooth it so the warp never
# tears: hair edges, ears and the glasses all move as one surface.
d = d * cv2.GaussianBlur(alpha, (0, 0), 6)
d = cv2.GaussianBlur(d, (0, 0), 5)
np.save(f"{OUT}/depth.npy", d)
Image.fromarray((d * 255).astype(np.uint8)).resize((W // 2, H // 2)).save(f"{OUT}/depth_view.png")

# ---------------------------------------------------------------- lettering
rgb = orig[..., :3]
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
sat = rgb.max(-1) - rgb.min(-1)
# The lettering is pure white and sits in a band across the top of the head.
band = np.zeros((H, W), bool)
band[170:312, :] = True
core = band & (lum > 205) & (sat < 30) & (alpha > 0.2)
# Keep blobs that look like strokes, or the dot of the "!" (drop stray
# bright hair glints, which are thin and short).
n, lab, stats, _ = cv2.connectedComponentsWithStats(core.astype(np.uint8), 8)
keep = np.zeros_like(core)
for i in range(1, n):
    x0, y0, w, h, area = stats[i]
    fill = area / max(1, w * h)
    if (area >= 25 and h >= 12) or (area >= 12 and fill > 0.55 and 3 <= w <= 14 and 3 <= h <= 14):
        keep |= lab == i
# Grow over the anti-aliased edge.
grown = cv2.dilate(keep.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
print("text bbox", cv2.boundingRect(grown.astype(np.uint8)))

# Paint the lettering out of the base: inpaint the hair under it.
paint = base.copy()
mask = cv2.dilate(grown.astype(np.uint8), np.ones((3, 3), np.uint8)) * 255
rgb_u8 = np.clip(base[..., :3], 0, 255).astype(np.uint8)
filled = cv2.inpaint(rgb_u8, mask, 6, cv2.INPAINT_TELEA).astype(np.float32)
paint[..., :3] = np.where(mask[..., None] > 0, filled, base[..., :3])
# Where the lettering hangs off the head (over the transparent background),
# the base becomes transparent there.
a_under = cv2.inpaint((alpha * 255).astype(np.uint8), mask, 6, cv2.INPAINT_TELEA).astype(np.float32)
a_bg = cv2.erode((alpha > 0.5).astype(np.uint8), np.ones((9, 9), np.uint8))
paint[..., 3] = np.where(mask > 0, np.minimum(a_under, cv2.GaussianBlur(a_bg.astype(np.float32), (0, 0), 3) * 255), base[..., 3])
Image.fromarray(np.clip(paint, 0, 255).astype(np.uint8), "RGBA").save(f"{OUT}/base_clean.png")

# Lettering coverage: how far each pixel is from the hair under it towards
# white, so the soft edges come out right on any background.
under = paint[..., :3]
ul = 0.299 * under[..., 0] + 0.587 * under[..., 1] + 0.114 * under[..., 2]
cov = np.clip((lum - ul) / np.maximum(255 - ul, 1), 0, 1) * grown
# Over the transparent background the photo's own alpha is the coverage.
cov = np.where(paint[..., 3] < 128, np.maximum(cov, alpha * grown), cov)
# Close the pinholes left by bright hair under the strokes, keep the edges.
cov = np.maximum(cov, cv2.morphologyEx(cov, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)))
solid = cv2.erode((cov > 0.55).astype(np.uint8), np.ones((2, 2), np.uint8)) > 0
cov = np.where(solid, 1.0, cov)
cov = cv2.GaussianBlur(cov, (0, 0), 0.45)
np.save(f"{OUT}/text_alpha.npy", cov.astype(np.float32))
Image.fromarray((cov * 255).astype(np.uint8)).crop((0, 100, W, 360)).save(f"{OUT}/text_view.png")
v = Image.fromarray(np.clip(paint, 0, 255).astype(np.uint8), "RGBA")
bgv = Image.new("RGBA", v.size, (0, 0, 0, 255))
bgv.alpha_composite(v)
bgv.convert("RGB").resize((W // 2, H // 2)).save(f"{OUT}/clean_view.png")
