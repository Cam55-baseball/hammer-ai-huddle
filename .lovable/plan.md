
# Phase 12 — Canonical Verification Audit

## Deliverable
Create exactly one new file:
- `.lovable/canonical-verification-audit.md`

No other files created, modified, or deleted.

## Purpose
Define the evidence required to verify the repository's compliance with the canonical system established in Phases 1–11. This phase only specifies verification evidence — it does not introduce architecture, implementation, validation, calibration, confidence, or production-gate requirements.

## Source Inputs (Read-Only)
- `.lovable/canonical-measurement-architecture.md`
- `.lovable/canonical-implementation-blueprint.md`
- `.lovable/canonical-gap-analysis.md`
- `.lovable/canonical-validation-framework.md`
- `.lovable/canonical-calibration-architecture.md`
- `.lovable/canonical-confidence-architecture.md`
- `.lovable/canonical-production-gate-matrix.md`
- `.lovable/canonical-implementation-reality-audit.md`
- `.lovable/canonical-build-plan.md`
- `.lovable/analysis-truth-audit.md`
- `.lovable/analysis-truth-extraction.md`
- Entire repository source tree (read-only citations only).

## Document Structure

1. **Verification Scope** — boundary, canonical-document authority, repository evaluated solely against canonical requirements.
2. **Detector Verification Matrix** — rows: D-POSE, D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE. Columns: Canonical Requirement, Required Evidence, Verification Method, Pass Criteria, Failure Criteria, Source Authority.
3. **Anchor Verification Matrix** — rows: Launch, Heel Plant, Contact, Release, Finish. Same columns.
4. **Metric Verification Matrix** — all 18 canonical BH metrics. Same columns.
5. **Report Card Verification Matrix** — rows: Phase Percentages, Phase Orbs, Tile States, Ribbon Generation, Confidence Surfacing, Missingness Surfacing, Coaching Layer. Same columns.
6. **Validation Verification Matrix** — audit against existing validation framework only (no new harnesses/gates).
7. **Calibration Verification Matrix** — audit against existing calibration architecture only.
8. **Confidence Verification Matrix** — audit against existing confidence architecture only.
9. **Production Gate Verification Matrix** — verify satisfaction of every Phase 9 production-gate requirement.
10. **Canonical Verification Inventory** — single consolidated list of all evidence required; every requirement appears exactly once.
11. **Closing Constraints** — verification-only; no code, implementation, architecture/validation/calibration/confidence/gate changes; no estimates, sequencing, prioritization; no new metrics, detectors, anchors, gates, or doctrines.

## Approach
Pure derivation from Phases 1–11. Each matrix row cites canonical clauses (`arch`, `bp`, `gap`, `val`, `cal`, `conf`, `gate`, `reality`, `build`, `audit`, `extract`) and references repository paths read-only. Required Evidence and Verification Methods are stated in terms of existing canonical mechanisms (pinned versions, determinism harnesses, calibration certificates, confidence propagation, missingness enums, replay equivalence). Pass/Failure Criteria mirror the existing trust-class ladder and production-gate definitions from Phase 9. The Canonical Verification Inventory deduplicates evidence across all matrices into one consolidated list.
