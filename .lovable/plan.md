
# Plan — Phase 3: Canonical Measurement Architecture

Produce exactly one new file: **`.lovable/canonical-measurement-architecture.md`**

No code, schema, prompt, UI, or roadmap changes. Spec-only.

## Source inputs (read-only references)
- `.lovable/analysis-truth-audit.md` (S1–S11)
- `.lovable/analysis-truth-extraction.md`
- `.lovable/bat-path-vs-on-plane-definitions.md`
- `.lovable/p3-timing-methodology.md`
- `.lovable/time-to-contact-vs-power.md`
- `.lovable/back-elbow-methodology.md`
- `.lovable/finish-and-balance-methodology.md`
- `src/lib/reportCard/disciplines/bh.ts` (tile registry)
- `src/lib/reportCard/contracts/bh.contract.ts` (field contracts)
- `supabase/functions/_shared/reportCardContracts.ts` (prompt contracts)

## Document structure

### Part 0 — Preamble
- Purpose: permanent source-of-truth for production measurement of every BH metric.
- Scope: specification only; no implementation.
- Measurement categories defined: **deterministic** (pure computer-vision / pose math), **AI-assisted** (model interprets pose/event traces deterministically extracted), **hybrid** (deterministic geometry + AI judgement on residuals).
- Canonical capture envelope: phone-only baseline (single rear camera, side-on, 1080p, ≥60 fps target, ≥30 fps floor), tripod or stabilized; multi-camera and external sensor envelopes called out where required.
- Canonical detector stack: MediaPipe Pose (Blazepose Full) as baseline; bat/ball detector (custom YOLO-class) called out per metric; release/landing event detectors as separate modules.
- Confidence model: per-landmark visibility × per-anchor temporal certainty × per-formula numeric stability → tile confidence in [0,1].
- Missingness rules: every metric must declare the precondition that, if unmet, forces `missing` with an explicit `missing_reason` from a fixed enum (`insufficient_temporal_resolution`, `landmark_occluded`, `anchor_not_detected`, `calibration_unavailable`, `bat_not_detected`, `out_of_frame`, `single_pass_only`).

### Part 1 — Cross-cutting requirements
- **Frame density tiers:** T-low (≥30 fps), T-mid (≥60 fps), T-high (≥120 fps). Per-metric minimum tier defined.
- **Event anchors (canonical list):** `pitcher_release_frame`, `front_foot_first_contact`, `front_foot_full_plant`, `hand_load_apex`, `swing_initiation`, `bat_lag_max`, `barrel_in_zone_entry`, `contact_frame`, `barrel_in_zone_exit`, `finish_frame`. Each anchor's detector type, allowed sources, required confidence, and fallback specified.
- **Landmarks of interest:** shoulders (L/R), elbows, wrists, hips (L/R), knees, ankles, head/nose, ears. Bat keypoints (knob, mid, barrel-tip) come from a dedicated bat detector, not MediaPipe.
- **Calibration framework:** intrinsic (focal length / lens distortion — phone-supplied or estimated), extrinsic (camera-to-batter), metric scaling (bat-length prior, hip-width prior, on-screen calibration card optional). For any speed/distance metric, the calibration source and uncertainty must be declared.
- **Phone-only support criteria:** metric is phone-only-supportable iff every required input can be sourced from a single rear-cam capture at the metric's minimum frame-density tier under the canonical envelope.
- **Production readiness gate:** metric is production-ready iff (a) deterministic or hybrid, (b) detectors specified and benchmarked, (c) calibration path defined, (d) missingness rules enforced server-side, (e) confidence formula declared, (f) replay-deterministic across re-uploads.

### Part 2 — Per-metric specifications (all 18 BH tiles)

Each metric documented under a fixed sub-schema:

```
### <tile_key> — <display name>
- Phase: P1 | P2 | P3 | P4
- Exact definition:
- What is being measured:
- Measurement category: deterministic | AI-assisted | hybrid
- Required detectors:
- Required landmarks:
- Required event anchors:
- Required frame density: T-low | T-mid | T-high
- Required calibration:
- Missingness rules: <preconditions> → <missing_reason>
- Confidence methodology:
- MediaPipe sufficient?: yes | no | partial (+ what's missing)
- Additional vision systems required:
- Phone-only capture sufficient?: yes | no | conditional
- Production readiness requirements:
- Recommended implementation path:
```

