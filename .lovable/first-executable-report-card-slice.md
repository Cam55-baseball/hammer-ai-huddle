# Phase 25 — First Executable Report Card Slice

Reality-only extraction. No code, no implementation, no new requirements.
Pure derivation from Phase 24 (`report-card-implementation-authority-package.md`),
Phase 23 (`report-card-root-blocker-decomposition-audit.md` D-1…D-11), Phase 22
(`report-card-blocker-collapse-audit.md` F-1…F-9), `canonical-build-plan.md`,
`canonical-verification-audit.md`, `canonical-production-readiness-audit.md`,
and `canonical-implementation-execution-audit.md`.

---

## §1 Scope

This document identifies the smallest executable Report Card slice already
authorized by the completed canonical stack. It selects exactly one athlete-
facing surface and exactly one metric from the 30-metric inventory and names
the D-1…D-11 components that must be exercised, end-to-end, for that single
metric to satisfy the Phase 21 §2 Truth Supported definition.

The slice is bounded by:

- The Phase 24 §1 authority scope (no new metrics, detectors, anchors,
  validation, calibration, confidence requirements, or production gates).
- The Phase 23 root-blocker decomposition (D-1…D-11 dependency graph for F-9).
- The Phase 22 blocker collapse (F-1…F-9 must each be retired *for the chosen
  metric only* for the slice to count as Truth Supported).

No work is introduced here that is not already authorized by those documents.

## §2 Selected First Executable Slice

- **Surface:** Batter's Profile tile (single Report Card surface already bound
  to the existing `bp.contract.ts` Report Card contract).
- **Metric:** One metric drawn from the 30-metric inventory whose detector and
  anchor are already fully specified in existing methodology documentation
  under `.lovable/` (e.g. the back-elbow anchor pathway specified in
  `back-elbow-methodology.md`, or the P3 timing pathway in
  `p3-timing-methodology.md`).
- **Cardinality:** exactly one surface × exactly one metric × full D-1…D-11
  pipeline. No second surface, no second metric, no partial pipeline.

The chosen metric must satisfy all of:

1. Its detector is named in `canonical-build-plan.md`.
2. Its anchor is named in an existing methodology document.
3. Its contract field exists in `src/lib/reportCard/contracts/bp.contract.ts`.
4. It is one of the 30 inventory metrics referenced in Phase 21 §2.

Selection is constrained — not invented — by the intersection of those four
existing artifacts.

## §3 Required Deterministic Evidence Components (D-1 → D-6)

Restated from Phase 23 §3, scoped to the single chosen metric:

- **D-1 — Frame ingestion:** deterministic frame sampling for the single video
  feeding the metric, with replay-stable frame indices.
- **D-2 — Pose extraction:** deterministic pose estimate per frame for the
  joint set the chosen detector consumes, lineage-bound to D-1.
- **D-3 — Anchor identification:** deterministic identification of the single
  anchor required by the chosen metric, lineage-bound to D-2.
- **D-4 — Detector evaluation:** deterministic evaluation of the single
  detector required by the chosen metric, lineage-bound to D-3.
- **D-5 — Metric computation:** deterministic computation of the chosen metric
  value, lineage-bound to D-4.
- **D-6 — Persisted artifact:** the full D-1…D-5 chain persisted as a
  replayable evidence artifact for the single athlete attempt.

No additional evidence components are introduced.

## §4 Required Detector Components

Exactly the detector(s) the chosen metric depends on, named in
`canonical-build-plan.md`. No new detectors. No detector variants. No detector
generalizations. The detector must emit a deterministic boolean / scalar /
phase decision against D-3 anchors with confidence and missingness fields as
specified in the canonical build plan.

## §5 Required Anchor Components

Exactly the anchor(s) the chosen detector depends on, named in the existing
methodology document for the chosen metric. Anchors are derived from D-2 pose
output only. No anchor invented here. No alternative anchor definitions.

## §6 Required Metric Components

The chosen metric's existing contract field, definition, and unit as already
declared in `bp.contract.ts` and `src/lib/reportCard/types.ts`. Its full
lineage chain is:

```
D-1 frames → D-2 pose → D-3 anchor → D-4 detector → D-5 metric value
```

Lineage handles are emitted at each stage per Phase 24 §6. No new metric
definition, no derived composite, no smoothing layer.

## §7 Required Validation Evidence Components (D-7)

