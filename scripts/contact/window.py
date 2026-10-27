"""Split public/window.png into the layers the contact window animates.

    python scripts/contact/window.py public/window.png person.png public/contact

person.png is a person mask of the photo (MediaPipe selfie_multiclass, see
README.md). Writes (scene, room and hands at the photo's size, so they stack with
no offsets):

  scene.webp   the photo without its two shutters (him, the frame, the room)
  room.webp    the same, empty: him painted out, for when he steps back
  hands.webp   the parts of him that lie over the shutters (arm and hands)
  leaf-l.webp  leaf-r.webp   each shutter as photographed, his hands painted
                             out, cropped to the shutter (box printed)
  back-l.webp  back-r.webp   each shutter closed: squared up to half the
                             opening, hinge stile on the hinge side

and prints the geometry the component needs. Stacked, scene + leaves + hands
give back the photo, so nothing changes until he moves.

Everything painted in follows the photo's structure rather than a generic
inpainter: the shutters are near mirror images, so each one's hidden part
comes from the other; the room and the frame are vertical (wall, door frame,
jambs), so they are filled down columns.
"""
import json
import sys

import cv2
import numpy as np

src, person_path, out = sys.argv[1:4]
rgba = cv2.imread(src, cv2.IMREAD_UNCHANGED)
H, W = rgba.shape[:2]
A = rgba[:, :, 3]
alpha = A > 8
rgb = rgba[:, :, :3].astype(np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def dist(p, q):
    """Signed distance from the line p->q for every pixel (positive on the
    right of the direction of travel, in image coordinates)."""
    dx, dy = q[0] - p[0], q[1] - p[1]
    return (dx * (yy - p[1]) - dy * (xx - p[0])) / np.hypot(dx, dy)


# Shutter outlines, traced on the photo. Corners run outer-top, hinge-top,
# hinge-bottom, outer-bottom.
L = [(109.5, 25.5), (228.75, 45.5), (226.25, 471.5), (102.5, 471.5)]
R = [(640.0, 25.5), (520.0, 45.5), (520.0, 475.0), (647.5, 475.0)]

# Grown a few px past the top and bottom edges so no sliver of shutter stays on the scene.
left = alpha & (dist(L[1], L[2]) > 0) & (dist(L[0], L[1]) > -3.5) & (yy <= 475)
right = alpha & (dist(R[1], R[2]) < 0) & (dist(R[0], R[1]) < 3.5) & (yy <= 478.5)
# The frame's top bar and sill reach past the hinges; keep them out.
left &= ~((xx > 212) & (yy > 471.5))
right &= ~((xx < 545) & (yy > 475))
shutters = left | right

person = (cv2.imread(person_path, cv2.IMREAD_GRAYSCALE) > 127) & alpha
# The segmenter loses his right hand against the pale shutter (and takes its
# shadow instead), so that hand is traced.
rhand = np.zeros((H, W), np.uint8)
cv2.fillPoly(rhand, [np.int32([(506, 402), (530, 399), (551, 406), (553, 433), (541, 443), (520, 445), (511, 436), (506, 420)])], 1)
rhand = cv2.dilate(rhand, np.ones((3, 3), np.uint8)) > 0
hands = (person & left) | (rhand & right)


def save(name, colour, a):
    img = np.dstack([np.clip(colour, 0, 255).astype(np.uint8), a.astype(np.uint8)])
    cv2.imwrite(f"{out}/{name}.webp", img, [cv2.IMWRITE_WEBP_QUALITY, 90])


# ---------------------------------------------------------------- shutters
# Canonical shutter: a 146 x 426 rectangle, outer stile left, hinge right.
centre = (L[1][0] + R[1][0]) / 2
BW, BH = int(round(centre - L[1][0])), int(round(L[2][1] - L[1][1]))
canon = np.float32([[0, 0], [BW, 0], [BW, BH], [0, BH]])
ML = cv2.getPerspectiveTransform(np.float32(L), canon)
# The right shutter, mirrored so its outer stile is on the left too.
MR = cv2.getPerspectiveTransform(np.float32(R), canon)


def quad_mask(q):
    return cv2.fillPoly(np.zeros((H, W), np.uint8), [np.int32(np.round(q))], 1) > 0


def to_canon(img, M, interp=cv2.INTER_CUBIC):
    return cv2.warpPerspective(img, M, (BW, BH), flags=interp, borderMode=cv2.BORDER_REPLICATE)


cL = to_canon(rgb, ML)
cR = to_canon(rgb, MR)
hL = to_canon(hands.astype(np.float32), ML, cv2.INTER_LINEAR) > 0.05
hR = to_canon(hands.astype(np.float32), MR, cv2.INTER_LINEAR) > 0.05

# The traced outlines are a pixel or two off each other; line the right
# shutter's slats and stiles up with the left's on their clean upper half.
gL = cv2.cvtColor(cL.astype(np.float32), cv2.COLOR_BGR2GRAY)
gR = cv2.cvtColor(cR.astype(np.float32), cv2.COLOR_BGR2GRAY)
win = np.outer(np.hanning(200), np.hanning(BW)).astype(np.float32)
(dx, dy), _ = cv2.phaseCorrelate(gR[10:210], gL[10:210], win)
shift = np.float32([[1, 0, dx], [0, 1, dy]])
cR2 = cv2.warpAffine(cR, shift, (BW, BH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
hR2 = cv2.warpAffine(hR.astype(np.float32), shift, (BW, BH)) > 0.05

# One clean shutter from the two: wherever either is in shadow (his, or his
# hand's), the brighter one is right; under a hand, the other one.
lumL, lumR = cv2.GaussianBlur(gL, (0, 0), 4), cv2.GaussianBlur(cv2.warpAffine(gR, shift, (BW, BH)), (0, 0), 4)
pick_r = np.clip((lumR - lumL) / 12 + 0.5, 0, 1)  # soft "R is brighter"
grow = lambda m: cv2.GaussianBlur(cv2.dilate(m.astype(np.float32), np.ones((7, 7))), (0, 0), 2)
pick_r = np.maximum(pick_r, grow(hL))
pick_r = np.minimum(pick_r, 1 - grow(hR2))
clean = cL * (1 - pick_r[..., None]) + cR2 * pick_r[..., None]

# Front leaves: the photo, with each hand's hole taken from the clean shutter
# relit to match the photo around it.
# His right hand casts a shadow on its shutter; it goes when he lets go.
hand_shadow = cv2.fillPoly(np.zeros((H, W), np.uint8), [np.int32([(521, 432), (560, 434), (563, 450), (549, 465), (529, 465), (521, 456)])], 1) > 0
# (Transparent pixels are black; extend the photo into them first so the
# blend doesn't pull black in at a shutter's edge.)
leaf = cv2.inpaint(rgb.astype(np.uint8), (~alpha).astype(np.uint8), 3, cv2.INPAINT_TELEA).astype(np.float32)
for M, m in ((ML, left), (MR, right)):
    c = clean if m is left else cv2.warpAffine(clean, np.float32([[1, 0, -dx], [0, 1, -dy]]), (BW, BH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    back = cv2.warpPerspective(c, np.linalg.inv(M), (W, H), flags=cv2.INTER_CUBIC)
    inside = quad_mask(L if m is left else R)
    hole = (hands | hand_shadow) & m & inside
    if not hole.any():
        continue
    grown = cv2.dilate(hole.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    # Local light: the photo's brightness over the clean shutter's, measured
    # on a ring around the hole and spread smoothly across it.
    ring = (cv2.dilate(grown.astype(np.uint8), np.ones((13, 13), np.uint8)) > 0) & ~grown & m & ~hands & inside
    k = lambda img: cv2.GaussianBlur(img, (0, 0), 12)
    r = ring.astype(np.float32)[..., None]
    gain = (k(leaf * r) + 1e-3) / (k(back * r) + 1e-3)
    gain = np.clip(gain, 0.7, 1.35)
    w = cv2.GaussianBlur(grown.astype(np.float32), (0, 0), 1.2)[..., None]
    leaf = leaf * (1 - w) + back * gain * w
# Fingers that curl past a shutter's edge have no shutter behind them.
off = hands & ~(quad_mask(L) | quad_mask(R))
# Each leaf is cropped to its shutter (whole pixels), so the plane that swings
# is no bigger than the shutter.
def crop(m):
    ys_, xs_ = np.nonzero(m)
    return [int(xs_.min()), int(ys_.min()), int(xs_.max()) + 1, int(ys_.max()) + 1]


boxes = {}
for name, m in (("leaf-l", left & ~off), ("leaf-r", right & ~off)):
    x0, y0, x1, y1 = boxes[name] = crop(m)
    save(name, leaf[y0:y1, x0:x1], np.where(m, A, 0)[y0:y1, x0:x1])
save("hands", rgb, np.where(hands, A, 0))

# Backs, as they show once closed: left has its hinge on the left, right on
# the right, so the outer stiles meet in the middle. The right one gets a
# touch less light, as the photo's shutters do.
opaque = np.full((BH, BW), 255, np.uint8)
save("back-l", clean[:, ::-1], opaque)
save("back-r", clean * 0.97, opaque)

# ---------------------------------------------------------------- scene
# Behind each shutter the frame's outer jamb was never photographed. The
# frame is symmetric about its centre, and the left jamb's hidden strip is
# the visible jamb mirrored about the hinge.
fx = (L[1][0] + R[1][0]) / 2 + 2.6  # the frame's centre (top bar 218..540)
JAMB_Y = slice(44, 473)


def jambs(img):
    out_ = img.copy()
    for x in range(216, 229):
        out_[JAMB_Y, x] = img[JAMB_Y, int(round(2 * 228.5 - x))]
    for x in range(521, 543):
        out_[JAMB_Y, x] = out_[JAMB_Y, int(round(2 * fx - x))]
    return out_


scene = jambs(rgb)
scene_a = np.where(shutters, 0, A).astype(np.float32)
scene_a[JAMB_Y, 216:229] = 255
scene_a[JAMB_Y, 521:543] = 255
save("scene", scene, scene_a)

# ---------------------------------------------------------------- room
# Him painted out: down each column, between the nearest clean pixels above
# and below (only below while still inside the opening, so the sill isn't
# smeared up the wall).
gone = cv2.dilate((person & ~shutters).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
gone &= scene_a > 0
room = scene.copy()
SILL = 457
for x in range(W):
    col = gone[:, x]
    if not col.any():
        continue
    y = 0
    while y < H:
        if not col[y]:
            y += 1
            continue
        y0 = y
        while y < H and col[y]:
            y += 1
        y1 = y  # first clean row below
        above = room[y0 - 1, x] if y0 > 0 else None
        below = room[y1, x] if y1 < SILL else None
        n = y1 - y0
        for k in range(n):
            t = (k + 1) / (n + 1)
            if above is not None and below is not None:
                room[y0 + k, x] = above * (1 - t) + below * t
            else:
                room[y0 + k, x] = above if above is not None else below
# Columns filled one by one leave streaks; soften across, and give back the
# photo's grain.
soft = cv2.GaussianBlur(room, (0, 0), sigmaX=2.2, sigmaY=0.6)
w = cv2.GaussianBlur(gone.astype(np.float32), (7, 7), 0)[..., None]
grain = np.random.default_rng(7).normal(0, 3.2, room.shape[:2])[..., None]
room = jambs(scene * (1 - w) + (soft + grain) * w)
save("room", room, scene_a)


print(json.dumps({
    "size": [W, H],
    "hingeL": round((L[1][0] + L[2][0]) / 2, 2),
    "hingeR": round((R[1][0] + R[2][0]) / 2, 2),
    "back": {"top": L[1][1], "w": BW, "h": BH},
    "leafL": boxes["leaf-l"],
    "leafR": boxes["leaf-r"],
    # The dark opening a plane can fly into.
    "opening": [240, 52, 512, 458],
}))