The 18 metrics covered, in the order defined in the audit (S10):
1. `hip_load` — P1 Hip Stability
2. `hand_load` — P2 Hand Load Quality
3. `p2_timing` — P2 Hand Load timing vs pitcher event ★
4. `eyes_tracking` — P2 Eye/head tracking
5. `stride_direction` — P3 Stride direction off square
6. `heel_plant` — P3 Heel plant quality
7. `p3_timing` — P3 Foot-down vs pitcher release ★ (anchored to `.lovable/p3-timing-methodology.md`)
8. `hands_outside_shoulders_at_landing` — P3 Hands position at landing ★
9. `sequencing` — P4 Kinetic chain order
10. `bat_path` — P4 Bat path through zone ★ (anchored to `.lovable/bat-path-vs-on-plane-definitions.md`)
11. `on_plane` — P4 On-plane % ★ (same)
12. `time_to_contact` — P4 Swing-initiation→contact ms ★ (anchored to `.lovable/time-to-contact-vs-power.md`)
13. `bat_speed_contact` — P4 Barrel speed at contact ★ (anchored to `.lovable/time-to-contact-vs-power.md`)
14. `back_elbow_contact` — P4 Connect & Move / Barrel Delivery ★ (anchored to `.lovable/back-elbow-methodology.md`)
15. `hitters_move` — P4 Hitter's-move composite
16. `shoulder_plane_steadiness` — P4 Shoulder plane steadiness
17. `finish_balance` — P4 Finish balance (anchored to `.lovable/finish-and-balance-methodology.md`)
18. `shoulder_to_shoulder_hold` — P4 Chin-to-shoulder hold through contact

★ = expanded "Special Focus" treatment (longer rationale, alternate implementations, hardware tradeoffs).

### Part 3 — Special Focus deep-dives

For the nine special-focus metrics, additional subsections:
- **Why current AI-only implementation is insufficient** (cites audit S6/S7/S10/S11).
- **Minimum viable deterministic path** (detector + anchor + formula).
- **Higher-fidelity path** (multi-camera, sensor fusion, dedicated bat tracker).
- **Phone-only fallback** (whether a hybrid mode is feasible, and what its accuracy ceiling is).
- **Calibration uncertainty propagation** (especially for `bat_speed_contact` and `time_to_contact`).
- **Frame-rate sensitivity table** (per-metric resolution at 30/60/120/240 fps).

### Part 4 — Cross-metric architecture summary
- Detector inventory required to ship all 18 metrics deterministically:
  - MediaPipe Pose (Blazepose Full) — baseline pose.
  - Pitcher-release event detector.
  - Front-foot plant detector.
  - Bat keypoint detector (knob, mid, barrel-tip).
  - Contact-frame detector (audio-assist optional).
  - Optional ball-tracking detector for pitch-plane reconstruction.
- Calibration inventory:
  - Bat-length prior (user-entered or default 33 in flagged as low-confidence).
  - Hip-width prior (age/level-derived, low-confidence).
  - Optional on-screen calibration card (high-confidence).
- Frame-density inventory:
  - T-low (≥30 fps) metrics list.
  - T-mid (≥60 fps) metrics list.
  - T-high (≥120 fps) metrics list (notably `time_to_contact`, `bat_speed_contact`).
- Phone-only support summary table (yes / conditional / no per metric).
- Production-readiness summary table (deterministic-ready / hybrid-ready / AI-only-only-until-detector-built).

### Part 5 — Cross-references
- Audit traceability: every metric subsection links back to its S10/S11 evidence row.
- Methodology memo traceability: special-focus metrics cite their existing `.lovable/*.md` memos.

## Hard constraints reaffirmed
- No code changes.
- No schema changes.
- No prompt changes.
- No UI changes.
- No roadmap, no sequencing, no fix plan.
- Spec only — describes how each metric **should** be measured in production, independent of current implementation.
- Document is the sole deliverable; nothing else is written or edited.

Approve to write `.lovable/canonical-measurement-architecture.md`.
