"""Find face, eye and iris landmarks on the hero portrait and draw them."""
import json
import sys

import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
from PIL import Image, ImageDraw

SRC, MODEL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

im = Image.open(SRC).convert("RGBA")
W, H = im.size
bg = Image.new("RGBA", im.size, (128, 128, 128, 255))
bg.alpha_composite(im)
rgb = np.array(bg.convert("RGB"))

opts = vision.FaceLandmarkerOptions(
    base_options=mpt.BaseOptions(model_asset_path=MODEL),
    num_faces=1,
    output_face_blendshapes=True,
)
det = vision.FaceLandmarker.create_from_options(opts)
res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
if not res.face_landmarks:
    print("no face")
    sys.exit(1)

lm = [(p.x * W, p.y * H, p.z * W) for p in res.face_landmarks[0]]

# MediaPipe indices (subject's right eye is on image left).
EYES = {
    "left_img": {  # subject's right eye
        "iris": [468, 469, 470, 471, 472],
        "contour": [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
    },
    "right_img": {  # subject's left eye
        "iris": [473, 474, 475, 476, 477],
        "contour": [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382],
    },
}

out = {"size": [W, H], "eyes": {}, "landmarks": lm}
for name, e in EYES.items():
    c = lm[e["iris"][0]]
    ring = [lm[i] for i in e["iris"][1:]]
    r = float(np.mean([np.hypot(p[0] - c[0], p[1] - c[1]) for p in ring]))
    out["eyes"][name] = {
        "center": [c[0], c[1]],
        "radius": r,
        "contour": [[lm[i][0], lm[i][1]] for i in e["contour"]],
    }
if res.face_blendshapes:
    bs = {b.category_name: round(b.score, 3) for b in res.face_blendshapes[0]}
    out["blend"] = {k: v for k, v in bs.items() if "eye" in k.lower()}

json.dump(out, open(OUT, "w"), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != "landmarks"}, indent=1)[:1500])

# Debug overlay, cropped around the eyes.
dbg = bg.convert("RGB")
d = ImageDraw.Draw(dbg)
for e in out["eyes"].values():
    d.polygon([tuple(p) for p in e["contour"]], outline=(255, 0, 0))
    cx, cy = e["center"]
    r = e["radius"]
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(0, 255, 255))
xs = [p[0] for e in out["eyes"].values() for p in e["contour"]]
ys = [p[1] for e in out["eyes"].values() for p in e["contour"]]
box = (int(min(xs) - 60), int(min(ys) - 60), int(max(xs) + 60), int(max(ys) + 60))
crop = dbg.crop(box)
crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS).save(OUT.replace(".json", "_eyes.png"))
dbg.resize((W // 2, H // 2)).save(OUT.replace(".json", "_full.png"))
print("eye box", box)
