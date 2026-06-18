# Canonical Implementation Blueprint — BH Pipeline

Status: **specification only**. Implementation-ready translation of
`.lovable/canonical-measurement-architecture.md` into components,
contracts, runtime locations, failure states, confidence propagation,
and determinism requirements. No new methodology, no new architecture,
no code, no roadmap, no sequencing.

Source inputs (read-only):
- `.lovable/canonical-measurement-architecture.md`
- `.lovable/analysis-truth-audit.md` (S1–S11)
- `.lovable/analysis-truth-extraction.md`
- `.lovable/bat-path-vs-on-plane-definitions.md`
- `.lovable/p3-timing-methodology.md`
- `.lovable/time-to-contact-vs-power.md`
- `.lovable/back-elbow-methodology.md`
- `.lovable/finish-and-balance-methodology.md`

---

## Preamble

### Uniform component schema
Every component below is documented under the same schema:
- **Name**
- **Responsibility**
- **Inputs**
- **Outputs**
- **Dependencies**
- **Runtime location** — one of `client`, `worker`, `edge`, `database`
- **Data contracts**
- **Failure states**
- **Confidence propagation**
- **Determinism requirements**

### Runtime locations (definitions)
- **client** — main browser thread. Capture UI, file input, light
  orchestration, report-card rendering, AI-coaching presentation.
- **worker** — browser Web Worker, OffscreenCanvas, WASM / WebGPU
  runtime. Hosts all detectors (D-POSE, D-HANDS, D-BAT, D-BALL,
  D-CONTACT, D-RELEASE, D-PLANT), event anchors, geometry layer, and
  the deterministic metric engine.
- **edge** — Supabase edge function (`analyze-video` and successors).
  Hosts ingestion, persistence, audit lineage, and the bounded hybrid-
  residual AI call.
- **database** — Postgres tables (videos, ai_analysis, analysis-run
  audit) and Storage buckets (raw video, persisted traces).

### Determinism contract (global)
Every component declares whether its outputs are **byte-identical**
under identical inputs at pinned engine versions, and what its
non-determinism sources are (if any). The only permitted stochastic
layer is the hybrid-residual AI call, bounded by §D and §F.

---

## Section A — End-to-end system topology

### Pipeline (canonical order)

```text
            client                              worker                                  edge / db
 ┌────────────────────────────┐  ┌──────────────────────────────────────┐  ┌──────────────────────────────┐
 │ A1 Capture                 │→ │ A2 Probe                             │→ │ A6 Ingestion / Persistence   │
 │   (file input / camera)    │  │   (sha256, fps_true, dims, codec)    │  │   (video row, blob in storage)│
 └────────────────────────────┘  └──────────────────────────────────────┘  └──────────────────────────────┘
                                          │
                                          ▼
                                 ┌──────────────────────────────────────┐
                                 │ A3 Frame Extraction (deterministic)  │
                                 └──────────────────────────────────────┘
                                          │
                                          ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ A4 Detection Layer                                                   │
 │   D-POSE · D-HANDS · D-BAT · D-BALL · D-CONTACT · D-RELEASE · D-PLANT│
 └──────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ A5 Event Anchors                                                     │
 │   release · first_contact · full_plant · load_apex · initiation ·    │
 │   bat_lag_max · in_zone_entry · contact · in_zone_exit · finish      │
 └──────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ A6 Geometry Layer                                                    │
 │   angles, velocities, integrals, plane reconstruction, calibration   │
 └──────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ A7 Metric Engine (18 BH metrics, deterministic channels)             │
 └──────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ A8 Confidence + Missingness Layer                                    │
 └──────────────────────────────────────────────────────────────────────┘
                                          │
                            ┌─────────────┴─────────────┐
                            ▼                           ▼
                ┌────────────────────────┐   ┌────────────────────────┐
                │ A9 Hybrid Residual AI  │   │ A10 Persistence        │
                │   (edge, bounded ±10)  │   │   (traces + metrics)   │
                └────────────────────────┘   └────────────────────────┘
                            │                           │
                            └─────────────┬─────────────┘
                                          ▼
                                 ┌────────────────────────┐
                                 │ A11 Report Card        │
                                 │   (tile state mapper,  │
                                 │    phase orbs, ribbon) │
                                 └────────────────────────┘
                                          │
                                          ▼
                                 ┌────────────────────────┐
                                 │ A12 AI Coaching        │
                                 │   (presentation only)  │
                                 └────────────────────────┘
```

### Stage table

| # | Stage | Producer | Consumer | Runtime | Data contract out | Determinism boundary |
|---|---|---|---|---|---|---|
| A1 | Capture | client | A2 | client | `{blob, mime, capture_meta?}` | deterministic (passthrough) |
| A2 | Probe | A1 | A3, A6 | client | `ProbedVideoMetadata{sha256_hex, fps_true \| null, duration_sec, width, height, orientation, codec, supports_rvfc}` | deterministic per blob |
| A3 | Frame Extraction | A2 | A4 | worker | `Frame[]{index, t_ms, image}` at canonical sample plan | deterministic given probe + plan |
| A4 | Detection | A3 | A5, A6 | worker | per-frame keypoint sets + per-detector confidence | deterministic given pinned model + pinned backend |
| A5 | Anchors | A4 | A6, A7 | worker | `Anchor{frame_index, t_ms, confidence, source_detector, contributing_signals[]}` | deterministic given §A4 outputs |
| A6 | Geometry | A4, A5, A2 | A7 | worker | derived series + scalars + plane prior + calibration block | deterministic |
| A7 | Metric Engine | A6 | A8, A10 | worker | `Metric{key, value, raw_components, formula_version}` × 18 | deterministic |
| A8 | Confidence/Missingness | A4, A5, A6, A7 | A11, A9 | worker | `{confidence ∈ [0,1], missing: bool, missing_reason?}` per metric | deterministic |
| A9 | Hybrid Residual AI | A7, A8 | A10, A11 | edge | bounded `±10` residual per eligible hybrid metric | replay-equivalent (temp 0, pinned model, seed from trace fingerprint) |
| A10 | Persistence | A4–A9 | A11, replay | edge → database | canonical traces + metrics + lineage | deterministic |
| A11 | Report Card | A7, A8, A9 | A12 | client | tile states + phase orbs + ribbon | deterministic |
| A12 | AI Coaching | A11 | UI | edge (call) → client (render) | bounded presentation copy | replay-equivalent (temp 0, pinned, seed from tile-state fingerprint) |

