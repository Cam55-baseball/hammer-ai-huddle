# Canonical Measurement Architecture — BH Metrics

Status: **specification only**. Permanent source of truth for how every BH
metric should be measured in production. No implementation, no roadmap,
no schema/prompt/UI changes. Supersedes prior interpretation only as a
specification; does not modify current behavior.

Cross-refs (read-only):
- `.lovable/analysis-truth-audit.md` (S1–S11)
- `.lovable/analysis-truth-extraction.md`
- `.lovable/bat-path-vs-on-plane-definitions.md`
- `.lovable/p3-timing-methodology.md`
- `.lovable/time-to-contact-vs-power.md`
- `.lovable/back-elbow-methodology.md`
- `.lovable/finish-and-balance-methodology.md`

---

## Part 0 — Preamble

### Purpose
Define, per BH metric, the **canonical production measurement contract**:
what is measured, how, with which detectors/landmarks/anchors, at what
frame density, with what calibration, with what missingness and
confidence semantics, and what minimum capture envelope supports it.

### Measurement categories
- **deterministic** — produced by closed-form geometry on pose / bat /
  ball keypoints. The model is not in the value path. Given identical
  inputs and pinned engine versions, output is byte-identical.
- **AI-assisted** — value is produced by a model that consumes
  deterministically extracted pose/event traces. Inputs to the model are
  deterministic; the model's interpretation step is the only stochastic
  layer. Replay equivalence is required (pinned model + temperature 0 +
  seeded).
- **hybrid** — deterministic geometry produces the primary numeric
  channel; the model produces a bounded judgement on residual qualities
  (e.g., shape, "looks-correct"). The deterministic channel is
  authoritative; the model channel can only shade confidence within a
  declared envelope.

AI-only (no deterministic geometry, no extracted trace, model judges
raw frames) is **not a permitted production category** in this
architecture. It is documented as the **current** implementation in the
audit and is explicitly out-of-spec going forward.

### Canonical capture envelope
- **Phone-only baseline:** single rear-camera capture, side-on to the
  hitter (camera perpendicular to the line from pitcher to batter),
  full body in frame from above the head to below the back foot, 1080p,
  ≥60 fps target, ≥30 fps floor, tripod or stabilized mount, ambient
  light sufficient for the phone to hold ≥1/240s shutter.
- **Side-on definition:** open-side hip facing the camera; bat travels
  in the camera plane through contact. Front-on / catcher-view captures
  are out-of-envelope for any bat-plane metric and must be rejected
  with `out_of_frame`-class missingness.
- **Multi-camera envelope:** adds an overhead or front-on second camera.
  Required only where called out per metric.
- **External-sensor envelope:** adds an instrumented bat (e.g., bat
  sensor) or radar. Optional uplift; never required for a phone-only
  metric to be production-eligible.

### Canonical detector stack
- **D-POSE** — MediaPipe Pose Landmarker (Blazepose Full, world
  landmarks + 2D normalized). Baseline for every metric.
- **D-RELEASE** — pitcher-release event detector (small classifier over
  pose + frame crops, or audio-assisted where mic-quality allows).
- **D-PLANT** — front-foot plant detector (ankle/heel y-velocity zero-
  crossing with vertical-load gate).
- **D-BAT** — bat keypoint detector (knob, mid, barrel-tip) — a
  task-specific small CNN / YOLO-class model. **Not** MediaPipe.
- **D-CONTACT** — contact-frame detector (audio transient + barrel-to-
  ball proximity + barrel deceleration). Audio is uplift, not
  prerequisite.
- **D-BALL** — pitched-ball tracker (small detector + Kalman track).
  Optional uplift for plane reconstruction.

### Confidence model (canonical)
For any tile:
```
tile_confidence =
    landmark_visibility_factor      // min over required landmarks across required frames
  × anchor_temporal_certainty       // 1 - (anchor_jitter_frames / required_resolution_frames)
  × numeric_stability_factor        // 1 - normalized_residual_of_formula
  × calibration_confidence          // 1 if metric is scale-free; else from calibration source
```
All four factors must be in [0,1]. Any factor < 0.5 forces the tile to
`missing` with the dominant factor's `missing_reason`.

### Missingness rules (canonical enum)
Fixed `missing_reason` values used throughout this spec:
- `insufficient_temporal_resolution` — fps below the metric's minimum
  tier, or anchor pair too close to resolve.
- `landmark_occluded` — one or more required landmarks below visibility
  threshold across the required frames.
- `anchor_not_detected` — a required event anchor (release, plant,
  contact, etc.) could not be located with the required confidence.
- `calibration_unavailable` — a required metric calibration prior is
  absent.
- `bat_not_detected` — D-BAT failed to track the required bat keypoints.
- `out_of_frame` — body or bat path leaves the frame during the
  measurement window, or the capture is not side-on when side-on is
  required.
- `single_pass_only` — model-only legacy path; **prohibited as a
  production state under this spec**, retained only to describe
  legacy behavior in cross-references.

---

## Part 1 — Cross-cutting requirements

### Frame-density tiers
- **T-low** — ≥30 fps. Suitable for posture, balance, and gross
  positional metrics where the measurement window spans ≥10 frames.
- **T-mid** — ≥60 fps. Required for stride-direction, heel-plant timing,
  shoulder-plane and bat-path **shape** measurements.
- **T-high** — ≥120 fps. Required for any metric whose value is a small
  inter-frame time delta (`time_to_contact`) or a per-frame velocity at
  contact (`bat_speed_contact`).

