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

The model is a 218MB binary — too large for git — so it lives on the Lovable
Assets CDN. The pointer is `public/models/ball_tracking_v4.onnx.asset.json`;
`MODEL_ASSET_PATH` in the detector points at the same-origin CDN URL
(`/__l5e/assets-v1/db8bc163-1c3b-411d-87ad-d55407d747ea/ball_tracking_v4.onnx`).
It is an Ultralytics ONNX export (opset 12, simplified) of the same checkpoint
at 640×640, output head `[1, 4 + numClasses, numAnchors]`, class order
`glove, homeplate, baseball, rubber`. If the asset is ever unreachable the
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

## Parity run 1 — 2026-08-28 (FAILED, flag stays off)

Input: one real 60 fps pitch clip (1206×1866), frames 20–34 exported as identical
JPEGs and fed byte-for-byte to both detectors.

- Hosted (`detect.roboflow.com`, model `baseball-pitch-velocity/1`, confidence 15,
  overlap 30, run through a throwaway probe function since no
  `cv_velocity_measurements` rows exist): 14 frames empty, 1 detection on frame 33
  (21×49 px "baseball" at x=10.5 — image edge, confidence 0.41).
- On-device (CDN ONNX asset, WASM backend, same thresholds): a stationary
  ~34×29 px "baseball" at (955, 571) on frames 20–31, confidence 0.28–0.67;
  nothing on 32–34. Visual inspection of frame 27 shows no ball at that point —
  it is a false positive on static field/background content.

`runBallDetectorParity` verdict: **divergent** — 15 frames compared, 0 matches,
2 agreed_absent, 12 `on_device_only`, 1 `hosted_only`.

The two paths do not agree, so the swap is blocked. Direction of divergence
(on-device detects more, hosted almost nothing) points at the hosted deployment
being a different artifact than the local ONNX export — the Roboflow model is an
externally-uploaded checkpoint under a different model id, not necessarily the
same `ball_tracking_v4` weights the ONNX was exported from. That has to be
resolved before parity can mean anything. Runtime itself is fine: model fetched,
session created, 15 frames decoded in ~159 s on WASM (single-thread, headless).