### Storage seams
- **Raw video** — Supabase Storage; keyed by `video_sha256_hex`.
- **Canonical traces** — persisted JSON (or binary frame-aligned blob)
  containing: `probe`, `frame_plan`, all detector outputs, all anchors,
  geometry-layer derived series, calibration block. **This is the
  replay substrate.**
- **Metrics + confidence + missingness** — per analysis run; replay-
  reconstructable from canonical traces.
- **Hybrid residuals** — persisted with the call lineage (model id,
  pinned version, seed, prompt hash, response hash).
- **Audit lineage** — analysis-run audit row (per audit S3, §A6 already
  writes `engine_versions` — that field becomes load-bearing under
  §F).

### Replay seam
Given persisted **canonical traces** + pinned engine versions, stages
A6→A8 reproduce byte-identical metrics with **no detector re-run** and
**no AI call**. Stage A9 hybrid residuals are reproducible from the
same trace fingerprint at pinned model + seed.

---

## Section B — Detector blueprint

All detectors run in `worker`. All declare a model identity, a
version pin, an input contract, an output contract, and explicit
failure states that map to the canonical `missing_reason` enum.

### B1. D-POSE — MediaPipe Pose Landmarker (Blazepose Full)
- **Name:** D-POSE.
- **Responsibility:** per-frame 33-point human pose (2D normalized +
  3D world) with per-landmark visibility.
- **Inputs:** `Frame[]` from A3.
- **Outputs:** `PoseTrace{frames: Array<{landmarks_2d[33], landmarks_world[33], visibility[33], detector_conf}>}`.
- **Dependencies:** MediaPipe Tasks Vision (Pose Landmarker, Full).
- **Runtime location:** worker (WASM + GPU delegate when available).
- **Data contracts:** landmark coordinates normalized to frame width/
  height; visibility in [0,1]; `detector_conf` aggregate per frame.
- **Failure states:**
  - Person not detected → `landmark_occluded` (entire frame).
  - Required landmark visibility < threshold across window →
    `landmark_occluded` (window-level).
- **Confidence propagation:** per-landmark visibility flows into the
  geometry layer; downstream metrics take `min` over their required
  landmarks across their measurement window.
- **Determinism requirements:** pinned model file hash; pinned backend
  (WASM-SIMD by default; GPU delegate only if the GPU backend has been
  certified deterministic on the target device class). `LANDMARK_MODEL_VERSION`
  pins the full `(model_hash, backend_id, runtime_version)` triple.

### B2. D-HANDS — MediaPipe Hands (knob/grip refinement)
- **Name:** D-HANDS.
- **Responsibility:** refined hand keypoints to disambiguate knob and
  grip positions where D-POSE wrists are noisy.
- **Inputs:** `Frame[]` (cropped around D-POSE wrist boxes for cost).
- **Outputs:** `HandTrace{frames: Array<{left_hand[21]?, right_hand[21]?, conf}>}`.
- **Dependencies:** MediaPipe Tasks Vision (Hand Landmarker).
- **Runtime location:** worker.
- **Data contracts:** as MediaPipe Hands; coordinates in original-
  frame normalized space after crop un-projection.
- **Failure states:** hand not detected → `landmark_occluded` (hand-
  specific); fallback consumer falls back to D-POSE wrist with
  reduced confidence.
- **Confidence propagation:** as B1.
- **Determinism requirements:** as B1 (pinned model + backend).

### B3. D-BAT — bat keypoint detector
- **Name:** D-BAT.
- **Responsibility:** per-frame bat keypoints (knob, mid, barrel-tip)
  with per-keypoint confidence and a bat-detected flag.
- **Inputs:** `Frame[]` or motion-cropped regions around D-POSE wrists.
- **Outputs:** `BatTrace{frames: Array<{knob_xy?, mid_xy?, tip_xy?, bat_present_conf, keypoint_conf}>}`.
- **Dependencies:** task-specific small CNN / YOLO-class model — **not**
  MediaPipe. Model identity to be declared in the registry; not
  selected by this blueprint.
- **Runtime location:** worker.
- **Data contracts:** coordinates in original-frame normalized space;
  `bat_present_conf` in [0,1].
- **Failure states:**
  - `bat_present_conf < threshold` across the swing window →
    `bat_not_detected`.
  - Required keypoint missing on contact frame → `bat_not_detected`
    for any contact-frame-bound metric.
- **Confidence propagation:** per-keypoint confidence × per-frame
  presence; metrics consume `min` over their measurement window.
- **Determinism requirements:** pinned model hash; pinned inference
  backend; pinned NMS thresholds. `DETECTOR_VERSION` pins
  `(D-BAT model hash, NMS config, backend_id, runtime_version)`.