At T-low (30 fps), the smallest resolvable temporal delta is ≈33.3 ms,
which is greater than the entire "perfect" deadband proposed for
`p3_timing` and the entire "elite tier" headroom for `time_to_contact`.
Metrics whose required resolution is finer than the frame interval
**must** report `missing` with `insufficient_temporal_resolution`, never
a fabricated number.

### Event anchors (canonical)
Each anchor has a detector, a permitted source set, a required minimum
confidence, and a fallback that must be `anchor_not_detected` (never a
guess).

| Anchor | Detector | Permitted sources | Min conf. | Fallback |
|---|---|---|---|---|
| `pitcher_release_frame` | D-RELEASE | pose+crop, audio-assist | 0.7 | missing |
| `front_foot_first_contact` | D-PLANT | pose | 0.7 | missing |
| `front_foot_full_plant` | D-PLANT | pose | 0.7 | missing |
| `hand_load_apex` | D-POSE derivative | pose | 0.6 | missing |
| `swing_initiation` | D-POSE wrist accel + D-BAT knob accel | pose+bat | 0.7 | missing |
| `bat_lag_max` | D-BAT | bat | 0.6 | missing |
| `barrel_in_zone_entry` | D-BAT + plane estimate | bat (+ optional D-BALL) | 0.6 | missing |
| `contact_frame` | D-CONTACT | bat+pose (+ optional audio) | 0.8 | missing |
| `barrel_in_zone_exit` | D-BAT + plane estimate | bat (+ optional D-BALL) | 0.6 | missing |
| `finish_frame` | D-POSE stillness | pose | 0.6 | missing |

### Landmarks of interest
Shoulders L/R, elbows L/R, wrists L/R, hips L/R, knees L/R, ankles L/R,
heels L/R, foot index L/R, head/nose, ears L/R. All from D-POSE
(Blazepose Full). Bat keypoints knob/mid/barrel-tip from D-BAT. Ball
center from D-BALL when used.

### Calibration framework
- **Intrinsic** — focal length and lens distortion. Phone-provided via
  EXIF/metadata when available; otherwise estimated from a one-time
  calibration capture. Required only for any metric that converts pixel
  distance to physical distance.
- **Extrinsic** — camera-to-batter pose. Estimated from the side-on
  envelope plus hitter standing-height landmarks.
- **Metric scaling priors** — bat-length prior (user-entered length;
  default 33 in is **low-confidence**, must propagate into calibration
  confidence), hip-width prior (age/level-derived, low-confidence),
  optional on-screen calibration card (high-confidence). Scale-free
  metrics (booleans, angles, ratios, percentages of swing duration)
  do not require metric scaling.

### Phone-only support criterion
A metric is **phone-only-supportable** iff every required detector and
calibration prior can be sourced from a single rear-camera capture at
the metric's minimum frame-density tier under the canonical envelope,
**without** requiring an external sensor, a second camera, or a
calibration object the user is unlikely to have.

### Production-readiness gate
A metric is **production-ready** iff:
1. Category is deterministic or hybrid.
2. All required detectors are specified, version-pinned, and benchmarked
   on a labeled dataset for the required anchors/landmarks.
3. Calibration path is defined and its uncertainty propagates into
   tile confidence.
4. Missingness rules are enforced server-side, not at the UI.
5. Confidence formula is declared and replay-deterministic.
6. Re-uploads of the same video yield identical values (the
   `seed = stableSeed(videoId)` re-upload nondeterminism documented in
   audit S5 must be eliminated for deterministic and hybrid metrics by
   removing the model from the value path; the model is permitted only
   on residual judgement channels under hybrid).

---

## Part 2 — Per-metric specifications

Schema per metric:
- **Phase**
- **Exact definition** — formal statement of the measured quantity.
- **What is being measured** — physical/biomechanical referent.
- **Measurement category**
- **Required detectors**
- **Required landmarks**
- **Required event anchors**
- **Required frame density**
- **Required calibration**
- **Missingness rules**
- **Confidence methodology**
- **MediaPipe sufficient?**
- **Additional vision systems required**
- **Phone-only capture sufficient?**
- **Production readiness requirements**
- **Recommended implementation path**

Audit row references: S10 #1–18, S11.

---

### 1. `hip_load` — Hip Stability (P1)
- **Phase:** P1.
- **Exact definition:** integral over the load window
  [`stance_start` → `hand_load_apex`] of the horizontal displacement of
  the mid-hip point from its stance baseline, normalized by hip-width
  prior, expressed as a 0–100 score where lower drift → higher score.
- **What is being measured:** lateral hip drift during the load.
- **Category:** deterministic.
- **Detectors:** D-POSE.
- **Landmarks:** hips L/R, knees L/R, ankles L/R (for stance baseline).
- **Anchors:** `hand_load_apex` (window end). Window start = first
  frame of stable pose at clip start.
- **Frame density:** T-low (≥30 fps).
- **Calibration:** scale-free (normalized by hip-width prior — hip-width
  uncertainty enters confidence, not value).
- **Missingness:** hips occluded > 20% of window → `landmark_occluded`;
  load apex not detectable → `anchor_not_detected`.
- **Confidence:** per-frame hip visibility min × anchor certainty for
  `hand_load_apex` × numeric stability of the integral
  (low if pose jitter dominates drift signal).
- **MediaPipe sufficient?** Yes.
- **Additional vision systems:** none.
- **Phone-only sufficient?** Yes.
- **Production readiness:** D-POSE landmark visibility threshold and
  `hand_load_apex` detector benchmarked; hip-width prior policy
  defined.
- **Recommended path:** D-POSE → mid-hip x-trace → baseline subtraction →
  integral → score mapping.

---

