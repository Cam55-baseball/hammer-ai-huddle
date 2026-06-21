# Phase 32 — Report Card Release 1 Implementation Closure Plan

Synthesis and closure map only. No code, no implementation, no
architecture / doctrine / metric / detector / anchor / validation /
calibration / confidence / production-gate / requirement changes. All
claims line-cited to existing repository surfaces or sealed `.lovable/`
documents.

---

## §1 Scope

Release-1 eligibility = **every athlete-facing report-card metric
classified Truth Supported** under the existing canonical chain proven
for `tempo_sec` across Phases 25–31:

```
D-POSE → D-3 anchors → D-4 detectors → D-5 metric engine
       → D-6 evidence artifact → D-7 validation harness
       → D-8 calibration certificate → 6-gate production matrix
       → tile adapter → ReportCard tile
```

Athlete-facing metric inventory is fixed by the sealed truth audits
(`report-card-metric-truth-audit.md §2`, `report-card-metric-truth-
closure-audit.md §2`). This document only enumerates the implementation
closure path; no new metrics are introduced.

---

## §2 Current Report Card Truth Status

Per the sealed truth audits and Phase 27:

- `report-card-metric-truth-closure-audit.md §8`: Truth Supported **0**,
  Partially Supported **0**, Unsupported **30 of 30 unique athlete-
  facing keys**.
- `report-card-metric-truth-audit.md §7`: 100 % AI-generated; producer
  is the single AI call at `supabase/functions/analyze-video/index.ts`
  writing `videos.ai_analysis.metrics`.
- Phase 27 promoted `tempo_sec` to Partially Supported on the basis of
  the deterministic chain landed in `src/lib/biomech/**` (anchors,
  plant detector, metric engine, evidence artifact, harness,
  calibration generator, gate matrix, tile adapter). Phase 31 sealed
  `IMPLEMENTATION AUTHORIZED` for that single path.

Net current status: **1 Partially Supported (`tempo_sec`)**, **0 Truth
Supported**, **remaining 29 Unsupported**.

---

## §3 Metric Inventory By Truth Status

Reproduced verbatim from `report-card-metric-truth-closure-audit.md §2`
(no metrics added):

### Baseball Pitching (`src/lib/reportCard/contracts/bp.contract.ts`)
9 metrics: `energy_angle_deg`, `premature_shoulder_open_deg`,
`tempo_sec`, `stride_pct_of_height`, `head_vertical_movement_pct`,
`glove_drift_outside_frame_in`, `head_at_release_deg`,
`shoulder_tilt_deg`, `lift_thrust_deg`.

### Baseball Hitting (`src/lib/reportCard/contracts/bh.contract.ts`)
21 metric fields: `hip_stability_score_100`, `hand_load_score_100`,
`p2_timing_pass`, `eyes_track_score_100`, `stride_dir_deg_off_square`,
`heel_plant_score_100`, `p3_release_offset_ms`,
`hands_outside_shoulders_at_landing_pass`, `sequencing_ok`,
`bat_path_score_100`, `on_plane_pct`, `time_to_contact_ms`,
`bat_speed_contact_mph`, `connection_barrel_delivery_score_100`,
`hitters_move_score_100`, `shoulder_plane_steadiness_score_100`,
`finish_balance_score_100`,
`shoulder_to_shoulder_hold_pct_to_contact`,
`shoulder_to_shoulder_hold_pass`,
`front_shoulder_leak_before_contact`,
`front_shoulder_leak_pct_of_window`.

### Baseball Throwing (`src/lib/reportCard/contracts/throwing.contract.ts`)
Inherits BP minus `energy_angle_deg`, `tempo_sec`, `lift_thrust_deg`
(throwing.contract.ts:5,10): 6 unique inherited metrics.

### Softball aliases (`src/lib/reportCard/contracts/index.ts`)
`sb-pitching` aliases BP; `sh` aliases BH. Classification inherits
aliased contract.

