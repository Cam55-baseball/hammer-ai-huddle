# MediaPipe Pose vs AI-vision angle estimation — evaluation report

Status: **evaluation only. Nothing live was changed.** No tile was swapped.

Date of run: see git history. Harness lives outside the app (`/tmp/pv/mp_eval.py`,
`ai_eval.py`, `perturb.py`) — deliberately not added to the shipping codebase.

## What was tested

- **Method A (current, live):** `google/gemini-2.5-flash`, temperature 0, 12 sequential
  frames as image parts — same call shape as `supabase/functions/analyze-video`.
  Prompts copied from `bp.contract.ts` / `sp.contract.ts`.
- **Method B (candidate):** MediaPipe Pose Landmarker (heavy, float16, Apache 2.0),
  33 landmarks per frame, angles computed from pixel coordinates.
- **Footage:** the 4 real user clips already on hand — `a.mov` (30fps, 116f),
  `b.mov` (30fps, 284f), `c.mp4` (60fps, 688f), `d_softball.mov` (30fps, 102f).
- Tiles covered: the 6 live BP tiles (`tempo_sec`, `energy_angle_deg`, `lift_thrust_deg`,
  `premature_shoulder_open_deg`, `shoulder_tilt_deg`, `head_vertical_movement_pct`) and
  a 6-metric sample of the 13 SP windmill tiles.

## Result 1 — repeatability (identical input, 3 runs)

| Method | a.mov | b.mov | c.mp4 | d_softball.mov |
|---|---|---|---|---|
| MediaPipe | identical | identical | identical | identical |
| AI-vision (temp 0) | identical | all-null | all-null | identical |

At temperature 0 with byte-identical frames, the AI method did **not** wobble. So the
often-assumed "LLM is non-deterministic" failure did not show up in this test. That is
a real finding and it is reported as-is.

## Result 2 — stability under a ±1 frame sampling shift (the realistic case)

Real uploads never re-extract byte-identical frames. Shifting the sample window by one
frame is the honest stability test.

`a.mov` (baseball):

| Metric | MediaPipe spread | AI-vision spread |
|---|---|---|
| energy_angle_deg | **1.0°** | **135°** (None / 150 / 15) |
| shoulder tilt | 23.2° | 0° |
| head vertical movement % | 4.4 pts | 0 pts (but see Result 4) |
| tempo_sec | n/a (2D, needs anchors) | 0.08 s |

`d_softball.mov` (windmill):

| Metric | MediaPipe spread | AI-vision spread |
|---|---|---|
| energy angle | 5.1° | — |
| shoulder tilt | 3.0° | — |
| sfc_hip_shoulder_rotation_deg | — | **50°** |
| sfc_knee_ankle_deg | — | **70°** (80 / 10 / 10) |
| windup checkpoints A–C | — | 0–5° |

MediaPipe's spreads are small and explainable (the frame genuinely moved). The AI method's
worst cases are not explainable as motion: 15° vs 150° for the same energy angle, and 10°
vs 80° for the same knee/ankle checkpoint, are category errors, not measurement noise.

## Result 3 — coverage

- MediaPipe detected a pose on 12/12, 9/12, 5/11 and 12/12 sampled frames
  (mean landmark visibility 0.79 / 0.75 / 0.47 / 0.84). `c.mp4` is the weak clip —
  small subject, 720p, distant framing.
- AI-vision returned **all-null for every metric on b.mov and c.mp4** — two of four real
  clips produced no measurement at all. MediaPipe produced landmarks on both.

## Result 4 — accuracy, stated honestly

There is **no ground truth** in this sample — no marker-based capture, no hand-labelled
angles. So neither method can be called "accurate" yet. What can be said:

- AI-vision returns suspiciously round numbers (10, 15, 75, 100, 150) across every clip
  and every metric. That is the signature of an estimate anchored to a plausible-value
  prior, not a measurement taken off the image.
- MediaPipe returns continuous values traceable to specific pixel coordinates, which can
  be overlaid and visually audited frame by frame.
- MediaPipe's own raw numbers are **not usable as-is**: `head_vertical_movement_pct` came
  out 130% on b.mov and 487% on c.mp4, and `stride_pct_of_height_max` hit 197%. Those are
  not pose failures — they are the harness's naive normalisation (height taken from the
  first frame, camera pan and subject-scale change unhandled). Any real swap needs
  per-frame scale normalisation and phase anchors (peak lift / foot strike / release),
  not just landmarks.

## Recommendation

MediaPipe is the better foundation — auditable coordinates, no all-null failures, no
150°-vs-15° swings under a one-frame shift — but it is **not a drop-in today**. The
missing pieces are the same ones already blocking the showcase-future tiles: phase anchor
detection and scale calibration.

Suggested order, one tile at a time, each gated on the previous:

1. `shoulder_tilt_deg` — pure two-landmark angle, no anchor needed. Lowest risk first swap.
2. `energy_angle_deg` — needs only a peak-leg-lift anchor (max knee-rise, already computed).
3. `head_vertical_movement_pct` — needs per-frame scale normalisation first.
4. `premature_shoulder_open_deg` — needs a foot-strike anchor; 2D hip/shoulder separation
   is view-dependent and should carry a camera-angle gate.
5. `tempo_sec` — anchor-dependent; requires verified fps, already a known gap.
6. `lift_thrust_deg` — last, definition needs tightening before it can be computed.

Each swap should ship behind the Release-1 classification, be validated against
hand-labelled angles on at least 20 clips, and keep the AI-vision path as fallback until
detection rate on real phone footage is measured, not assumed.

## ByteTrack compatibility (flagged, not built)

Compatible with both existing pieces, no surprises expected:

- ByteTrack consumes per-frame boxes `[x1, y1, x2, y2, score]` plus a frame index. Roboflow
  inference (already used by `pitch-velocity-measure`) returns exactly that shape; Roboflow's
  own `supervision` library ships a ByteTrack implementation that accepts its `Detections`
  objects directly.
- MediaPipe Pose returns landmarks, not boxes — but a per-person box is the trivial
  min/max of the 33 landmarks, so pose output feeds ByteTrack with a few lines of glue.
- ByteTrack is tracking-by-detection and model-agnostic: it never re-runs detection, so it
  adds no model dependency and no inference credit cost. It is the right piece for
  baserunning splits and defensive routes when those come up.