### 2. `hand_load` — Hand Load Quality (P2)
- **Phase:** P2.
- **Exact definition:** 0–100 composite of (a) hand-path arc length from
  stance to `hand_load_apex` normalized by shoulder-width, (b) apex
  height relative to back shoulder, (c) hand-path smoothness (inverse
  jerk).
- **What is being measured:** quality of the load action — depth and
  smoothness, not preference for a style.
- **Category:** hybrid. Deterministic channels (a)(b)(c) authoritative;
  model judgement only on style residual within ±10 score points.
- **Detectors:** D-POSE.
- **Landmarks:** wrists L/R, shoulders L/R, elbows L/R.
- **Anchors:** `hand_load_apex`.
- **Frame density:** T-mid (≥60 fps) for smoothness term.
- **Calibration:** scale-free (normalized by shoulder-width).
- **Missingness:** wrist occluded > 20% → `landmark_occluded`; apex not
  detectable → `anchor_not_detected`.
- **Confidence:** wrist/shoulder visibility × `hand_load_apex` certainty
  × smoothness numeric stability.
- **MediaPipe sufficient?** Yes for the deterministic channels.
- **Additional vision systems:** none.
- **Phone-only sufficient?** Yes (T-mid).
- **Production readiness:** smoothness window length fixed; style
  residual envelope declared (±10).
- **Recommended path:** D-POSE wrist track → arc length + apex height +
  jerk → composite → bounded hybrid residual.

---

### 3. `p2_timing` — Hand Load Timing vs Pitcher Event ★ (P2)
- **Phase:** P2.
- **Exact definition:** signed offset, in ms, between
  `hand_load_apex` and a designated pitcher-window anchor
  (canonical choice: `pitcher_release_frame`). Positive = load
  apex after release (late); negative = before (early).
- **What is being measured:** synchronization of the hand load to the
  pitcher's tempo.
- **Category:** deterministic (anchor pair only).
- **Detectors:** D-POSE, D-RELEASE.
- **Landmarks:** wrists, shoulders (for `hand_load_apex`).
- **Anchors:** `hand_load_apex`, `pitcher_release_frame`.
- **Frame density:** T-mid (≥60 fps); T-high preferred.
- **Calibration:** none.
- **Missingness:** either anchor below 0.7 confidence →
  `anchor_not_detected`; pitcher not in frame → `out_of_frame`.
- **Confidence:** anchor certainty product; degraded as fps approaches
  the deadband width.
- **MediaPipe sufficient?** Partial — D-RELEASE is **not** part of
  MediaPipe and must be a separate detector.
- **Additional vision systems:** D-RELEASE (pose+crop classifier or
  audio-assist).
- **Phone-only sufficient?** Conditional — pitcher must be in the same
  frame (typical for side-on hitter captures from behind the L-screen
  or net) and clearly visible; otherwise missing.
- **Production readiness:** D-RELEASE benchmarked on the project's
  capture envelope; tile must be a `score_meter` with asymmetric
  deadband identical in shape to `p3_timing` (see Part 3).
- **Recommended path:** D-RELEASE → release frame; D-POSE wrist track →
  apex frame; signed Δt; score curve.

---

### 4. `eyes_tracking` — Head/Eye Tracking on Ball (P2)
- **Phase:** P2.
- **Exact definition:** 0–100 score combining (a) head-rotation
  smoothness over the load→contact window, (b) head-pitch alignment
  toward estimated ball trajectory, (c) absence of late head-pull
  (chin off back shoulder) before `contact_frame`.
- **What is being measured:** head behavior as a proxy for eye
  discipline.
- **Category:** hybrid. Head kinematics deterministic; "looking-at-ball"
  is a model judgement bounded ±10.
- **Detectors:** D-POSE; D-BALL (uplift, improves component b).
- **Landmarks:** nose, ears L/R, shoulders L/R.
- **Anchors:** `contact_frame`.
- **Frame density:** T-mid.
- **Calibration:** none.
- **Missingness:** face occluded → `landmark_occluded`; contact frame
  not detected → `anchor_not_detected`.
- **Confidence:** face landmark visibility × contact certainty.
- **MediaPipe sufficient?** Partial — head pose yes; eye-direction
  inference is not in baseline MediaPipe Pose. Iris model could uplift
  but is out of envelope.
- **Additional vision systems:** D-BALL (optional).
- **Phone-only sufficient?** Yes.
- **Production readiness:** head-pull detector thresholded against a
  labeled set.
- **Recommended path:** D-POSE head track → smoothness + alignment +
  late-pull check → hybrid composite.

---

### 5. `stride_direction` — Stride Direction Off Square (P3)
- **Phase:** P3.
- **Exact definition:** signed angle, in degrees, between the
  front-foot stride vector (rear ankle at stance → front ankle at
  `front_foot_full_plant`) and the line square to the pitcher
  (perpendicular to camera axis under side-on envelope).
- **What is being measured:** open/closed stride.
- **Category:** deterministic.
- **Detectors:** D-POSE.
- **Landmarks:** ankles L/R, foot index L/R.
- **Anchors:** `front_foot_full_plant`.
- **Frame density:** T-mid.
- **Calibration:** envelope-implicit (square assumes side-on capture).
- **Missingness:** ankles occluded → `landmark_occluded`; plant not
  detected → `anchor_not_detected`; non-side-on capture →
  `out_of_frame`.
- **Confidence:** ankle visibility × plant certainty × side-on
  validation.
- **MediaPipe sufficient?** Yes.
- **Additional vision systems:** none.
- **Phone-only sufficient?** Yes.
- **Production readiness:** side-on capture validator at ingestion.
- **Recommended path:** D-POSE ankle vector at plant → angle vs camera
  axis.

