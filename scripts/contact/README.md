# Contact window: asset pipeline

`window.py` takes `public/window.png` apart into the layers the contact
section's window (`src/app/components/contact.tsx`) animates: the room, him,
his hands, and the two shutters (as photographed, and closed). Run it again
only if the photo changes, and copy the geometry it prints into `WIN` in the
component.

```sh
python3 -m venv .venv
.venv/bin/pip install mediapipe opencv-contrib-python-headless numpy pillow
mkdir -p models out
curl -L -o models/selfie_multiclass.tflite \
  https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite

.venv/bin/python scripts/contact/person_mask.py public/window.png models/selfie_multiclass.tflite out/person.png
.venv/bin/python scripts/contact/window.py public/window.png out/person.png public/contact
```

The shutter outlines, his right hand and its shadow are traced by hand in
`window.py`; they need retracing for a different photo.
