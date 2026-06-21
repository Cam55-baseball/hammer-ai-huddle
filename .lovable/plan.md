# Phase 29 — External Evidence Readiness Audit

## Deliverable

Create exactly one new file:

- `.lovable/phase-29-external-evidence-readiness-audit.md`

No other files created, modified, or deleted. No code, doctrine, architecture, metric, detector, anchor, validation, calibration, confidence, or gate changes.

## Approach

1. Read-only review of the seven canonical source inputs in `.lovable/`:
   - `phase-28-first-truth-supported-metric-promotion-audit.md`
   - `phase-27-first-truth-supported-metric-closure.md`
   - `report-card-implementation-authority-package.md`
   - `canonical-validation-framework.md`
   - `canonical-calibration-architecture.md`
   - `canonical-confidence-architecture.md`
   - `canonical-production-gate-matrix.md`
2. Read-only review of repository surfaces:
   - `src/lib/biomech/**` (versions, anchors, detectors, metrics, evidence, gates, pipeline, replay, validation harness, reportCard adapter)
   - `src/lib/reportCard/**`
   - `supabase/functions/analyze-video/**`
   - Phase 26–28 tests under `src/lib/biomech/__tests__/**`
3. Cross-reference the two Phase 28 external blockers (`EXT-MODEL`, `EXT-CORPUS`) against existing repository readiness to assess acquisition readiness only.

## Document Structure

The single output document will contain exactly these sections, populated solely from repository evidence and the named canonical sources:

- §1 Scope — restate Phase 29 boundary (evidence-readiness analysis only).
- §2 EXT-MODEL Audit — what a non-stub D-POSE source must satisfy per `versions.ts` pinning, fingerprint binding, and canonical confidence/validation requirements; current stub state.
- §3 EXT-CORPUS Audit — labeled corpus requirements derived from `tempoHarness.ts` (`MIN_LABELED_PAIRS_FOR_VALIDATION = 30`, pair schema, fingerprint) and canonical validation framework.
- §4 Existing Repository Readiness — inventory of already-implemented surfaces (pipeline, replay, gate matrix, tile adapter, fingerprints) that will consume external evidence without further code.
- §5 Existing Validation Readiness — harness completeness vs. acquisition gap.
- §6 Existing Calibration Readiness — calibration scaffold vs. certificate emission gap.
- §7 Existing Confidence Readiness — confidence binding vs. calibrated-confidence gap.
- §8 Existing Gate Readiness — six-gate matrix state (3 pass / 3 block) and which gates flip deterministically on evidence arrival.
- §9 Earliest Achievable Truth-Supported Metric — `tempo_sec` as the unique candidate, derived from Phase 27–28 evidence.
- §10 Earliest Achievable Release-1 Report Card — implication for the 30-metric report card given a single-metric promotion path.
- §11 Remaining External Dependencies — final enumeration limited to `EXT-MODEL` and `EXT-CORPUS` (plus `EXT-EVIDENCE` if it is purely derivative).
- §12 Final Determination — one of:
  - `READY FOR EVIDENCE ACQUISITION`
  - `PARTIALLY READY FOR EVIDENCE ACQUISITION`
  - `NOT READY FOR EVIDENCE ACQUISITION`

## Constraints Honored

- Exactly one new file under `.lovable/`.
- Analysis only; no code, tests, doctrine, architecture, or new requirements.
- All claims sourced from named canonical documents and existing repository files.
- No fabricated evidence, corpus, calibration, confidence, or gate outcomes.
