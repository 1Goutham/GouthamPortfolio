# Live hero portrait: asset pipeline

These scripts take `public/heropageprofile.png` apart into the layers the
live portrait (`src/app/components/portrait/live-portrait.js`) puts back
together in WebGL. Run them again only if the photo changes.

| Step | Script | What it does |
| --- | --- | --- |
| 1 | `landmarks.py` | MediaPipe Face Landmarker: iris centres and radii, eyelid outlines |
| 2 | `eyes.py` | lifts the irises out, rebuilds the whites behind them, makes full iris disks, the catchlights and the lid shadow |
| 3 | `depth_text.py` | MiDaS depth map of the face; separates the "[Vanakamm!]" lettering and paints it out of the base |
| 4 | `make_assets.py` | packs `public/portrait/*` and `src/app/components/portrait/portrait-data.json` |

## Setup

```sh
python3 -m venv .venv
.venv/bin/pip install mediapipe opencv-python-headless onnxruntime numpy pillow scipy
mkdir -p models out
curl -L -o models/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
curl -L -o models/midas_small.onnx \
  https://github.com/isl-org/MiDaS/releases/download/v2_1/model-small.onnx
```

MediaPipe needs `libEGL` on Linux (`apt-get install libegl1`).

## Run

```sh
P=public/heropageprofile.png
.venv/bin/python scripts/portrait/landmarks.py   $P models/face_landmarker.task out/lm.json
.venv/bin/python scripts/portrait/eyes.py        $P out/lm.json out
.venv/bin/python scripts/portrait/depth_text.py  $P out/base_noiris.png models/midas_small.onnx out
.venv/bin/python scripts/portrait/make_assets.py out public/portrait src/app/components/portrait/portrait-data.json
```

Each step also writes debug views into `out/` (`lm_eyes.png`, `depth_view.png`,
`text_view.png`, `clean_view.png`) worth a look before shipping.

Two numbers in the shader are measured on this photo and may need a look for
a new one: `LASH` (height of the dark lash line above the eye opening) and
`SKIN_LO` / `TOP` (the band of clean lid skin above it used for blinks).
