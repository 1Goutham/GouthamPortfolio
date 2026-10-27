"""The portrait's drop shadow, rendered once (at its hover strength, 0.7;
CSS shows it at 0.86 opacity, i.e. the design's 0.6, at rest).

A CSS drop-shadow on the live portrait canvas would be recomputed on every
frame, because the canvas changes every frame. This bakes the same shadow
(the design's `drop-shadow(0 30px 40px rgba(0,0,0,.6))` at the 320px
desktop size) from the photo's silhouette, at half resolution, with room
around it for the blur.

Writes PUBLIC_DIR/shadow.png and prints the CSS box for it, as percentages
of the portrait's own box.
"""
import sys

import cv2
import numpy as np
from PIL import Image

SRC, PUBLIC = sys.argv[1:3]

a = np.array(Image.open(SRC).convert("RGBA"))[..., 3].astype(np.float32) / 255
H, W = a.shape
scale = W / 320  # image px per CSS px at the design size
offset = 30 * scale
sigma = 40 / 2 * scale  # CSS blur radius is twice the standard deviation
pad = int(np.ceil(sigma * 3 + offset))

canvas = np.zeros((H + 2 * pad, W + 2 * pad), np.float32)
canvas[pad : pad + H, pad : pad + W] = a
canvas = cv2.GaussianBlur(canvas, (0, 0), sigma)
# Shift down by the offset by placing the box lower in CSS instead.
alpha = np.clip(canvas * 0.7 * 255, 0, 255).astype(np.uint8)
img = np.zeros((*alpha.shape, 4), np.uint8)
img[..., 3] = alpha
out = Image.fromarray(img, "RGBA").resize(((W + 2 * pad) // 2, (H + 2 * pad) // 2), Image.LANCZOS)
out.save(f"{PUBLIC}/shadow.png", optimize=True)

left = -pad / W * 100
top = (-pad + offset) / H * 100
width = (W + 2 * pad) / W * 100
height = (H + 2 * pad) / H * 100
print(f"left: {left:.3f}%; top: {top:.3f}%; width: {width:.3f}%; height: {height:.3f}%;")
