
# Plan — Phase 4: Canonical Implementation Blueprint

Produce exactly one new file: **`.lovable/canonical-implementation-blueprint.md`**

Translates `.lovable/canonical-measurement-architecture.md` into an
implementation-ready blueprint. No new methodology, no new
architecture, no code, no roadmap, no sequencing, no edits to any
other file.

## Source inputs (read-only)
- `.lovable/canonical-measurement-architecture.md`
- `.lovable/analysis-truth-audit.md`
- `.lovable/analysis-truth-extraction.md`
- `.lovable/bat-path-vs-on-plane-definitions.md`
- `.lovable/p3-timing-methodology.md`
- `.lovable/time-to-contact-vs-power.md`
- `.lovable/back-elbow-methodology.md`
- `.lovable/finish-and-balance-methodology.md`

## Document structure

### Preamble
- Purpose: implementation-ready blueprint, derived strictly from the
  canonical measurement architecture; no new design.
- Component schema applied uniformly: **name · responsibility · inputs ·
  outputs · dependencies · runtime location (client/worker/edge/db) ·
  data contracts · failure states · confidence propagation · determinism
  requirements**.
- Runtime-location definitions:
  - **client** — main browser thread (UI, capture, light orchestration).
  - **worker** — browser Web Worker / OffscreenCanvas / WASM runtime
    (pose, bat, ball, contact, release, plant detectors; geometry).
  - **edge** — Supabase edge function (ingestion, AI-assisted residuals,
    persistence, audit).
  - **database** — Postgres tables and storage (videos, analyses, run
    audit, lineage).
- Determinism contract: every component declares whether its outputs are
  byte-identical under identical inputs at pinned engine versions, and
  what its non-determinism sources are (if any).

### Section A — End-to-end system topology
- Pipeline diagram (ASCII): Capture → Probe → Frame Extraction →
  Detection Layer → Event Anchors → Geometry Layer → Metric Engine →
  Confidence Layer → Report Card → AI Coaching.
- For each stage: producer, consumer, runtime location, data contract
  exchanged, determinism boundary.
- Storage seams: where canonical traces are persisted vs ephemeral.
- Replay seam: where re-running from persisted traces reproduces the
  same metrics without re-running the model.

### Section B — Detector blueprint
One subsection per detector, full component schema:
1. **D-POSE** — MediaPipe Pose Landmarker (Blazepose Full).
2. **D-HANDS** — MediaPipe Hands (knob/grip refinement).
3. **D-BAT** — bat keypoint detector (knob, mid, barrel-tip).
4. **D-BALL** — pitched-ball tracker (optional uplift).
5. **D-CONTACT** — contact-frame detector.
6. **D-RELEASE** — pitcher-release event detector.
7. **D-PLANT** — front-foot plant detector.
Each subsection includes: model identity + version pin, input frame
contract, output keypoint/event contract, fps requirements,
visibility/confidence thresholds, runtime location, failure modes
(`landmark_occluded`, `bat_not_detected`, `anchor_not_detected`, etc.),
and how confidence is exposed to downstream components.

### Section C — Event-anchor blueprint
For each canonical anchor (`pitcher_release_frame`,
`front_foot_first_contact`, `front_foot_full_plant`, `hand_load_apex`,
`swing_initiation`, `bat_lag_max`, `barrel_in_zone_entry`,
`contact_frame`, `barrel_in_zone_exit`, `finish_frame`):
- Detector binding (from §B).
- Inputs (frames + keypoint traces).
- Output contract: `{frame_index, t_ms, confidence, source_detector,
  contributing_signals[]}`.
- Required minimum confidence and fallback (= `anchor_not_detected`).
- Runtime location (worker).
- Determinism: deterministic given pinned detector versions.

### Section D — Metric-engine blueprint
- Engine surface: takes `{pose_trace, bat_trace, ball_trace?, anchors,
  calibration}` and returns the 18 metric values + per-metric
  confidence + per-metric missingness reason.
- Per-metric component declaration: name, category (deterministic /
  hybrid), inputs from §B/§C, formula reference (cites
  `canonical-measurement-architecture.md` §Part 2 row), output schema,
  failure states, confidence propagation, determinism.
- Hybrid residual subsystem: bounded ±10 residual envelope, model
  identity, prompt contract surface, deterministic call parameters
  (temp 0, seed derived from trace fingerprint not videoId).
- Runtime location: deterministic channels in worker; hybrid residual
  in edge.