---

### 6. `heel_plant` — Heel Plant Quality (P3)
- **Phase:** P3.
- **Exact definition:** 0–100 score combining (a) heel-first vs
  toe-first plant direction (vertical velocity sign of heel vs toe
  index at `front_foot_first_contact`), (b) plant impulse duration
  from first contact to full plant, (c) post-plant ankle stillness.
- **What is being measured:** plant mechanics and groundedness.
- **Category:** deterministic.
- **Detectors:** D-POSE.
- **Landmarks:** ankles, heels, foot index L/R.
- **Anchors:** `front_foot_first_contact`, `front_foot_full_plant`.
- **Frame density:** T-mid.
- **Calibration:** none.
- **Missingness:** foot landmarks occluded → `landmark_occluded`;
  either plant anchor missing → `anchor_not_detected`.
- **Confidence:** foot visibility × anchor certainty.
- **MediaPipe sufficient?** Yes.
- **Additional vision systems:** none.
- **Phone-only sufficient?** Yes.
- **Production readiness:** plant detector benchmarked at T-mid.
- **Recommended path:** D-POSE ankle/heel y-velocity → plant
  classification → composite.

---

### 7. `p3_timing` — Foot Down vs Release ★ (P3)
- **Phase:** P3.
- **Exact definition:** signed offset, in ms, between
  `front_foot_full_plant` and `pitcher_release_frame`. Positive =
  plant after release (late); negative = before (early). Scored on
  asymmetric deadband (perfect ~0, gentle early-side penalty, steeper
  late-side penalty) per `.lovable/p3-timing-methodology.md`.
- **What is being measured:** synchronization of foot-down to release.
- **Category:** deterministic.
- **Detectors:** D-POSE, D-RELEASE, D-PLANT.
- **Landmarks:** ankles, heels, foot index L/R; pose-crop for release.
- **Anchors:** `front_foot_full_plant`, `pitcher_release_frame`.
- **Frame density:** T-mid minimum; T-high preferred. At T-low the
  resolution (≈33 ms) exceeds the proposed perfect-deadband width,
  forcing `insufficient_temporal_resolution` for any clip below
  the configured fps threshold.
- **Calibration:** none.
- **Missingness:** either anchor under 0.7 confidence →
  `anchor_not_detected`; pitcher not visible → `out_of_frame`; fps
  below threshold → `insufficient_temporal_resolution`.
- **Confidence:** anchor certainty product × fps-relative resolution
  factor.
- **MediaPipe sufficient?** Partial — D-RELEASE is external.
- **Additional vision systems:** D-RELEASE.
- **Phone-only sufficient?** Conditional on pitcher visibility and fps.
- **Production readiness:** D-RELEASE benchmarked; deadband and slopes
  locked in `.lovable/p3-timing-methodology.md`.
- **Recommended path:** D-PLANT plant frame; D-RELEASE release frame;
  signed Δt → asymmetric score curve.

---

### 8. `hands_outside_shoulders_at_landing` ★ (P3)
- **Phase:** P3.
- **Exact definition:** boolean. At `front_foot_full_plant`, evaluate
  whether mid-wrist x-coordinate (rear-hand wrist preferred) lies
  outside the rear-shoulder vertical line, measured in the camera
  plane under side-on envelope.
- **What is being measured:** hand position at landing — depth of the
  load relative to shoulder line.
- **Category:** deterministic.
- **Detectors:** D-POSE.
- **Landmarks:** wrists L/R, shoulders L/R.
- **Anchors:** `front_foot_full_plant`.
- **Frame density:** T-low.
- **Calibration:** envelope-implicit (side-on).
- **Missingness:** wrists/shoulders occluded → `landmark_occluded`;
  plant anchor missing → `anchor_not_detected`; non-side-on capture →
  `out_of_frame`.
- **Confidence:** wrist+shoulder visibility × plant certainty.
- **MediaPipe sufficient?** Yes.
- **Additional vision systems:** none.
- **Phone-only sufficient?** Yes.
- **Production readiness:** wrist selection rule (rear-handed) declared;
  side-on validation at ingestion.
- **Recommended path:** D-POSE wrist/shoulder at plant frame → boolean.

---

### 9. `sequencing` — Kinetic Chain Order (P4)
- **Phase:** P4.
- **Exact definition:** boolean (or 0–100 hybrid score). Order check:
  peak angular velocity of (hips → torso → lead shoulder → lead arm →
  bat barrel) occurs in strictly increasing time across the window
  [`swing_initiation` → `contact_frame`].
- **What is being measured:** proximal-to-distal kinetic chain order.
- **Category:** hybrid. Order check is deterministic; gap magnitudes
  and "quality of separation" are a bounded hybrid score.
- **Detectors:** D-POSE, D-BAT.
- **Landmarks:** hips L/R, shoulders L/R, elbows L/R, wrists L/R.
- **Anchors:** `swing_initiation`, `contact_frame`.
- **Frame density:** T-mid; T-high preferred for clean angular-velocity
  peaks.
- **Calibration:** scale-free (angular velocity ratios).
- **Missingness:** torso/shoulder occluded → `landmark_occluded`;
  initiation or contact anchor missing → `anchor_not_detected`; fps
  below T-mid → `insufficient_temporal_resolution`.
- **Confidence:** landmark visibility × anchor certainty × peak-
  detection sharpness.
- **MediaPipe sufficient?** Partial — pose yes; bat segment requires
  D-BAT.
- **Additional vision systems:** D-BAT.
- **Phone-only sufficient?** Yes at T-mid+.
- **Production readiness:** angular-velocity smoothing window declared;
  peak-detection threshold benchmarked.