### B4. D-BALL — pitched-ball tracker (uplift)
- **Name:** D-BALL.
- **Responsibility:** per-frame ball center + radius and a tracked
  trajectory across the pitch window.
- **Inputs:** `Frame[]`.
- **Outputs:** `BallTrace{frames: Array<{center_xy?, radius_px?, conf}>, trajectory_fit{params, fit_conf}}`.
- **Dependencies:** task-specific small detector + Kalman tracker. Not
  selected by this blueprint.
- **Runtime location:** worker.
- **Data contracts:** as above.
- **Failure states:** ball not detected across required window →
  uplift unavailable; downstream metrics that **require** D-BALL fall
  back to plane prior from pose with reduced calibration confidence;
  metrics that **require** ball trajectory directly →
  `anchor_not_detected`.
- **Confidence propagation:** per-frame `conf` × fit confidence.
- **Determinism requirements:** as B3; tracker initialization must be
  deterministic (no random seed at runtime).

### B5. D-CONTACT — contact-frame detector
- **Name:** D-CONTACT.
- **Responsibility:** locate `contact_frame` from (i) barrel-to-ball
  proximity (D-BAT × D-BALL), (ii) barrel deceleration, (iii) optional
  audio transient from the source video's audio track.
- **Inputs:** `BatTrace`, `BallTrace?`, audio PCM (optional).
- **Outputs:** `Anchor{kind: "contact_frame", frame_index, t_ms, confidence, contributing_signals[]}`.
- **Dependencies:** D-BAT (required), D-BALL (uplift), audio decoder
  (uplift).
- **Runtime location:** worker.
- **Data contracts:** as Anchor schema in §C.
- **Failure states:**
  - All three signals below threshold → `anchor_not_detected`.
  - Audio absent → audio signal contributes 0; contact may still be
    located on bat+ball.
- **Confidence propagation:** combined confidence from contributing
  signals via declared weights (declared in the metric-engine
  registry, not invented here).
- **Determinism requirements:** pinned signal weights; pinned audio-
  decode parameters; pinned peak-detection thresholds.

### B6. D-RELEASE — pitcher release event detector
- **Name:** D-RELEASE.
- **Responsibility:** locate `pitcher_release_frame` from a pose-+-
  crop classifier on the pitcher region of the frame (when pitcher
  is in-frame under the canonical envelope), with optional audio
  uplift.
- **Inputs:** `Frame[]`, optional `PoseTrace` (multi-person mode).
- **Outputs:** `Anchor{kind: "pitcher_release_frame", ...}`.
- **Dependencies:** task-specific classifier — not MediaPipe.
- **Runtime location:** worker.
- **Failure states:**
  - Pitcher not in frame → `out_of_frame` propagated downstream.
  - Classifier confidence < 0.7 across the candidate window →
    `anchor_not_detected`.
- **Confidence propagation:** classifier max-confidence over candidate
  window × temporal sharpness factor.
- **Determinism requirements:** pinned model + backend; deterministic
  argmax tie-break (lowest frame index wins).

### B7. D-PLANT — front-foot plant detector
- **Name:** D-PLANT.
- **Responsibility:** locate `front_foot_first_contact` and
  `front_foot_full_plant` from heel/foot-index y-velocity zero
  crossing plus vertical-load proxy.
- **Inputs:** `PoseTrace` (heels, foot index, ankles, knees, hips).
- **Outputs:** two `Anchor`s.
- **Dependencies:** D-POSE.
- **Runtime location:** worker.
- **Failure states:** foot landmarks occluded > 20% across the
  candidate window → `landmark_occluded`; no zero-crossing found →
  `anchor_not_detected`.
- **Confidence propagation:** foot landmark visibility × zero-crossing
  sharpness.
- **Determinism requirements:** pinned smoothing window length; pinned
  zero-crossing detection thresholds; deterministic sort/tie-break.

---

## Section C — Event-anchor blueprint

All anchors emit the same record:

```text
Anchor {
  kind:                 enum (see canonical list)
  frame_index:          integer (≥ 0, < frames.length)
  t_ms:                 number (= frame_index * 1000 / fps_true)
  confidence:           number ∈ [0,1]
  source_detector:      enum ("D-POSE" | "D-BAT" | "D-CONTACT" | "D-RELEASE" | "D-PLANT" | "GEOM")
  contributing_signals: array<{name, weight, contribution}>
}
```

Runtime location: `worker`. Determinism: deterministic given pinned
detector outputs and pinned anchor-engine parameters.

| Anchor | Source detector | Required min conf. | Fallback |
|---|---|---|---|
| `pitcher_release_frame` | D-RELEASE | 0.7 | `anchor_not_detected` |
| `front_foot_first_contact` | D-PLANT | 0.7 | `anchor_not_detected` |
| `front_foot_full_plant` | D-PLANT | 0.7 | `anchor_not_detected` |
| `hand_load_apex` | GEOM (D-POSE wrist derivative) | 0.6 | `anchor_not_detected` |
| `swing_initiation` | GEOM (D-POSE wrist + D-BAT knob accel) | 0.7 | `anchor_not_detected` |
| `bat_lag_max` | D-BAT (angular velocity zero) | 0.6 | `anchor_not_detected` |
| `barrel_in_zone_entry` | D-BAT + plane prior | 0.6 | `anchor_not_detected` |
| `contact_frame` | D-CONTACT | 0.8 | `anchor_not_detected` |
| `barrel_in_zone_exit` | D-BAT + plane prior | 0.6 | `anchor_not_detected` |
| `finish_frame` | D-POSE stillness | 0.6 | `anchor_not_detected` |