Total unique keys: **30** (closure-audit §8 totals). Phase 27 status
overlay: `tempo_sec` → **Partially Supported**; remaining 29 →
**Unsupported**.

---

## §4 Shared Dependency Inventory

Closure dependencies shared across all metrics (single replacement
satisfies all consumers):

| Dependency | Repository surface | Current state |
|------------|--------------------|---------------|
| D-POSE landmark binding | `src/lib/biomech/versions.ts:24–25` (`LANDMARK_MODEL_ID`, `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`) | Stub |
| Detector version pin | `versions.ts:26` (`DETECTOR_VERSION = "events@0.0.0-stub"`) | Stub |
| Metric engine version pin | `versions.ts:27` (`METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"`) | Stub |
| Deterministic fingerprinting | `src/lib/biomech/fingerprint.ts` | Present |
| Tile-state contract | `src/lib/reportCard/types.ts` | Present |
| Reader contract | `src/lib/reportCard/metricReaders.ts` | Present |
| Trend hook | `src/hooks/useReportCardTrend.ts` | Present |
| Pitching-v2 hook | `src/hooks/usePitchingV2Trends.ts` | Present |
| HIE snapshot hook | `src/hooks/useHIESnapshot.ts` | Present |
| Shared metric primitives | `src/lib/biomech/metrics/{confidence,missingness}.ts` | Present |
| Frame-extraction determinism | `src/lib/biomech/frameExtractionDeterministic.ts` | Present |
| Video acceptance / metadata | `src/lib/biomech/{videoAcceptance,probeVideoMetadata}.ts` | Present |
| AI producer surface (legacy) | `supabase/functions/analyze-video/index.ts` (writes `videos.ai_analysis.metrics`) | Present, AI-only |

Per Phase 28 §11 and Phase 31 §9, the **D-POSE binding at
`versions.ts:25` is shared across every athlete-facing metric requiring
pose lineage**; replacing it once unblocks the pose-dependent half of
the closure set.

---

## §5 Detector Closure Matrix

Existing detectors at `src/lib/biomech/detectors/`:

| Detector | File | Coverage |
|----------|------|----------|
| D-PLANT (front-foot plant) | `detectors/plantDetector.ts` | Consumed only by `frontFootStrike` anchor for `tempo_sec` |

All other metric-required detectors enumerated by the closure audit are
**absent**; replication of the `tempo_sec` D-4 pattern is the canonical
closure source per `report-card-metric-truth-closure-audit.md §6–§7`.

Closure source per metric: model on `detectors/plantDetector.ts`. No
new detector class introduced by this document.

---

## §6 Anchor Closure Matrix

Existing anchors at `src/lib/biomech/anchors/`:

| Anchor | File | Coverage |
|--------|------|----------|
| Peak leg lift | `anchors/peakLegLift.ts` | `tempo_sec` |
| Front-foot strike | `anchors/frontFootStrike.ts` | `tempo_sec` |

Every other anchor required by the §3 inventory is **absent**. Closure
source per remaining metric: model on the two existing anchors, all
gated by the shared D-POSE binding in §4.

---

## §7 Metric Engine Closure Matrix

Existing metric engines at `src/lib/biomech/metrics/`:

| Engine | File | Coverage |
|--------|------|----------|
| `computeTempoSec` | `metrics/tempoSec.ts` | `tempo_sec` |
| Confidence primitive | `metrics/confidence.ts` | Shared |
| Missingness primitive | `metrics/missingness.ts` | Shared |

All other metric engines required by §3 are **absent**. Closure source
per remaining metric: model on `metrics/tempoSec.ts` + shared confidence
/ missingness primitives.

---

## §8 Validation Closure Matrix

Existing harnesses at `src/lib/biomech/validation/`:

| Harness | File | Coverage | Floor |
|---------|------|----------|-------|
| Tempo | `validation/tempoHarness.ts` | `tempo_sec` | `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` (`tempoHarness.ts:39`) |

All other per-metric harnesses are **absent**. Closure source per
metric: model on `tempoHarness.ts` using the per-metric pair schema
shape (`TempoValidationPair` at `tempoHarness.ts:21–28`). Each requires
its own EXT-CORPUS-class labeled corpus per the Phase 28 §11 / Phase 29
framework.

---

## §9 Calibration Closure Matrix

Existing certificate generators at `src/lib/biomech/calibration/`:

| Generator | File | Coverage |
|-----------|------|----------|
| Tempo certificate | `calibration/tempoCalibration.ts` | `tempo_sec` |

All other per-metric certificate generators are **absent**. Closure
source per metric: model on `tempoCalibration.ts:45–88`, which refuses
fabrication and emits `status: "calibrated"` only when the upstream
harness report is `executed` (`tempoCalibration.ts:1–13, 48–73`).

---

## §10 Confidence Closure Matrix

Existing calibrated-confidence binding path:
`computeTempoSec` → `buildTempoEvidence`
(`src/lib/biomech/evidence/tempoEvidence.ts`) →
`tempoEvidenceToTileState`
(`src/lib/biomech/reportCard/tempoTileAdapter.ts:77–84`).

| Metric | Calibrated-confidence binding |
|--------|------------------------------|
| `tempo_sec` | Wired; gated by `pose_model_is_stub` + uncalibrated certificate (Phase 31 §7) |
| Remaining 29 | **Absent** (no D-6 evidence artifact present in repo) |

Closure source per remaining metric: model on
`evidence/tempoEvidence.ts` + tile-adapter binding pattern.

---

## §11 Production Gate Closure Matrix

Existing six-gate matrices at `src/lib/biomech/gates/`:

| Gate matrix | File | Coverage |
|-------------|------|----------|
| Tempo | `gates/tempoGate.ts`, `gates/tempoGateMatrix.ts` | `tempo_sec` |

All other per-metric gate matrices are **absent**. Closure source per
metric: model on the tempo six-gate matrix referenced by Phase 31 §8
and `canonical-production-gate-matrix.md` Part 0 (component
production-ineligible if any single gate fails).

Tile-adapter blocking pattern: `tempoTileAdapter.ts:48–66` returns
`status: "missing"` with `missing_reason: "gate_blocked:<gate>"` until
`gate_matrix.all_pass`.

---

## §12 Release 1 Truth Closure Map

Per-metric remaining closure work, derived from §§5–11 and the Phase
27–31 framework. "T" = tempo template required (D-4..D-8 + gate + tile
adapter), "C" = EXT-CORPUS-class labeled corpus (≥30 paired examples
per its per-metric pair schema), "M" = shared EXT-MODEL (D-POSE)
binding from §4 (one shared replacement satisfies every entry).

| Discipline | Metrics | Remaining work |
|------------|---------|----------------|
| BP | `tempo_sec` | M + C (Phase 31-authorized; harness + certificate already present) |
| BP | `energy_angle_deg`, `premature_shoulder_open_deg`, `stride_pct_of_height`, `head_vertical_movement_pct`, `glove_drift_outside_frame_in`, `head_at_release_deg`, `shoulder_tilt_deg`, `lift_thrust_deg` | M + T + C each |
| BH | All 21 fields in §3 | M + T + C each |
| Throwing | 6 unique inherited from BP minus tempo / energy_angle / lift_thrust | M + T + C each |
| Softball aliases (`sb-pitching`, `sh`) | Inherited per `contracts/index.ts` | No additional closure beyond aliased contract |

No metric requires architecture, doctrine, schema, or new-requirement
introduction; every entry is satisfied by the existing canonical
template proven for `tempo_sec`.

---

## §13 Smallest Complete Release 1 Closure Set

Aggregated, strictly enumerative (no new requirement introduced):

