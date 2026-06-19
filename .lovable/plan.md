# Phase 24 — Report Card Implementation Authority Package

## Deliverable

Create exactly one new file:

- `.lovable/report-card-implementation-authority-package.md`

No other files created, modified, or deleted.

## Purpose

Transition from planning/audit into implementation authority. The document does **not** implement code — it extracts and names the exact implementation work already authorized by the completed canonical stack (Phases 1–23) and by the decomposed root blocker F-9 dependencies (D-1…D-11).

## Source Inputs (read-only)

- `.lovable/report-card-root-blocker-decomposition-audit.md` (Phase 23)
- `.lovable/report-card-blocker-collapse-audit.md` (Phase 22)
- `.lovable/report-card-metric-truth-closure-audit.md` (Phase 21)
- `.lovable/report-card-metric-truth-audit.md`
- `.lovable/canonical-execution-authorization.md`
- `.lovable/canonical-build-plan.md`
- `.lovable/canonical-verification-audit.md`
- `.lovable/canonical-production-readiness-audit.md`
- `.lovable/canonical-implementation-execution-audit.md`

Read-only repo cross-reference surfaces (no edits):
`src/lib/biomech/**`, `src/lib/reportCard/**`, `supabase/functions/analyze-video/**`, `src/hooks/useReportCardTrend.ts`, `src/hooks/usePitchingV2Trends.ts`, `src/hooks/useHIESnapshot.ts`.

## Structure of the file

- **§1 Authority Scope** — what is and is not authorized; reality-only; no new requirements introduced.
- **§2 Authorized Deterministic Evidence Layer Work** — work authorized by D-1…D-6 (deterministic frames, pose, anchors, detector outputs, metric engine, persisted replayable artifacts).
- **§3 Authorized Detector Implementation Work** — derived from D-4 + canonical-build-plan.
- **§4 Authorized Anchor Implementation Work** — derived from D-3 + canonical-build-plan.
- **§5 Authorized Metric Engine Work** — derived from D-5 + canonical-verification-audit.
- **§6 Authorized Validation Harness Work** — derived from D-7 + canonical-verification-audit.
- **§7 Authorized Calibration Infrastructure Work** — derived from D-8 + canonical-production-readiness-audit.
- **§8 Authorized Confidence Infrastructure Work** — derived from D-9 + D-10 + canonical-production-readiness-audit.
- **§9 Authorized Production Gate Closure Work** — derived from D-11 + canonical-production-readiness-audit + canonical-implementation-execution-audit.
- **§10 Authorized Repository Touchpoints** — restated from Phase 23 §6 (biomech/**, reportCard/**, analyze-video/**, hooks).
- **§11 Implementation Dependency Order** — restated linear order D-1→D-2→D-3→D-4→D-5→D-6, then branches D-7/D-8/D-9/D-10/D-11.
- **§12 First Executable Report Card Slice** — smallest slice (single surface + single metric) whose closure exercises D-1…D-11 end-to-end, extracted from existing canonical inputs.
- **§13 Report Card Release 1 Completion Definition** — restated from canonical-production-readiness-audit + Phase 21 §2 Truth Supported criteria.
- **§14 Final Authorization** — one of: AUTHORIZED FOR IMPLEMENTATION / PARTIALLY AUTHORIZED / NOT AUTHORIZED, justified strictly by §§1–13.

## Constraints

- Exactly one file.
- Reality only — pure extraction from existing canonical inputs.
- No code, no architecture changes, no doctrine changes.
- No new metrics, detectors, anchors, validation, calibration, confidence requirements, or production gates.
- No remediation, sequencing beyond the dependency order already established, or estimates.