Per-anchor inputs:
- `pitcher_release_frame` ← B6.
- `front_foot_first_contact` ← B7.
- `front_foot_full_plant` ← B7.
- `hand_load_apex` ← B1 (wrist height derivative; pinned smoothing).
- `swing_initiation` ← B1 wrist accel ∧ B3 knob accel ≥ threshold.
- `bat_lag_max` ← B3 (barrel angular velocity sign change).
- `barrel_in_zone_entry` ← B3 ∧ plane prior from B1/B4 (see geometry).
- `contact_frame` ← B5.
- `barrel_in_zone_exit` ← B3 ∧ plane prior.
- `finish_frame` ← B1 (CoM proxy stillness over rolling window).

Confidence propagation: anchor confidence = product of
(detector confidence) × (temporal sharpness factor in [0,1]). All
anchors below their threshold cause **every metric that consumes them**
to emit `missing` with `anchor_not_detected` — never a guessed frame
index.

---

## Section D — Metric-engine blueprint

### D0. Engine surface
- **Name:** MetricEngine.
- **Responsibility:** apply pinned formulas to compute the 18 BH
  metrics, with per-metric confidence and missingness.
- **Inputs:**
  ```text
  EngineInput {
    pose_trace:    PoseTrace
    hand_trace?:   HandTrace
    bat_trace?:    BatTrace
    ball_trace?:   BallTrace
    anchors:       Map<AnchorKind, Anchor>
    geometry:      GeometryBlock        // §A6 outputs (angles, vels, integrals, plane)
    calibration:   CalibrationBlock     // §F seam
    fps_true:      number | null
    engine_versions: { LANDMARK, DETECTOR, METRIC_ENGINE }
  }
  ```
- **Outputs:** `Map<MetricKey, MetricResult>` where
  ```text
  MetricResult {
    key:              MetricKey
    value:            number | boolean | null
    raw_components:   object               // per-formula sub-values
    confidence:       number ∈ [0,1]
    missing:          boolean
    missing_reason?:  MissingReason
    formula_version:  string               // pinned per metric
  }
  ```
- **Dependencies:** §B detectors (via traces), §C anchors, §A6 geometry.
- **Runtime location:** worker (deterministic channels). Hybrid
  residual sub-component runs in edge (§D20).
- **Data contracts:** as above; persisted into A10.
- **Failure states:** any required precondition fails → `missing:true`
  with the appropriate `missing_reason` from the canonical enum.
- **Confidence propagation:** the canonical formula from the
  measurement architecture preamble:
  `confidence = landmark_visibility × anchor_certainty × numeric_stability × calibration_confidence`,
  each factor in [0,1]; factor < 0.5 forces `missing`.
- **Determinism requirements:** pinned `formula_version` per metric;
  pinned numeric library; sorted iteration; no wall-clock; no
  `Math.random`.

### Per-metric components (D1–D18)

Each subsection cites the row in
`.lovable/canonical-measurement-architecture.md` §Part 2 for the
formula; this blueprint does **not** restate formulas.

| # | Metric | Category | Inputs (detectors / anchors) | Failure → missing_reason | Formula source |
|---|---|---|---|---|---|
| D1 | `hip_load` | deterministic | D-POSE; `hand_load_apex` | `landmark_occluded` / `anchor_not_detected` | Arch §Part 2.1 |
| D2 | `hand_load` | hybrid | D-POSE; `hand_load_apex` | `landmark_occluded` / `anchor_not_detected` | Arch §Part 2.2 |
| D3 | `p2_timing` | deterministic | D-POSE, D-RELEASE; `hand_load_apex`, `pitcher_release_frame` | `anchor_not_detected` / `out_of_frame` | Arch §Part 2.3 |
| D4 | `eyes_tracking` | hybrid | D-POSE (head); optional D-BALL; `contact_frame` | `landmark_occluded` / `anchor_not_detected` | Arch §Part 2.4 |
| D5 | `stride_direction` | deterministic | D-POSE; `front_foot_full_plant` | `landmark_occluded` / `anchor_not_detected` / `out_of_frame` | Arch §Part 2.5 |
| D6 | `heel_plant` | deterministic | D-POSE, D-PLANT; first+full plant | `landmark_occluded` / `anchor_not_detected` | Arch §Part 2.6 |
| D7 | `p3_timing` | deterministic | D-POSE, D-RELEASE, D-PLANT; `front_foot_full_plant`, `pitcher_release_frame` | `anchor_not_detected` / `out_of_frame` / `insufficient_temporal_resolution` | Arch §Part 2.7, `p3-timing-methodology.md` |
| D8 | `hands_outside_shoulders_at_landing` | deterministic | D-POSE; `front_foot_full_plant` | `landmark_occluded` / `anchor_not_detected` / `out_of_frame` | Arch §Part 2.8 |
| D9 | `sequencing` | hybrid | D-POSE, D-BAT; `swing_initiation`, `contact_frame` | `landmark_occluded` / `anchor_not_detected` / `insufficient_temporal_resolution` | Arch §Part 2.9 |
| D10 | `bat_path` | deterministic | D-BAT, D-POSE; entry/exit + `contact_frame` | `bat_not_detected` / `anchor_not_detected` / `out_of_frame` | Arch §Part 2.10, `bat-path-vs-on-plane-definitions.md` |
| D11 | `on_plane` | deterministic | D-BAT; `swing_initiation`, `contact_frame` | `bat_not_detected` / `anchor_not_detected` | Arch §Part 2.11, same memo |
| D12 | `time_to_contact` | deterministic | D-POSE, D-BAT, D-CONTACT; `swing_initiation`, `contact_frame` | `anchor_not_detected` / `insufficient_temporal_resolution` | Arch §Part 2.12, `time-to-contact-vs-power.md` |
| D13 | `bat_speed_contact` | hybrid | D-BAT, D-CONTACT; ±N frames around `contact_frame`; **bat-length calibration** | `bat_not_detected` / `anchor_not_detected` / `insufficient_temporal_resolution` / `calibration_unavailable` | Arch §Part 2.13, same memo |
| D14 | `back_elbow_contact` | hybrid | D-POSE, D-BAT; `swing_initiation`, `contact_frame` | `landmark_occluded` / `anchor_not_detected` / `bat_not_detected` (channel c only) | Arch §Part 2.14, `back-elbow-methodology.md` |
| D15 | `hitters_move` | deterministic (composite) | D1, D2, D5, D6, D9, D14 | propagated dominant `missing_reason` | Arch §Part 2.15 |
| D16 | `shoulder_plane_steadiness` | deterministic | D-POSE; `swing_initiation`, `contact_frame` | `landmark_occluded` / `anchor_not_detected` | Arch §Part 2.16 |
| D17 | `finish_balance` | deterministic | D-POSE; `contact_frame`, `finish_frame` | `landmark_occluded` / `anchor_not_detected` | Arch §Part 2.17, `finish-and-balance-methodology.md` |
| D18 | `shoulder_to_shoulder_hold` | deterministic | D-POSE; `front_foot_full_plant`, `contact_frame` | `landmark_occluded` / `anchor_not_detected` | Arch §Part 2.18 |