- **Recommended path:** D-POSE angular velocities + D-BAT barrel angular
  velocity → peak times → order test → hybrid score for gaps.

---

### 10. `bat_path` — Bat Path In/Out of Zone ★ (P4)
- **Phase:** P4.
- **Exact definition:** 0–100 composite of (a) **enter direction** of
  the barrel into the hitting zone (behind-the-ball vs across), (b)
  **exit direction** (in-front vs cut), (c) on-plane window length
  (frames the barrel is within plane tolerance). Distinct from
  `on_plane` per `.lovable/bat-path-vs-on-plane-definitions.md`.
- **What is being measured:** **shape** of the barrel path through the
  zone (direction in, direction out, plus duration).
- **Category:** deterministic.
- **Detectors:** D-BAT, D-POSE, plane reconstruction (uplift: D-BALL).
- **Landmarks:** shoulders, hips (for plane prior).
- **Anchors:** `barrel_in_zone_entry`, `contact_frame`,
  `barrel_in_zone_exit`.
- **Frame density:** T-mid; T-high preferred.
- **Calibration:** plane prior — derived from posture or from D-BALL
  trajectory.
- **Missingness:** bat not tracked → `bat_not_detected`; entry/exit
  anchors missing → `anchor_not_detected`; non-side-on →
  `out_of_frame`.
- **Confidence:** D-BAT track quality × entry/exit anchor certainty ×
  plane confidence.
- **MediaPipe sufficient?** No — bat keypoints required.
- **Additional vision systems:** D-BAT mandatory; D-BALL uplift.
- **Phone-only sufficient?** Yes at T-mid+ if D-BAT works on phone
  capture.
- **Production readiness:** D-BAT benchmarked; plane-prior policy
  defined; entry/exit thresholds locked.
- **Recommended path:** D-BAT barrel track → plane reconstruction →
  entry/exit angles and window length → composite.

---

### 11. `on_plane` — On-Plane Percentage ★ (P4)
- **Phase:** P4.
- **Exact definition:** percentage of frames in
  [`swing_initiation` → `contact_frame`] where barrel-axis angle to
  the pitch plane is within a fixed tolerance (e.g., ±5°).
- **What is being measured:** duration ratio on plane. Pure
  scalar; **no** direction component.
- **Category:** deterministic.
- **Detectors:** D-BAT; plane prior as in `bat_path`.
- **Landmarks:** shoulders, hips (for plane prior).
- **Anchors:** `swing_initiation`, `contact_frame`.
- **Frame density:** T-mid.
- **Calibration:** plane prior.
- **Missingness:** bat not tracked → `bat_not_detected`; anchors
  missing → `anchor_not_detected`.
- **Confidence:** D-BAT track quality × anchor certainty × plane
  confidence.
- **MediaPipe sufficient?** No.
- **Additional vision systems:** D-BAT mandatory; D-BALL uplift.
- **Phone-only sufficient?** Yes if D-BAT supports phone capture.
- **Production readiness:** plane prior + tolerance locked; output is a
  ratio (`%`), not a `score_100`.
- **Recommended path:** D-BAT barrel-axis trace → per-frame angle to
  plane → in-tolerance count / total frames in window.

**Distinctness contract with `bat_path`:** these are two scalars over
the same trace; `bat_path` adds direction (enter behind, exit in front)
which `on_plane` does not. Per
`.lovable/bat-path-vs-on-plane-definitions.md`, the prompt currently
does not enforce this; under this spec the deterministic formulas
above enforce it by construction.

---

### 12. `time_to_contact` — Swing-Initiation → Contact ★ (P4)
- **Phase:** P4.
- **Exact definition:** Δt in ms between `swing_initiation` and
  `contact_frame`.
- **What is being measured:** swing quickness — the time the bat is in
  motion before contact. Distinct from `bat_speed_contact` per
  `.lovable/time-to-contact-vs-power.md`.
- **Category:** deterministic.
- **Detectors:** D-POSE, D-BAT, D-CONTACT.
- **Landmarks:** wrists; bat knob.
- **Anchors:** `swing_initiation`, `contact_frame`.
- **Frame density:** **T-high (≥120 fps)** required to claim "elite"
  tiers; T-mid permitted with widened confidence interval; T-low
  forces `insufficient_temporal_resolution`.
- **Calibration:** none (pure time delta).
- **Missingness:** initiation or contact below 0.8 confidence →
  `anchor_not_detected`; fps < T-mid →
  `insufficient_temporal_resolution`.
- **Confidence:** anchor certainty × (1 - anchor_jitter/fps_period).
- **MediaPipe sufficient?** Partial — wrist motion only; bat knob and
  contact require D-BAT and D-CONTACT.
- **Additional vision systems:** D-BAT, D-CONTACT.
- **Phone-only sufficient?** Conditional — requires phone capable of
  sustained 120 fps and adequate light; widely available on modern
  phones in 1080p120 mode.
- **Production readiness:** initiation detector + contact detector
  benchmarked at T-mid and T-high; confidence interval emitted with
  every value; tile is `score_meter` over ms, not a label.
- **Recommended path:** D-POSE wrist accel + D-BAT knob accel →
  initiation frame; D-CONTACT (barrel-ball proximity + audio uplift)
  → contact frame; Δt.

---

### 13. `bat_speed_contact` — Barrel Speed at Contact ★ (P4)
- **Phase:** P4.
- **Exact definition:** linear speed of the barrel-tip keypoint at
  `contact_frame`, expressed in mph, computed from a centered finite
  difference over ≥3 frames symmetric around contact, with pixel→inch
  scaling from a bat-length calibration.
