# On-device ball detector (Part 2) — build notes

Status: **built, flag-gated OFF, trusted for nothing.** The hosted Roboflow path
(`supabase/functions/pitch-velocity-measure`) remains the only detector that produces
any athlete-visible number, and is untouched by this work.

## What exists

| File | Role |
|---|---|
| `src/lib/cv/ball/types.ts` | Prediction shape, byte-compatible with the stored hosted `detections` jsonb; shared `pickBallPrediction` |
| `src/lib/cv/ball/onDeviceBallDetector.ts` | ONNX Runtime Web detector: letterbox → CHW float32 → YOLOv11 decode → class-wise NMS. Kill switch `ON_DEVICE_BALL_DETECTOR_ENABLED = false` |
| `src/lib/cv/ball/parity.ts` | Frame-for-frame comparison against stored hosted detections. `verdict: parity \| divergent \| insufficient_data` |
| `src/lib/cv/ball/__tests__/` | Geometry round-trip, decode, NMS determinism, parity verdicts, kill-switch assertions |

Nothing else in the app imports these modules.

## Licensing

Same BaseballCV `ball_tracking_v4` weights already cleared directly with the maintainers.
On-device is a delivery-mechanism change (browser ONNX Runtime instead of hosted Roboflow
inference), not a new model or a new grant — the existing clearance covers it.

## Model asset

Expected at `public/models/ball_tracking_v4.onnx` (served as `/models/ball_tracking_v4.onnx`),
an Ultralytics ONNX export of the same checkpoint at 640×640, output head
`[1, 4 + numClasses, numAnchors]`, class order `glove, homeplate, baseball, rubber`.

The asset is **not committed** — it is a large binary and belongs alongside
`pose_landmarker_full.task` in the deployed `public/models/` directory. When it is absent the
detector returns `{ ok: false, reason: "model_asset_missing" }`.

## Honesty rule

The detector distinguishes *cannot run* from *no ball present*:

- `not_enabled`, `model_asset_missing`, `runtime_unavailable`, `decode_failed` → `ok: false`.
- Only a successful run returns frames, and a frame with no ball carries `chosen: null`.

There is no path where a failed run degrades into an empty prediction set that downstream
math could read as a measurement. Missing stays missing.

## Trust gate

Before the flag may be flipped:

1. Pull a real `cv_velocity_measurements` row and its `detections` jsonb (hosted output).
2. Re-run the on-device detector over the **same** stored `cv_calibration_frames`
   (`runOnDeviceBallDetection(..., { bypassFlag: true })`).
3. `runBallDetectorParity(hostedFrames, onDeviceFrames)` must return `verdict: "parity"` —
   every frame either `match` (IoU ≥ 0.7 and confidence within 0.10) or `agreed_absent`.
4. Repeat across multiple sessions and both sports.

Any `box_mismatch`, `confidence_mismatch`, `on_device_only`, `hosted_only` or `frame_missing`
frame is a divergence and blocks the swap. Note that hosted runs on current 30 fps phone
footage frequently detect nothing at all — a parity run over such a session proves only that
both sides agree on absence, not that either detects a ball.

## Execution notes

- WebGPU first, WASM fallback, single cached `InferenceSession` per page.
- Frames processed **sequentially**, and separately from MediaPipe Pose, so the two on-device
  models never contend for GPU memory.
- Thresholds mirror the hosted call: confidence 0.15, IoU/overlap 0.30.
- Once trusted, the on-device path removes the ~45 billable inference calls per pitch that the
  hosted path currently spends; the hosted path stays as fallback regardless.