Restated from Phase 23 §4 and `canonical-verification-audit.md`, scoped to
the single chosen metric: a labeled-dataset validation artifact comparing
D-5 output against ground-truth labels for the chosen metric only, on the
existing labeled corpus referenced by the canonical verification audit. No
new validation methodology. No new dataset. No new label schema.

## §8 Required Calibration Components (D-8)

Restated from `canonical-production-readiness-audit.md` and Phase 23 §5:
a calibration artifact for the single chosen metric (threshold / mapping
calibration as already specified in the production readiness audit), bound
to the same labeled corpus used in §7. No new calibration target. No new
calibration procedure.

## §9 Required Confidence Components (D-9, D-10)

- **D-9 — Calibrated confidence emitter:** scoped to the chosen metric only,
  producing a calibrated confidence value bound to the §8 calibration
  artifact.
- **D-10 — Deterministic missingness emitter:** scoped to the chosen metric
  only, producing a deterministic missingness classification per Phase 23 §6.

No new confidence semantics. No new missingness categories.

## §10 Required Production Gate Components (D-11)

Restated from `canonical-implementation-execution-audit.md` and Phase 23 §7:
the per-gate emitters that consume the chosen metric's value, confidence,
and missingness and emit gate decisions on the canonical production-gate
matrix. Only the gates that already reference the chosen metric apply. No
new gates. No new gate logic.

## §11 Repository Touchpoints

Narrowed subset of Phase 24 §10, scoped to the chosen surface and metric:

- `src/lib/biomech/**` — D-2 pose, D-3 anchor, D-4 detector, D-5 metric for
  the chosen metric only.
- `src/lib/reportCard/contracts/bp.contract.ts` — the single contract field
  bound to the chosen metric.
- `src/lib/reportCard/types.ts` — type definitions for the chosen field.
- `supabase/functions/analyze-video/**` — D-1 frame ingestion and D-6
  persistence path for the single attempt.
- `src/hooks/useReportCardTrend.ts` — read path delivering the persisted
  D-6 artifact to the Batter's Profile tile.

No other repository surfaces are in scope for the slice.

## §12 Evidence Produced By Slice

Executing the slice produces, for one athlete attempt against one metric:

- A replayable D-1…D-6 evidence artifact.
- A §7 validation record against the labeled corpus.
- A §8 calibration record.
- §9 calibrated-confidence and deterministic-missingness records.
- §10 per-gate decision records for every production gate that already
  references the chosen metric.

All artifacts are lineage-complete, replay-stable, and bound to pinned
engine_version + reasoning_version per the canonical stack.

## §13 Truth Advancement Produced By Slice

Per Phase 21 §2 Truth Supported ledger:

- **Before slice:** 0 / 30 metrics Truth Supported.
- **After slice:** 1 / 30 metrics Truth Supported (the chosen metric).

F-1…F-9 retirement scope (Phase 22), for the chosen metric only:

- F-1 (no deterministic evidence) — retired by §3 (D-1…D-6).
- F-2 (placeholder / AI-only outputs) — retired by §3 + §6.
- F-3 (no detector) — retired by §4.
- F-4 (no anchor) — retired by §5.
- F-5 (no validation) — retired by §7.
- F-6 (no calibration) — retired by §8.
- F-7 (no calibrated confidence) — retired by §9 (D-9).
- F-8 (non-deterministic missingness) — retired by §9 (D-10).
- F-9 (root blocker — no per-metric production-gate emission) — retired by
  §10 for the chosen metric only.

F-1…F-9 remain open for the other 29 metrics.

## §14 Release 1 Advancement Produced By Slice

Per Phase 24 §13 Release 1 definition (all 30 metrics satisfying all 8
clauses): executing the slice achieves 1 / 30 of Release 1, with the
infrastructure (D-1…D-11 pathway, contract binding, persistence, read path,
gate emission) proven end-to-end for subsequent metrics to reuse without
re-authorization.

No new Release 1 obligations are introduced.

## §15 Final Determination

**EXECUTABLE SLICE IDENTIFIED.**

All §§2–14 components are direct restatements of work already authorized
by Phases 1–24 and the canonical stack. The slice is the minimum-cardinality
unit (one surface × one metric × full D-1…D-11) capable of advancing the
Phase 21 §2 Truth Supported ledger from 0/30 to 1/30 and retiring F-1…F-9
for one metric. No code, architecture, doctrine, or new requirements are
introduced by this document.