- **What is being measured:** barrel speed at contact — a power
  output. Distinct from `time_to_contact`.
- **Category:** hybrid. Deterministic kinematics from D-BAT; model
  judgement permitted only on tracker plausibility, never on the
  numeric value.
- **Detectors:** D-BAT, D-CONTACT.
- **Landmarks:** none from D-POSE (bat keypoints only).
- **Anchors:** `contact_frame` (±N frames for finite difference).
- **Frame density:** **T-high (≥120 fps)** required.
- **Calibration:** **mandatory metric scaling** — user-entered bat
  length preferred. Default 33 in is permitted only with low
  calibration confidence that propagates into tile confidence. No
  scaler → `calibration_unavailable`.
- **Missingness:** bat not tracked → `bat_not_detected`; contact
  certainty < 0.8 → `anchor_not_detected`; fps < T-high →
  `insufficient_temporal_resolution`; calibration absent →
  `calibration_unavailable`.
- **Confidence:** D-BAT track quality at contact × contact certainty ×
  fps-relative finite-difference stability × calibration confidence.
- **MediaPipe sufficient?** No.
- **Additional vision systems:** D-BAT mandatory; D-CONTACT mandatory;
  instrumented bat (optional uplift).
- **Phone-only sufficient?** Conditional — needs 1080p120 (or 720p240)
  and clean light. Phone-only **without** bat-length entry is
  permitted with explicit low confidence and a UI surface that
  declares the ±tolerance.
- **Production readiness:** D-BAT benchmarked on bat-tip tracking at
  T-high; bat-length entry flow defined; tile must publish a
  confidence interval (±X mph) alongside the point estimate, never a
  bare number.
- **Recommended path:** D-BAT barrel-tip pixel positions at
  [contact-N … contact+N] → centered finite difference → pixel
  velocity → physical velocity via bat-length scaler → mph.

---

### 14. `back_elbow_contact` — Connect & Move / Barrel Delivery ★ (P4)
- **Phase:** P4.
- **Exact definition:** 0–100 composite per
  `.lovable/back-elbow-methodology.md` of (a) back-elbow slot angle at
  `contact_frame`, (b) back-elbow-to-torso connection (no early flying
  open) over [`swing_initiation` → `contact_frame`], (c) barrel-to-
  ball delivery direction (toward pitcher vs casting around).
- **What is being measured:** quality of barrel delivery and back-side
  connection.
- **Category:** hybrid. Angles and connection deterministic; "delivery
  feel" residual bounded ±10.
- **Detectors:** D-POSE, D-BAT.
- **Landmarks:** shoulders, elbows, wrists L/R; bat barrel.
- **Anchors:** `swing_initiation`, `contact_frame`.
- **Frame density:** T-mid.
- **Calibration:** scale-free (angles).
- **Missingness:** rear-side landmarks occluded → `landmark_occluded`;
  anchors missing → `anchor_not_detected`; bat track missing → for
  channel (c) only, fall back to channel (a)+(b) with degraded
  confidence; if all three missing → `bat_not_detected`.
- **Confidence:** rear-side visibility × anchor certainty × D-BAT
  quality (for channel c).
- **MediaPipe sufficient?** Partial — channels (a) and (b) yes;
  channel (c) requires D-BAT.
- **Additional vision systems:** D-BAT (for channel c).
- **Phone-only sufficient?** Yes.
- **Production readiness:** thresholds per methodology memo locked.
- **Recommended path:** D-POSE elbow/shoulder angles → connection
  trace; D-BAT delivery vector → composite.

---

### 15. `hitters_move` — Hitter's Move Composite (P4)
- **Phase:** P4.
- **Exact definition:** 0–100 deterministic aggregate of normalized
  sub-scores from `hip_load`, `hand_load`, `stride_direction`,
  `heel_plant`, `sequencing`, `back_elbow_contact`. Weights declared
  in the metric spec; no model layer.
- **What is being measured:** overall hitter's-move quality as a
  weighted composite of upstream deterministic measurements.
- **Category:** deterministic (pure aggregation).
- **Detectors:** transitive from constituents.
- **Landmarks:** transitive.
- **Anchors:** transitive.
- **Frame density:** transitive — the highest tier required by any
  constituent.
