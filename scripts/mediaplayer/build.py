"""Take public/mediaplayer.png apart for the intro player on the homepage.

    python scripts/mediaplayer/build.py public/mediaplayer.png public/intro

Writes, scaled by SCALE and cropped to the window:

  player.webp     the window, with the parts that move painted out: the seek
                  thumb, the volume wedge and thumb, and the "Ready" status
                  (that is live text now)
  seek.webp       the seek thumb
  vol-wedge.webp  the green volume wedge (clipped to the volume)
  vol-thumb.webp  the volume thumb
  pause.webp      the round play button, drawn as pause
  icon.webp       the round logo (taskbar button, desktop shortcut)

and prints the geometry (in the cropped, unscaled pixels) for the component.

The intro video itself is encoded with:

    ffmpeg -i 1GPortfolioIntro.mp4 -vf "scale=960:-2:flags=lanczos" \
      -c:v libx264 -preset slower -crf 28 -tune grain -profile:v high \
      -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k -ac 2 intro.mp4
    ffmpeg -ss 1.2 -i 1GPortfolioIntro.mp4 -frames:v 1 -vf scale=960:-2 -q:v 4 poster.jpg
"""
import json
import sys

import cv2
import numpy as np
from PIL import Image

src, out = sys.argv[1:3]
SCALE = 0.7

im = np.asarray(Image.open(src).convert("RGBA")).astype(np.float32)
base = im.copy()


def fill_from_column(x0, x1, y0, y1, col):
    """The bars are lit in horizontal bands: paint a box with one clean
    column of the same rows."""
    base[y0:y1, x0:x1] = im[y0:y1, col : col + 1]


fill_from_column(484, 540, 1390, 1476, 700)  # seek thumb
fill_from_column(872, 1074, 1490, 1582, 1150)  # volume wedge + thumb
base[1309:1373, 156:1762, :3] = 0  # status line ("Ready")


def sprite(x0, y0, x1, y1, name, thresh=16, thumb=False, keep_x=0):
    """What differs from the painted-out base, as its own image. A thumb is
    only its own green rim and white face (no blue from the bar behind it),
    from keep_x onward."""
    crop = im[y0:y1, x0:x1].copy()
    d = np.abs(crop[..., :3] - base[y0:y1, x0:x1, :3]).max(-1)
    a = np.clip((d - thresh) / 24, 0, 1)
    if thumb:
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        own = ((g > r + 25) & (g > b - 10)) | (crop[..., :3].min(-1) > 170) | ((g < 90) & (b < 110) & (r < 60))
        own = cv2.morphologyEx(own.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        n, lab, stats, _ = cv2.connectedComponentsWithStats(own)
        biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        a = a * (lab == biggest)
        a[:, :keep_x] = 0
    a = cv2.GaussianBlur(a.astype(np.float32), (3, 3), 0)
    crop[..., 3] = np.minimum(crop[..., 3], a * 255)
    save(crop, name)
    return [x0, y0, x1, y1]


def save(arr, name):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    w, h = img.size
    img = img.resize((max(1, round(w * SCALE)), max(1, round(h * SCALE))), Image.LANCZOS)
    img.save(f"{out}/{name}.webp", quality=92, method=6)


boxes = {
    "seek": sprite(484, 1390, 540, 1476, "seek", thumb=True),
    "volWedge": sprite(872, 1490, 1030, 1582, "vol-wedge"),
    "volThumb": sprite(1012, 1490, 1074, 1582, "vol-thumb", thumb=True, keep_x=8),
}

# The play button as pause: the triangle painted out of its own dome, two
# bars in the same navy.
px0, py0, px1, py1 = 168, 1392, 334, 1586
btn = im[py0:py1, px0:px1].copy()
rgb = btn[..., :3].astype(np.uint8)
navy = (rgb[..., 2] > rgb[..., 0] + 35) & (rgb[..., 0] < 90) & (rgb[..., 1] < 110)
yy, xx = np.mgrid[0 : py1 - py0, 0 : px1 - px0]
navy &= (xx > 45) & (xx < 125) & (yy > 50) & (yy < 140)
hole = cv2.dilate(navy.astype(np.uint8), np.ones((7, 7), np.uint8))
filled = cv2.inpaint(np.ascontiguousarray(rgb[..., ::-1]), hole, 9, cv2.INPAINT_TELEA)[..., ::-1]
ys, xs = np.nonzero(navy)
tri = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
colour = tuple(int(c) for c in np.median(rgb[navy], axis=0))
pause = Image.fromarray(filled.copy())
from PIL import ImageDraw

d = ImageDraw.Draw(pause)
cx = (tri[0] + tri[2]) / 2 - 4
cy = (tri[1] + tri[3]) / 2
bw, bh, gap = 15, 50, 12
for x in (cx - gap / 2 - bw, cx + gap / 2):
    d.rounded_rectangle([x, cy - bh / 2, x + bw, cy + bh / 2], radius=3, fill=colour)
pause_rgba = np.dstack([np.asarray(pause).astype(np.float32), btn[..., 3]])
save(pause_rgba, "pause")
boxes["playBtn"] = [px0, py0, px1, py1]

# The round logo from the title bar, for the taskbar button and the desktop
# shortcut.
logo = im[150:258, 140:250].copy()
r, g, b = logo[..., 0], logo[..., 1], logo[..., 2]
yy, xx = np.mgrid[0:108, 0:110]
logo[..., 3] = np.where((xx - 54) ** 2 + (yy - 54) ** 2 <= 49 ** 2, 255, 0)
Image.fromarray(logo.astype(np.uint8), "RGBA").resize((64, 63), Image.LANCZOS).save(f"{out}/icon.webp", quality=92)

# Crop the window out of its transparent margin.
ys, xs = np.nonzero(im[..., 3] > 10)
cx0, cy0, cx1, cy1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
save(base[cy0:cy1, cx0:cx1], "player")

shift = lambda b: [b[0] - cx0, b[1] - cy0, b[2] - cx0, b[3] - cy0]
print(json.dumps({
    "size": [cx1 - cx0, cy1 - cy0],
    **{k: shift(v) for k, v in boxes.items()},
    "crop": [cx0, cy0],
}))
