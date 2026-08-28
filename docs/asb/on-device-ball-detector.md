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

## Model identity resolved — 2026-08-28: SAME WEIGHTS

The Phase-1 hypothesis ("hosted may be a different artifact") is **wrong**. Both sides
were checked against real metadata, then against each other numerically.

**Hosted** (`api.roboflow.com`, workspace `55cam316-gmail-com`, project
`baseball-pitch-velocity`, version `1`, created 2026-08-26):
`modelType: yolov11x`, training job `jobType: "external-upload"`,
`externalUpload: true`, project contains **0 images / 0 annotations**
(dataset export is an empty zip). Nothing was trained on Roboflow — a
finished checkpoint was uploaded and served.

**On-device ONNX** (metadata_props read off the CDN binary):
`Ultralytics YOLO11x`, `task detect`, `imgsz [640,640]`, `opset 12`,
`simplify True`, input `images [1,3,640,640]`, output `output0 [1,8,8400]`
(4 box + 4 class rows), names `{0: glove, 1: homeplate, 2: baseball, 3: rubber}`.

**Numeric identity test** — one synthetic 640×640 JPEG sent byte-identically to both:

| | class | class_id | box (x,y,w,h) | confidence |
|---|---|---|---|---|
| hosted Roboflow | baseball | 2 | 320.0, 311.5, 26.0, 21.0 | 0.046766 |
| local ONNX (CPU) | baseball | 2 | 320.2, 311.6, 25.8, 21.4 | 0.0467 |

Same architecture, same class count, same class order, same box, same confidence to
four decimals. **They are the same weights.**

### So what caused the divergence?

Not the model — the **input pipeline**. The parity frames were 1206×1866 (non-square);
the on-device path letterboxes to 640×640 (grey padding, aspect preserved) while the
hosted Roboflow path resizes the frame to 640×640 by stretch (version preprocessing is
empty, so the server does its own fit). Two different tensors go into the same network,
so two different detection sets come out — including the stationary on-device false
positive, which is background content distorted by the aspect change.

Next step for parity is therefore a preprocessing fix, not a model hunt: match the
hosted resize exactly (stretch to 640×640, no letterbox) before re-running the harness.
Flag stays `false`.

## Preprocessing fix + parity run 2 — 2026-08-28 (still divergent, flag stays off)

**Change:** on-device preprocessing now matches the hosted path exactly.
`computeLetterbox`/`unletterbox` are gone, replaced by `computeStretch`/`unstretch`
(non-uniform scale per axis, `drawImage(bitmap, 0, 0, 640, 640)`, no grey pad).
Box coordinates un-map by dividing each axis by its own scale.

**Re-run:** same clip, same frames (60 fps, 1206×1866, frames 20–34), exported once
as JPEGs and fed byte-identically to both sides — hosted `detect.roboflow.com`
(`baseball-pitch-velocity/1`, confidence 15, overlap 30) and the on-device module in a
real headless browser (WebGPU unavailable → WASM), same thresholds.

| frame | hosted | on-device |
|---|---|---|
| 20–31 | — | — |
| 32 | — | baseball 0.159 @ (11, 803) 21×49 |
| 33 | baseball 0.362 @ (10, 800) 21×49 | baseball 0.375 @ (11, 799) 21×49 |
| 34 | — | — |

`runBallDetectorParity` verdict: **divergent** — 15 compared, 1 match, 13 agreed_absent,
1 `on_device_only` (frame 32).

The stationary 12-frame false positive from run 1 is **gone** — it was the aspect
distortion, exactly as predicted. Frame 33 now matches within tolerance (IoU well above
0.7, confidence delta 0.013). The single remaining divergence is a threshold-boundary
artifact, not a disagreement: re-querying hosted on frame 32 at confidence 5 returns the
**same box** (10, 802, 21×50) at **0.1228** — hosted scores that object just under the
0.15 gate, on-device scores it 0.159 just over. Same detection, ~0.036 score difference
straddling the cutoff (residual JPEG/resample rounding between a server-side resize and
a canvas resize).

Honest verdict: **not parity**. The harness is strict by design and this frame fails it.
`ON_DEVICE_BALL_DETECTOR_ENABLED` stays `false`. What would close it is either
demonstrating agreement on footage where detections sit away from the threshold, or an
explicit decision that near-threshold single-frame disagreement is acceptable — that is a
judgment call, not something the harness can silently absorb.