1. **Shared EXT-MODEL binding (×1)** — replace
   `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"` at
   `src/lib/biomech/versions.ts:25` with the non-stub D-POSE version
   string. Unblocks pose-dependent metrics across all disciplines.
2. **Per-metric template replication (×29)** — for every Unsupported
   metric in §3, add the D-4 detector (modeled on
   `detectors/plantDetector.ts`), D-3 anchors (modeled on
   `anchors/peakLegLift.ts` / `anchors/frontFootStrike.ts`), D-5
   metric engine (modeled on `metrics/tempoSec.ts`), D-6 evidence
   artifact (modeled on `evidence/tempoEvidence.ts`), D-7 validation
   harness (modeled on `validation/tempoHarness.ts` honoring
   `MIN_LABELED_PAIRS_FOR_VALIDATION = 30`), D-8 calibration certificate
   generator (modeled on `calibration/tempoCalibration.ts`), six-gate
   matrix (modeled on `gates/tempoGate.ts` /
   `gates/tempoGateMatrix.ts`), tile adapter (modeled on
   `reportCard/tempoTileAdapter.ts`).
3. **Per-metric EXT-CORPUS-class corpora (×30)** — ≥ 30 labeled paired
   examples per metric conforming to the per-metric pair schema (same
   shape as `TempoValidationPair` at `tempoHarness.ts:21–28`),
   ingested into the per-metric harness.
4. **No additional shared dependency identified** — `versions.ts:26–27`
   (`DETECTOR_VERSION`, `METRIC_ENGINE_VERSION`) likewise require
   non-stub bindings per `canonical-implementation-blueprint.md` (cited
   in `report-card-metric-truth-closure-audit.md §1`), but these pins
   are stable strings and update once across the chain.

No new contract, schema, hook, edge-function, or doctrine artifact is
required to enumerate the closure set.

---

## §14 Remaining External Dependencies

Exhaustive list, per source inputs:

- **EXT-MODEL** — single non-stub D-POSE binding (`versions.ts:25`).
- **EXT-CORPUS-class** — one labeled corpus per metric in §3 (≥ 30
  paired examples conforming to the per-metric pair schema), per Phase
  28 §11 / Phase 29 / Phase 30 §6.
- **Version-pin updates** — non-stub `DETECTOR_VERSION` and
  `METRIC_ENGINE_VERSION` strings (`versions.ts:26–27`).

No further external dependency (third-party service, vendor model,
hardware, schema, governance artifact, or doctrinal document) is
identified by the source inputs.

---

## §15 Final Determination

**RELEASE 1 TRUTH CLOSURE IDENTIFIED**

Justification:

- §3: complete athlete-facing metric inventory is fixed by the sealed
  truth audits; no metric is missing from enumeration.
- §§4–11: every closure-axis matrix is populated entirely from existing
  canonical surfaces; the `tempo_sec` chain is a complete, sealed
  template (Phases 25–31).
- §12: every remaining metric maps cleanly to (M + T + C); no metric is
  left without an enumerable closure path under existing canonical
  requirements.
- §13: the smallest complete Release-1 closure set reduces to (a) one
  shared EXT-MODEL binding, (b) per-metric replication of the
  `tempo_sec` template across D-4..D-8 + gate + tile adapter, (c)
  per-metric EXT-CORPUS-class labeled corpora, (d) non-stub
  `DETECTOR_VERSION`/`METRIC_ENGINE_VERSION` bindings.
- §14: external dependencies are exhaustively enumerable using only
  the Phase 28–31 EXT-MODEL / EXT-CORPUS framework; no missing
  category is identified.
- No source input identifies any metric, dependency, or closure axis
  for which the existing canonical template fails to describe a
  Release-1 path.

Authorization scope: this determination is **closure-identification
only** and confers no implementation authority beyond the `tempo_sec`
scope already sealed by Phase 31 §13.
