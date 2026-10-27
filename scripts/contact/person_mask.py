"""Person mask of the window photo, for window.py.

    python scripts/contact/person_mask.py public/window.png models/selfie_multiclass.tflite out/person.png
"""
import sys, numpy as np, mediapipe as mp, cv2
from mediapipe.tasks.python import vision, BaseOptions
src, model, out = sys.argv[1:4]
rgba = cv2.imread(src, cv2.IMREAD_UNCHANGED)
a = rgba[:, :, 3:4] / 255.0
rgb = (rgba[:, :, :3] * a + 255 * (1 - a)).astype(np.uint8)[:, :, ::-1].copy()
seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=model), output_confidence_masks=True))
res = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
# classes: 0 bg, 1 hair, 2 body-skin, 3 face-skin, 4 clothes, 5 others
m = sum(res.confidence_masks[k].numpy_view() for k in (1, 2, 3, 4))
cv2.imwrite(out, (np.clip(m, 0, 1) * 255).astype(np.uint8))