### D20. Hybrid residual subsystem
- **Name:** HybridResidual.
- **Responsibility:** for each hybrid metric (D2, D4, D9, D13, D14),
  apply a bounded ±10 residual on top of the deterministic value. The
  deterministic value is authoritative; the residual can only shade
  it within the declared envelope.
- **Inputs:** persisted canonical traces + deterministic metric values
  + confidence + missingness (from §A8).
- **Outputs:** `{metric_key, residual ∈ [-10, +10], residual_conf, model_lineage{model_id, version_pin, seed, prompt_hash, response_hash}}`.
- **Dependencies:** AI gateway (pinned model id).
- **Runtime location:** **edge** (never client, never worker).
- **Data contracts:** the residual is added to the deterministic value
  with hard clamp at metric domain bounds.
- **Failure states:** model error / timeout / clamp violation → residual
  = 0, residual_conf = 0 (tile value stays at deterministic);
  determinism violation (e.g., response hash mismatch under replay) →
  treated as failure.
- **Confidence propagation:** tile confidence = deterministic
  confidence; residual_conf is reported separately and never multiplied
  into the gating factor.
- **Determinism requirements:** `temperature: 0`, pinned model id and
  version, `seed = stableSeed(canonical_trace_fingerprint)` — **not**
  `stableSeed(videoId)` (replaces audit S5 behavior); call body fully
  determined by traces + deterministic outputs; response hash
  persisted for replay equivalence.

---

## Section E — Report-card blueprint

### E1. TileStateMapper
- **Name:** TileStateMapper.
- **Responsibility:** map `MetricResult → {elite | pass | warn | fail | missing}`
  using thresholds from the discipline tile registry (existing per
  audit S1 / `bh.ts`). No model in this path.
- **Inputs:** `Map<MetricKey, MetricResult>` from A8.
- **Outputs:** `Map<MetricKey, TileState>`.
- **Runtime location:** client.
- **Data contracts:** tile registry is the single source of thresholds;
  `formula_version` from §D is shown alongside the state for audit.
- **Failure states:** `missing:true` propagates as `missing`; invalid
  threshold table → fail-closed `missing` with reason `single_pass_only`
  is **prohibited** under this spec (legacy only).
- **Confidence propagation:** `TileState` carries the metric's
  confidence verbatim; the mapper does not re-weight.
- **Determinism requirements:** pure function over its inputs.

### E2. PhaseOrbAggregator
- **Name:** PhaseOrbAggregator.
- **Responsibility:** per phase (P1–P4), compute orb state and label
  in compliance with audit S1.
- **Inputs:** `Map<MetricKey, TileState>` + tile-to-phase mapping.
- **Outputs:** per phase `{measured, total, passed, eliteCount, passRate, orb_state, orb_label}`.
- **Runtime location:** client.
- **Data contracts:** **fixed:**
  - `passed` = count of tiles whose state ∈ {`pass`, `elite`}.
  - `measured` = count of tiles whose state ≠ `missing`.
  - `total` = count of all tiles in the phase (incl. missing).
  - `passRate = passed / measured` when `measured > 0`, else `null`.
  - `orb_label_primary` = `Math.round(passRate*100) + "%"` or `"—"`.
  - `orb_label_denominator` MUST equal `measured` (not `total`) — this
    closes the dual-denominator issue identified in audit S1 /
    extraction §2. The `total` count is exposed only as a separate
    "coverage" field consumed by the ribbon, never inside the orb.
- **Failure states:** `measured == 0` → orb state `missing`, label
  `"—"`.
- **Determinism requirements:** pure function.

### E3. CoverageRibbon
- **Name:** CoverageRibbon.
- **Responsibility:** render `{measured, total, eliteCount, nonNegotiableFailed}`
  using values from §E2 — never independently recomputed.
