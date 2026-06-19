# Phase 23 — Root Blocker Decomposition Audit

## Deliverable
Create exactly one new file:
- `.lovable/report-card-root-blocker-decomposition-audit.md`

No other files created, modified, or deleted.

## Approach
Reality-only decomposition of the Phase 22 root blocker **F-9 (Missing Evidence)** into constituent dependencies, evidence requirements, repository touchpoints, and canonical obligations. No remediation, no implementation, no new requirements.

## Source Inputs (read-only)
- `.lovable/` audits: report-card-blocker-collapse-audit, report-card-metric-truth-audit, report-card-metric-truth-closure-audit, live-athlete-workflow-proof-audit, first-implementation-reality-audit, canonical-build-plan, canonical-production-gate-matrix, canonical-production-readiness-audit, canonical-validation-framework, canonical-calibration-architecture, canonical-confidence-architecture.
- Repo surfaces: `src/lib/reportCard/**`, `src/lib/biomech/**` (currently only `versions.ts` pinned `@0.0.0-stub`), `supabase/functions/analyze-video/**`, `src/hooks/useReportCardTrend.ts`, `src/hooks/usePitchingV2Trends.ts`, `src/hooks/useHIESnapshot.ts`.

## File Structure
- §1 Scope — root-blocker decomposition only; reality-only.
- §2 Root Blocker Definition — F-9 restated verbatim from Phase 22.
- §3 Dependency Inventory — enumerate F-9 constituents (e.g. labeled dataset, deterministic pose layer, anchor layer, detector layer, metric engine, calibration reference, validation harness, calibrated confidence surface, replay/determinism evidence, production-gate evidence).
- §4 Dependency Relationship Map — upstream/downstream ordering among the §3 dependencies.
- §5 Evidence Requirement Matrix — per dependency: required / existing / missing.
- §6 Repository Touchpoint Matrix — per dependency: repo locations, athlete-facing surfaces, report-card metrics affected.
- §7 Canonical Obligation Matrix — per dependency: validation / calibration / confidence / production-gate obligations sourced from the canonical-* audits.
- §8 Minimal Closure Set — smallest complete dependency set whose presence retires F-9 (descriptive only).
- §9 Final Determination — one of: ROOT BLOCKER FULLY DECOMPOSED / PARTIALLY DECOMPOSED / NOT DECOMPOSED, supported exclusively by §§2–8.

## Constraints
Exactly one file. Reality only. No implementation, architecture, doctrine, new metrics, detectors, anchors, validation, calibration, confidence, gates, governance, roadmap, estimates, sequencing, prioritization, or remediation.