### Section E — Report-card blueprint
- Tile-state mapper (deterministic): metric value + confidence →
  `{elite|pass|warn|fail|missing}` using thresholds from the discipline
  registry (no model in this path).
- Phase orb aggregator: enforces the audit's S1 contract — orb label =
  `passed/measured` percentage; numeric label denominator clarified;
  missing tiles excluded.
- Ribbon coverage: `measured`, `total`, `eliteCount`,
  `nonNegotiableFailed` definitions, with the audit's note that
  completed-with-null analyses are forbidden at this seam.
- AI coaching layer: consumes deterministic tile states + confidence +
  missingness; never authors metric values; declared as a presentation-
  only consumer.
- Runtime location: client.
- Determinism: identical metrics + thresholds → identical tile states
  and orbs; AI coaching is permitted to vary within its own bounded
  envelope and is replay-equivalent under pinned model + seed derived
  from tile-state fingerprint.

### Section F — Determinism blueprint
- Engine version pins: `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`,
  `METRIC_ENGINE_VERSION` — must move off `@0.0.0-stub` (audit S3) and
  must enter the fingerprint.
- Fingerprint seam (audit S4): inputs that must be in the cache
  fingerprint; inputs that must NOT be in it (prompt text, model id).
- Seed policy: replace `seed = stableSeed(videoId)` (audit S5) with
  `seed = stableSeed(canonical_trace_fingerprint)` so identical video
  bytes → identical seed across re-uploads.
- Cache key: must key on `(video_sha256_hex, engine_versions,
  fingerprint_inputs)` and survive re-uploads with new `videos.id`
  rows.
- Replay contract: persisted pose/bat/anchor traces + pinned engine
  versions must reproduce identical metrics without re-running
  detectors.
- Forbidden non-determinism sources: wall-clock, `Math.random`,
  iteration order over Maps/Sets without sort, floating-point reduction
  order, GPU non-determinism in detectors (must use
  deterministic-mode-or-pinned-backend flag).

### Section G — Desktop + mobile compatibility blueprint
- Capture envelope per device class (phone primary, desktop secondary).
- Probe contract: extends audit S9 — no synthetic 30 fps fallback; if
  `requestVideoFrameCallback` unavailable or probe times out, return
  `fps_unknown` and force `insufficient_temporal_resolution`
  missingness downstream.
- Codec/container support matrix (rows: H.264, HEVC, VP9, AV1;
  columns: Safari macOS, Safari iOS, Chrome desktop, Chrome Android,
  Firefox); cells: `supported / transcode-required / unsupported`.
- Autoplay-blocked handling: explicit failure path, not silent fallback.
- Frame-density gate: T-low/T-mid/T-high per-metric requirements (from
  measurement architecture) enforced at probe time.
- Runtime location: client (capture, probe), worker (decode/extract).

### Section H — Validation blueprint
- Determinism harness: re-upload identical bytes → byte-identical
  metrics; cross-browser identical bytes → byte-identical metrics
  (modulo declared backend variance).
- Golden-clip suite: per-metric labeled ground-truth clips; required
  pass rates per metric tier (deterministic vs hybrid).
- Confidence calibration: confidence values vs observed error on the
  golden set must be monotonic.
- Missingness audit: every `missing_reason` enum value must have at
  least one golden clip that exercises it.
- Replay harness: from persisted traces, metric outputs must be
  byte-identical to the live run.
- Production rollout gate: validation harness pass thresholds per
  metric.

### Section I — Production-readiness gates
For each of the 18 metrics, a gate checklist derived from the canonical
measurement architecture:
1. Detector(s) implemented and version-pinned.
2. Anchor(s) implemented with required confidence floor.
3. Frame-density gate enforced.
4. Calibration path implemented (or declared scale-free).
5. Missingness rules enforced server-side, not at UI.
6. Confidence formula implemented and exposed.
7. Determinism harness passes.
8. Golden-clip suite passes.
9. Tile-state mapper wired with locked thresholds.
10. Replay harness passes.

Output: a single table — rows = 18 metrics, columns = gates 1–10,
cells = required artifacts (not status; this is spec, not status).

### Closing constraints (restated)
- No code changes.
- No schema changes.
- No prompt changes.
- No UI changes.
- No roadmap.
- No sequencing.
- No edits outside the blueprint file.
- Document is the sole deliverable; nothing else is written.

Approve to write `.lovable/canonical-implementation-blueprint.md`.