- **Inputs:** §E2 per-phase outputs.
- **Outputs:** ribbon view model.
- **Runtime location:** client.
- **Data contracts:** completed-with-null analyses (audit S8) are
  **rejected at this seam**: if the underlying analysis has `metrics =
  null` or zero measured tiles across all phases, the report card
  refuses to render and surfaces the analysis as `incomplete`, not
  `completed`. Enforcement is server-side per §F.
- **Determinism requirements:** pure function.

### E4. AICoachingPresenter
- **Name:** AICoachingPresenter.
- **Responsibility:** generate coaching copy for the user from
  deterministic tile states, confidence, and missingness. Never
  authors metric values, tile states, orbs, or ribbon counts.
- **Inputs:** the **fingerprint** of the tile-state output of §E1/§E2
  (not raw video), plus athlete context (read-only).
- **Outputs:** bounded presentation copy.
- **Dependencies:** AI gateway (pinned model id).
- **Runtime location:** edge (call) → client (render).
- **Failure states:** AI failure → fall back to a deterministic copy
  template keyed off tile state. Never block the report card.
- **Confidence propagation:** copy must surface confidence and
  missingness in the language layer (e.g., "based on a low-confidence
  measurement").
- **Determinism requirements:** `temperature: 0`, pinned model, `seed =
  stableSeed(tile_state_fingerprint)`; response hash persisted.

---

## Section F — Determinism blueprint

### F1. Engine version pins
- **Name:** EngineVersionRegistry.
- **Responsibility:** issue and pin `LANDMARK_MODEL_VERSION`,
  `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` — must move off
  `@0.0.0-stub` (audit S3).
- **Pin contents:**
  - `LANDMARK_MODEL_VERSION` = `(pose_model_hash, hands_model_hash,
    backend_id, runtime_version)`.
  - `DETECTOR_VERSION` = `(bat_model_hash, ball_model_hash,
    contact_config_hash, release_model_hash, plant_config_hash,
    backend_id, runtime_version)`.
  - `METRIC_ENGINE_VERSION` = `(formula_version_per_metric_hash,
    geometry_config_hash, threshold_table_hash)`.
- **Outputs:** read by §F2 fingerprint and §A10 persistence.
- **Failure states:** missing pin → ingestion refuses the analysis
  (server-side); cached run with mismatched pins is invalidated.

### F2. CacheFingerprint
- **Name:** CacheFingerprint.
- **Responsibility:** derive the cache key for an analysis run.
- **Inputs (MUST be in fingerprint):** `video_sha256_hex`,
  `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION`,
  `fps_true`, `landing_time_sec`, `direction_sign`, `calibration_h_px`,
  **bat_length_in_calibration** (new — required by `bat_speed_contact`),
  **frame_plan_id**.
- **Inputs (MUST NOT be in fingerprint):** prompt text, athlete
  context, model id of the hybrid-residual call, model id of the
  coaching presenter, `videos.id`.
- **Outputs:** `cache_fingerprint_hex`.
- **Determinism requirements:** stable hash function; sorted key
  iteration; canonical numeric formatting.

### F3. SeedPolicy
- **Name:** SeedPolicy.
- **Responsibility:** seed for any stochastic layer.
- **Contract:** `seed = stableSeed(canonical_trace_fingerprint)` —
  **replaces** `seed = stableSeed(videoId)` (audit S5). Identical
  video bytes → identical canonical traces → identical seed across
  re-uploads, independent of `videos.id`.
- **Determinism requirements:** identical inputs → identical seed;
  no wall-clock.

### F4. CacheLookup
- **Name:** CacheLookup.
- **Responsibility:** locate prior runs that can be replayed for
  identical inputs.
- **Contract:** key the cache on `(video_sha256_hex, cache_fingerprint_hex)`
  — **not** on `(videos.id, cache_fingerprint_hex)` (audit S4). This
  guarantees a re-uploaded byte stream with a new `videos.id` still
  hits the cache.
- **Runtime location:** edge → database.
- **Failure states:** cache miss is a normal path; cache hit with
  mismatched engine pins is treated as miss.

### F5. ReplayContract
- **Name:** ReplayContract.
- **Responsibility:** from persisted canonical traces + pinned engine
  versions, reproduce metrics byte-identically without re-running
  detectors.
- **Inputs:** trace blob + engine pins.
- **Outputs:** `MetricEngine` outputs identical to original.
- **Runtime location:** worker (replay harness) or edge (server
  replay).
- **Determinism requirements:** all stages A6–A8 are pure functions
  over `(traces, anchors, geometry, calibration, engine_versions)`.

### F6. Forbidden non-determinism sources (global)
- Wall-clock anywhere in the value path.
- `Math.random`; any RNG not seeded by §F3.
- Iteration order over `Map`/`Set` without an explicit sort.
- Floating-point reduction order — reductions must be in fixed,
  sorted-key order.
- GPU non-determinism in detectors — only certified-deterministic
  backends are permitted in `LANDMARK_MODEL_VERSION` /
  `DETECTOR_VERSION` pins. If a deterministic GPU backend is not
  available on a device class, the detector falls back to CPU/WASM
  and the pin records the actual backend used.

---

## Section G — Desktop + mobile compatibility blueprint

### G1. CaptureEnvelope (per device class)
- **Mobile (primary):** rear camera, 1080p, target ≥60 fps (T-mid);
  1080p120 or 720p240 modes required for T-high metrics
  (`time_to_contact`, `bat_speed_contact`); tripod/stabilized; side-
  on.
- **Desktop (secondary):** uploaded clip; same envelope constraints
  apply at the validator level.
- Runtime location: client (capture UI), worker (decode + extract).

### G2. Probe contract (replaces audit S9 fallback)
- **Name:** ProbeVideoMetadata.
- **Responsibility:** measure `fps_true`, `duration_sec`, dimensions,
  codec, and `supports_rvfc` flag.
- **Inputs:** blob.
- **Outputs:** `ProbedVideoMetadata`.
- **Failure contract — explicit, no silent fallback:**
  - `requestVideoFrameCallback` unavailable OR probe times out → return
    `fps_true = null` and `supports_rvfc = false`. Do **not** synthesize
    30 fps (closes audit S9).
  - Downstream gate: any metric whose tier requires `fps_true ≥ T-mid`
    sees `fps_true = null` and emits `missing` with
    `insufficient_temporal_resolution`.
  - `videoEl.play()` rejection (autoplay blocked) → return
    `{fps_true: null, autoplay_blocked: true}`. The UI is required to
    surface this as a capture problem (not a silent pass).
  - Metadata load failure → reject the probe and refuse the analysis at
    the client gate.
- **Runtime location:** client.
- **Determinism requirements:** deterministic per blob.

### G3. Codec / container support matrix
Cells: `S` = supported (no transcode), `T` = transcode required
client-side or via edge, `U` = unsupported (capture rejected).

| Codec | Container | Safari macOS | Safari iOS | Chrome desktop | Chrome Android | Firefox |
|---|---|---|---|---|---|---|
| H.264 (AVC) | MP4 | S | S | S | S | S |
| HEVC (H.265) | MP4/MOV | S | S | S (HW-dep.) | S (HW-dep.) | T |
| VP9 | WebM | T | T | S | S | S |
| AV1 | MP4/WebM | T (newer HW only) | T (newer HW only) | S (recent) | S (recent) | S (recent) |

Behavior:
- `S` → proceed to A2 probe directly.
- `T` → route through a transcode step (edge or client WASM) before A2;
  transcode parameters are part of `frame_plan_id` and therefore enter
  §F2 fingerprint.
- `U` → reject capture at the client gate with an actionable message.

### G4. Autoplay-blocked handling
- Behavior at probe time per §G2.
- No detector runs against an autoplay-blocked clip; the analysis is
  refused at the client gate.

### G5. Frame-density gate
- Enforced at probe time using `fps_true` against the metric tier
  table (`T-low ≥ 30`, `T-mid ≥ 60`, `T-high ≥ 120`).
- Per metric, if `fps_true` falls below the metric's required tier,
  the metric is emitted with `missing` and `insufficient_temporal_resolution`.
- A clip below T-low for **all** metrics is rejected at the client
  gate before any edge call.

---

## Section H — Validation blueprint

### H1. DeterminismHarness
- **Name:** DeterminismHarness.
- **Responsibility:** assert byte-identical metric outputs across:
  - Re-uploads of identical bytes (same browser, same device).
  - Re-runs on the same browser at different wall-clock times.
  - Same bytes across browser variants (modulo declared backend
    variance recorded in `LANDMARK_MODEL_VERSION` /
    `DETECTOR_VERSION`).
- **Inputs:** corpus of fixed-byte clips.
- **Outputs:** pass/fail report per assertion.
- **Pass gate:** 100% byte-identical for deterministic metrics; for
  hybrid metrics, deterministic channel byte-identical and residual
  reproducible at pinned seed.

### H2. GoldenClipSuite
- **Name:** GoldenClipSuite.
- **Responsibility:** per-metric labeled ground-truth clips with
  human-labeled anchor frames and physical measurements (where
  applicable, e.g., bat speed from instrumented bat).
- **Inputs:** golden clips + labels.
- **Outputs:** per-metric error distributions and pass rate.
- **Required pass thresholds (per category):**
  - Deterministic metrics: declared error bound per metric; pass rate
    ≥ declared floor (declared in metric registry, not invented here).
  - Hybrid metrics: deterministic channel pass rate as above; residual
    must not flip tile-state class on > X% of clips (X declared per
    metric).

### H3. ConfidenceCalibrationHarness
- **Name:** ConfidenceCalibrationHarness.
- **Responsibility:** verify that reported `confidence` is monotonic in
  observed error on the golden set (high confidence → low error; low
  confidence → permitted higher error).
- **Inputs:** golden clip metric outputs + labels.
- **Outputs:** per-metric Spearman ρ of confidence-vs-error; required
  ρ ≤ declared threshold (negative correlation: higher confidence →
  lower error).

### H4. MissingnessAudit
- **Name:** MissingnessAudit.
- **Responsibility:** verify each `missing_reason` enum value has at
  least one golden clip that exercises it for at least one metric.
- **Coverage matrix:** rows = `missing_reason` values, columns = 18
  metrics, cells = whether at least one golden clip triggers that
  reason for that metric. Required coverage: every (metric, applicable
  reason) cell has ≥1 clip.

### H5. ReplayHarness
- **Name:** ReplayHarness.
- **Responsibility:** from persisted traces, reproduce metric outputs
  byte-identically to the live run.
- **Pass gate:** 100% identical for deterministic; identical
  deterministic channel + reproducible residual for hybrid.

### H6. Rollout gate
- A metric is permitted in production iff:
  - H1 100% pass.
  - H2 meets declared per-metric pass rate.
  - H3 meets declared per-metric monotonicity threshold.
  - H4 covers all applicable `(metric, reason)` cells for the metric.
  - H5 100% pass.

---

## Section I — Production-readiness gates

Per-metric checklist; cells declare the **required artifact** that
must exist for the gate to be satisfied. This table is a
specification of what must exist, not a status report.

Gate legend:
1. Detector(s) implemented and pinned.
2. Anchor(s) implemented at required confidence floor.
3. Frame-density gate enforced at probe time.
4. Calibration path implemented (or "scale-free" declared).
5. Missingness rules enforced server-side.
6. Confidence formula implemented and exposed.
7. Determinism harness (§H1) passes.
8. Golden-clip suite (§H2) passes per declared floor.
9. Tile-state mapper wired at locked thresholds.
10. Replay harness (§H5) passes.

| Metric | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| `hip_load` | D-POSE pin | `hand_load_apex` ≥0.6 | T-low | scale-free | `landmark_occluded`/`anchor_not_detected` | per-tile | identical bytes | declared floor | 65/88 | identical bytes |
| `hand_load` | D-POSE pin | `hand_load_apex` ≥0.6 | T-mid | scale-free | as above | per-tile | identical bytes | floor | per registry | identical bytes |
| `p2_timing` | D-POSE + D-RELEASE | both ≥0.7 | T-mid (T-high preferred) | none | `anchor_not_detected`/`out_of_frame` | per-tile | identical bytes | floor | asym. deadband per memo | identical bytes |
| `eyes_tracking` | D-POSE (+D-BALL uplift) | `contact_frame` ≥0.8 | T-mid | scale-free | `landmark_occluded`/`anchor_not_detected` | per-tile | identical bytes | floor | per registry | identical bytes |
| `stride_direction` | D-POSE pin | `front_foot_full_plant` ≥0.7 | T-mid | envelope-implicit | `landmark_occluded`/`anchor_not_detected`/`out_of_frame` | per-tile | identical bytes | floor | per registry | identical bytes |
| `heel_plant` | D-POSE + D-PLANT | both plant anchors ≥0.7 | T-mid | scale-free | as above | per-tile | identical bytes | floor | per registry | identical bytes |
| `p3_timing` | D-POSE + D-RELEASE + D-PLANT | both anchors ≥0.7 | T-mid (T-high preferred); below → `insufficient_temporal_resolution` | none | as above | per-tile | identical bytes | floor | asym. deadband per memo | identical bytes |
| `hands_outside_shoulders_at_landing` | D-POSE pin | `front_foot_full_plant` ≥0.7 | T-low | envelope-implicit | as above | per-tile | identical bytes | floor | boolean tile | identical bytes |
| `sequencing` | D-POSE + D-BAT | `swing_initiation`, `contact_frame` | T-mid (T-high preferred) | scale-free | `landmark_occluded`/`anchor_not_detected`/`insufficient_temporal_resolution` | per-tile | identical bytes | floor | per registry | identical bytes |
| `bat_path` | D-BAT + plane prior | entry/exit + `contact_frame` ≥0.6/0.8 | T-mid (T-high preferred) | plane-prior policy | `bat_not_detected`/`anchor_not_detected`/`out_of_frame` | per-tile | identical bytes | floor | 65/88 | identical bytes |
| `on_plane` | D-BAT + plane prior | `swing_initiation`, `contact_frame` | T-mid | plane-prior policy | `bat_not_detected`/`anchor_not_detected` | per-tile | identical bytes | floor | 60/85 (`%` not `score_100`) | identical bytes |
| `time_to_contact` | D-POSE + D-BAT + D-CONTACT | both anchors ≥0.7/0.8 | **T-high required**; T-mid permitted w/ wide band; T-low → `insufficient_temporal_resolution` | none | as above | per-tile w/ explicit ±band | identical bytes | floor | ms-domain meter | identical bytes |
| `bat_speed_contact` | D-BAT + D-CONTACT | ±N around `contact_frame`; contact ≥0.8 | T-high required | **bat-length calibration** (user-entered preferred; default 33 in low-conf) | `bat_not_detected`/`anchor_not_detected`/`insufficient_temporal_resolution`/`calibration_unavailable` | per-tile w/ explicit ±band derived from calibration | identical bytes (deterministic channel) | floor (vs. instrumented bat where available) | mph-domain meter | identical bytes |
| `back_elbow_contact` | D-POSE (+D-BAT for channel c) | `swing_initiation`, `contact_frame` | T-mid | scale-free | `landmark_occluded`/`anchor_not_detected`/`bat_not_detected` (channel c only) | per-tile | identical bytes | floor | per memo | identical bytes |
| `hitters_move` | transitive | transitive | transitive | transitive | propagated dominant reason | weighted mean capped by min | identical bytes | floor | per registry | identical bytes |
| `shoulder_plane_steadiness` | D-POSE pin | `swing_initiation`, `contact_frame` | T-mid | scale-free | `landmark_occluded`/`anchor_not_detected` | per-tile | identical bytes | floor | per registry | identical bytes |
| `finish_balance` | D-POSE pin | `contact_frame`, `finish_frame` | T-low | scale-free | as above | per-tile | identical bytes | floor | per memo | identical bytes |
| `shoulder_to_shoulder_hold` | D-POSE pin | `front_foot_full_plant`, `contact_frame` | T-mid | scale-free | as above | per-tile (percent + booleans) | identical bytes | floor | percent + booleans per registry | identical bytes |

---

## Closing constraints (restated)

- No code changes.
- No schema changes.
- No prompt changes.
- No UI changes.
- No roadmap.
- No sequencing.
- No edits outside this blueprint file.

This document is the sole deliverable.
