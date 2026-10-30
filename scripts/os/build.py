"""Assets for the Goutham OS desktop in the About section.

    python scripts/os/build.py public public/os

From public/bg.png, paintframe.png, mycutout.png and 1Gicon1-3.png, writes:

  desktop.webp      the hill and sky, without the taskbar baked into bg.png
                    (the taskbar is live: its buttons and the IST clock move)
  flag.webp         the Start button's flag      } from that taskbar
  tray.webp         the speaker and monitor      }
  paint.webp        the Paint window: the status text painted out (it is live),
                    the pencil drawn unpressed (the selected tool is live)
  paint-icon.webp   the little Paint icon from its title bar (taskbar button)
  cutout.webp       Goutham, cut out
  icon-player.webp  icon-paint.webp  icon-projects.webp   the desktop icons
"""
import sys

import numpy as np
from PIL import Image

src, out = sys.argv[1:3]


def load(name):
    return Image.open(f"{src}/{name}").convert("RGBA")


def webp(img, name, **kw):
    img.save(f"{out}/{name}.webp", method=6, **kw)


bg = load("bg.png")
TASKBAR = 1716
# 1440 wide is the right half of a 1440 page at 2x.
desk = bg.crop((0, 0, bg.width, TASKBAR - 2)).convert("RGB")
webp(desk.resize((1440, round(desk.height * 1440 / desk.width)), Image.LANCZOS), "desktop", quality=76)
webp(bg.crop((12, 1732, 64, 1782)), "flag", lossless=True)
webp(bg.crop((1522, 1730, 1650, 1784)), "tray", lossless=True)

pf = np.asarray(load("paintframe.png")).astype(np.float32)
gray = pf[700, 60, :3]
# The status line: its baked text goes, the live text takes its place.
pf[1342:1403, 28:720, :3] = gray
# The pencil cell (col 1, row 4) drawn unpressed: the brush cell beside it
# (raised bevel, flat face), with the pencil itself lifted onto it. The
# pressed face is a light grey dither; the pencil is what is dark or
# coloured.
CX, CY, CW, CH = 24, 356, 76, 78
pencil = pf[CY : CY + CH, CX : CX + CW].copy()
cell = pf[CY : CY + CH, CX + CW : CX + 2 * CW].copy()
face = (slice(8, CH - 8), slice(8, CW - 8))
cell[face][..., :3] = gray
rgb = pencil[face][..., :3]
ink = (rgb.max(-1) - rgb.min(-1) > 40) | (rgb.min(-1) < 120)
# Only the middle of the cell: its edges are the pressed bevel's shadow.
yy, xx = np.mgrid[0 : ink.shape[0], 0 : ink.shape[1]]
ink &= (yy > 6) & (yy < ink.shape[0] - 4) & (xx > 4) & (xx < ink.shape[1] - 4)
cf = cell[face]
cf[ink] = pencil[face][ink]
cell[face] = cf
pf[CY : CY + CH, CX : CX + CW] = cell
webp(Image.fromarray(pf.astype(np.uint8), "RGBA").convert("RGB"), "paint", quality=90)
# The title bar's icon, its navy ground made transparent.
icon = np.asarray(load("paintframe.png").crop((14, 14, 70, 66))).astype(np.float32)
navy = (icon[..., 2] > 100) & (icon[..., 0] < 40) & (icon[..., 1] < 60)
icon[navy, 3] = 0
webp(Image.fromarray(icon.astype(np.uint8), "RGBA"), "paint-icon", lossless=True)

webp(load("mycutout.png"), "cutout", quality=90, alpha_quality=100)
for n, name in ((1, "player"), (2, "paint"), (3, "projects")):
    webp(load(f"1Gicon{n}.png"), f"icon-{name}", lossless=True)
