# Phase 25 — First Executable Report Card Slice Implementation Plan

## Deliverable

Create exactly one new file:

- `.lovable/first-executable-report-card-slice.md`

No other files created, modified, or deleted.

## Purpose

Translate Phase 24's authorized implementation work into the smallest executable Report Card slice capable of generating the first truth-supported athlete-facing metric. Pure extraction — no code, no new requirements.

## Source Inputs (read-only)

- `.lovable/report-card-implementation-authority-package.md` (Phase 24)
- `.lovable/report-card-root-blocker-decomposition-audit.md` (Phase 23, D-1…D-11)
- `.lovable/report-card-blocker-collapse-audit.md` (Phase 22)
- `.lovable/canonical-build-plan.md`
- `.lovable/canonical-verification-audit.md`
- `.lovable/canonical-production-readiness-audit.md`
- `.lovable/canonical-implementation-execution-audit.md`

Read-only repo cross-reference: `src/lib/biomech/**`, `src/lib/reportCard/contracts/bp.contract.ts`, `src/lib/reportCard/types.ts`, `supabase/functions/analyze-video/**`, `src/hooks/useReportCardTrend.ts`.

## File structure

- **§1 Scope** — reality-only extraction; no new requirements; bounded by Phase 24 §1 authority scope.
- **§2 Selected First Executable Slice** — single surface (Batter's Profile tile, bound to `bp.contract.ts`) + single metric chosen from the 30-metric inventory whose anchors/detectors are already fully specified in existing methodology docs (`.lovable/back-elbow-methodology.md` or `.lovable/p3-timing-methodology.md`).
- **§3 Required Deterministic Evidence Components** — restated D-1…D-6 components required for the chosen metric only.
- **§4 Required Detector Components** — exact detector(s) the chosen metric depends on, named from canonical-build-plan.
- **§5 Required Anchor Components** — exact anchor(s) the chosen metric depends on, named from methodology docs.
- **§6 Required Metric Components** — chosen metric definition and lineage chain D-1→D-5, restated from existing contracts.
- **§7 Required Validation Evidence Components** — labeled-dataset validation artifact for the chosen metric per canonical-verification-audit.
- **§8 Required Calibration Components** — calibration artifact for the chosen metric per canonical-production-readiness-audit.
- **§9 Required Confidence Components** — calibrated confidence + deterministic missingness emitters scoped to the chosen metric.
- **§10 Required Production Gate Components** — per-gate emitters that consume the chosen metric, scoped from canonical-production-gate-matrix.
- **§11 Repository Touchpoints** — narrowed subset of Phase 24 §10 surfaces required by the slice.
- **§12 Evidence Produced By Slice** — replayable artifacts, validation records, calibration records, confidence/missingness records, per-gate decisions emitted by executing the slice.
- **§13 Truth Advancement Produced By Slice** — exact movement on the Phase 21 §2 Truth Supported ledger (0/30 → 1/30) and which F-1…F-9 blockers are retired for that one metric.
- **§14 Release 1 Advancement Produced By Slice** — fraction of canonical Release 1 (Phase 24 §13) achieved by executing the slice.
- **§15 Final Determination** — EXECUTABLE SLICE IDENTIFIED or EXECUTABLE SLICE NOT IDENTIFIED, justified strictly by §§2–14.

## Constraints

- Exactly one file.
- No code, no implementation, no architecture/doctrine changes.
- No new metrics, detectors, anchors, validation, calibration, confidence requirements, or production gates.
- Pure extraction of the smallest slice already authorized by Phase 24.