- **Calibration:** transitive.
- **Missingness:** if more than one weighted constituent is missing →
  this tile is `missing` with `missing_reason = anchor_not_detected`
  (or the dominant constituent's reason).
- **Confidence:** weighted mean of constituent confidences, capped by
  the minimum.
- **MediaPipe sufficient?** Yes if constituents are.
- **Additional vision systems:** D-BAT (via `back_elbow_contact`).
- **Phone-only sufficient?** Yes if constituents are.
- **Production readiness:** weights frozen; aggregation formula
  declared.
- **Recommended path:** consume constituent metric values + confidences
  → weighted composite.

---

### 16. `shoulder_plane_steadiness` — Shoulder Plane Steadiness (P4)
- **Phase:** P4.
- **Exact definition:** 0–100 score from the standard deviation of the
  shoulder-line tilt angle (angle of the L-shoulder→R-shoulder vector
  to horizontal) across [`swing_initiation` → `contact_frame`],
  inverted and normalized.
- **What is being measured:** steadiness of the shoulder plane through
  the swing.
- **Category:** deterministic.
- **Detectors:** D-POSE.
- **Landmarks:** shoulders L/R.
- **Anchors:** `swing_initiation`, `contact_frame`.
- **Frame density:** T-mid.
- **Calibration:** scale-free.
- **Missingness:** either shoulder occluded > 20% → `landmark_occluded`;
  anchors missing → `anchor_not_detected`.
- **Confidence:** shoulder visibility × anchor certainty × signal-to-
  jitter on the angle series.
- **MediaPipe sufficient?** Yes.
- **Additional vision systems:** none.
- **Phone-only sufficient?** Yes.
- **Production readiness:** σ-to-score mapping locked.
- **Recommended path:** D-POSE shoulder vector → per-frame angle → σ →
  inverse mapping.

---

### 17. `finish_balance` — Finish Balance (P4)
- **Phase:** P4.
- **Exact definition:** 0–100 score per
  `.lovable/finish-and-balance-methodology.md` combining (a) center-of-
  mass horizontal stillness in the window [`contact_frame` →
  `finish_frame`], (b) absence of stumble (post-contact ankle
  re-position events), (c) trunk lean within tolerance.
- **What is being measured:** post-contact balance.
- **Category:** deterministic.
- **Detectors:** D-POSE.
- **Landmarks:** hips, knees, ankles, shoulders.
- **Anchors:** `contact_frame`, `finish_frame`.
- **Frame density:** T-low (≥30 fps) suffices.
- **Calibration:** scale-free.
- **Missingness:** lower-body occluded → `landmark_occluded`; finish
  frame not detectable → `anchor_not_detected`.
- **Confidence:** lower-body visibility × finish-frame certainty.
- **MediaPipe sufficient?** Yes.
- **Additional vision systems:** none.
- **Phone-only sufficient?** Yes.
- **Production readiness:** tolerance thresholds locked per memo.
- **Recommended path:** D-POSE CoM proxy track → stillness + stumble +
  lean → composite.

---

### 18. `shoulder_to_shoulder_hold` — Chin-to-Shoulder Hold (P4)
- **Phase:** P4.
- **Exact definition:** (i) percent of the window
  [`front_foot_full_plant` → `contact_frame`] for which chin (nose
  proxy) is within tolerance of the front shoulder; (ii) boolean
  derived from (i) ≥ threshold; (iii) front-shoulder-leak boolean
  (front shoulder rotates open before contact beyond tolerance);
  (iv) percent-of-window for which the leak condition is true.
- **What is being measured:** front-side hold through contact.
- **Category:** deterministic.
- **Detectors:** D-POSE.
- **Landmarks:** nose, shoulders L/R.
- **Anchors:** `front_foot_full_plant`, `contact_frame`.
- **Frame density:** T-mid.
- **Calibration:** scale-free.
- **Missingness:** nose or shoulders occluded → `landmark_occluded`;
  anchors missing → `anchor_not_detected`.
- **Confidence:** face+shoulder visibility × anchor certainty.
- **MediaPipe sufficient?** Yes.
- **Additional vision systems:** none.
- **Phone-only sufficient?** Yes.
- **Production readiness:** tolerances for chin distance and leak
  angle locked.
- **Recommended path:** D-POSE nose+shoulders per frame → tolerance
  checks → percentages + booleans.

---

## Part 3 — Special Focus deep-dives

Applies to: `p2_timing`, `p3_timing`,
`hands_outside_shoulders_at_landing`, `bat_path`, `on_plane`,
`time_to_contact`, `bat_speed_contact`, `back_elbow_contact` (Connect &
Move / Barrel Delivery), `sequencing`.

### Why the current AI-only implementation is insufficient
Per audit S2, S6, S7, S10, S11:
- The model produces values directly from ≤7 frames per clip with no
  intermediate deterministic trace.
- No event-anchor detectors exist; the model is asked to locate
  release, plant, contact, and barrel events without temporal ground
  truth.
- No bat detector; barrel speed and bat-path shape have no measurable
  basis.
- Calibration for `bat_speed_contact` is a prompt-only 33 in default
  with no enforcement.
- Re-uploads produce different `videoId` → different `seed` →
  different values for identical video bytes.

### Minimum viable deterministic path
For each special-focus metric, the minimum components are listed in
its Part-2 row. Common floor:
- D-POSE at T-mid for any anchor-based timing.
- D-RELEASE for any tile mentioning the pitcher.
- D-PLANT for any tile mentioning landing.
- D-BAT for any tile mentioning the barrel.
- D-CONTACT for `time_to_contact`, `bat_speed_contact`, and any tile
  with a contact-frame anchor.

### Higher-fidelity path
- Second camera (overhead or front-on) — improves plane reconstruction
  for `bat_path` and `on_plane`, and improves contact detection.
- Instrumented bat sensor — replaces D-BAT for `bat_speed_contact`
  with sensor-grade mph and removes the bat-length calibration burden.
- Radar — independent verification of `bat_speed_contact`.

### Phone-only fallback
All special-focus metrics are phone-only-supportable under the
canonical envelope at T-mid except `time_to_contact` and
`bat_speed_contact`, which require T-high (1080p120 or 720p240) to be
production-eligible. At T-mid both are permitted with widened
confidence intervals and explicit ± surfacing; at T-low both are
forced to `insufficient_temporal_resolution`.

### Calibration uncertainty propagation
`bat_speed_contact` propagates bat-length uncertainty linearly:
relative error in physical velocity equals relative error in the
length prior. A 33 in default with ±2 in true variance → ≈6%
calibration band that must appear in the tile's confidence interval.

### Frame-rate sensitivity table

| Metric | 30 fps (33.3 ms) | 60 fps (16.7 ms) | 120 fps (8.3 ms) | 240 fps (4.2 ms) |
|---|---|---|---|---|
| `p2_timing` | unreliable | usable | preferred | preferred |
| `p3_timing` | missing | usable (wide band) | preferred | preferred |
| `hands_outside_shoulders_at_landing` | usable | usable | preferred | preferred |
| `bat_path` | unreliable | usable | preferred | preferred |
| `on_plane` | unreliable | usable | preferred | preferred |
| `time_to_contact` | missing | usable (wide band) | required floor | preferred |
| `bat_speed_contact` | missing | usable (wide band) | required floor | preferred |
| `back_elbow_contact` | usable | preferred | preferred | preferred |
| `sequencing` | unreliable | usable | preferred | preferred |

---

## Part 4 — Cross-metric architecture summary

### Detector inventory required to ship all 18 deterministically
- **D-POSE** (MediaPipe Pose / Blazepose Full) — used by every metric.
- **D-RELEASE** — `p2_timing`, `p3_timing`.
- **D-PLANT** — `heel_plant`, `p3_timing`,
  `hands_outside_shoulders_at_landing`, `shoulder_to_shoulder_hold`.
- **D-BAT** — `bat_path`, `on_plane`, `time_to_contact`,
  `bat_speed_contact`, `back_elbow_contact` (channel c), `sequencing`
  (barrel angular velocity).
- **D-CONTACT** — `time_to_contact`, `bat_speed_contact`,
  `back_elbow_contact`, `sequencing`, `shoulder_to_shoulder_hold`,
  `eyes_tracking`, `bat_path` (anchor for window).
- **D-BALL** — uplift only (plane prior, eye-track alignment).

### Calibration inventory
- **Bat-length prior** — required for `bat_speed_contact`. User-entered
  preferred; default 33 in permitted only with low-confidence flag that
  propagates into the tile's confidence interval.
- **Hip-width / shoulder-width priors** — used only as normalizers in
  scale-free metrics; uncertainty enters confidence, not value.
- **On-screen calibration card** — high-confidence optional uplift for
  any metric that converts pixel distance to physical distance.
- **Intrinsic camera parameters** — required for any 2-camera or out-of-
  plane reconstruction; optional for the canonical side-on phone-only
  envelope.

### Frame-density inventory
- **T-low (≥30 fps):** `hip_load`,
  `hands_outside_shoulders_at_landing`, `finish_balance`.
- **T-mid (≥60 fps):** `hand_load`, `p2_timing`, `eyes_tracking`,
  `stride_direction`, `heel_plant`, `p3_timing`, `sequencing`,
  `bat_path`, `on_plane`, `back_elbow_contact`,
  `shoulder_plane_steadiness`, `shoulder_to_shoulder_hold`.
- **T-high (≥120 fps):** `time_to_contact`, `bat_speed_contact`.

### Phone-only support summary

| Metric | Phone-only? |
|---|---|
| `hip_load` | yes |
| `hand_load` | yes |
| `p2_timing` | conditional (pitcher visible) |
| `eyes_tracking` | yes |
| `stride_direction` | yes |
| `heel_plant` | yes |
| `p3_timing` | conditional (pitcher visible, fps) |
| `hands_outside_shoulders_at_landing` | yes |
| `sequencing` | yes |
| `bat_path` | yes (needs D-BAT) |
| `on_plane` | yes (needs D-BAT) |
| `time_to_contact` | conditional (T-high) |
| `bat_speed_contact` | conditional (T-high + bat length) |
| `back_elbow_contact` | yes |
| `hitters_move` | yes |
| `shoulder_plane_steadiness` | yes |
| `finish_balance` | yes |
| `shoulder_to_shoulder_hold` | yes |

### Production-readiness summary

| Metric | Category | Path to ready |
|---|---|---|
| `hip_load` | deterministic | D-POSE only — shortest path |
| `hand_load` | hybrid | D-POSE; bounded residual envelope |
| `p2_timing` | deterministic | + D-RELEASE |
| `eyes_tracking` | hybrid | D-POSE; optional D-BALL uplift |
| `stride_direction` | deterministic | D-POSE only |
| `heel_plant` | deterministic | D-POSE only |
| `p3_timing` | deterministic | + D-RELEASE + D-PLANT |
| `hands_outside_shoulders_at_landing` | deterministic | D-POSE only |
| `sequencing` | hybrid | + D-BAT |
| `bat_path` | deterministic | + D-BAT |
| `on_plane` | deterministic | + D-BAT |
| `time_to_contact` | deterministic | + D-BAT + D-CONTACT + T-high |
| `bat_speed_contact` | hybrid | + D-BAT + D-CONTACT + T-high + bat-length flow |
| `back_elbow_contact` | hybrid | D-POSE; channel c needs D-BAT |
| `hitters_move` | deterministic | composite of above |
| `shoulder_plane_steadiness` | deterministic | D-POSE only |
| `finish_balance` | deterministic | D-POSE only |
| `shoulder_to_shoulder_hold` | deterministic | D-POSE only |

---

## Part 5 — Cross-references

- Audit traceability: every metric subsection corresponds to its
  audit row in `.lovable/analysis-truth-audit.md` S10 (#1–18) and its
  classification in S11.
- Methodology memos:
  - `time_to_contact`, `bat_speed_contact` → `.lovable/time-to-contact-vs-power.md`.
  - `bat_path`, `on_plane` → `.lovable/bat-path-vs-on-plane-definitions.md`.
  - `p3_timing` → `.lovable/p3-timing-methodology.md`.
  - `back_elbow_contact` → `.lovable/back-elbow-methodology.md`.
  - `finish_balance` → `.lovable/finish-and-balance-methodology.md`.

No code, schema, prompt, UI, or roadmap changes accompany this
document. It is a specification only.
