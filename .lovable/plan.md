# Phase 30 — First Truth-Supported Metric Acquisition Plan

## Deliverable
Create exactly one new file:
- `.lovable/phase-30-first-truth-supported-metric-acquisition-plan.md`

No other files created, modified, or deleted. No code, no architecture, no doctrine, no new metrics/detectors/anchors/validation/calibration/confidence/gate requirements, no fabricated evidence.

## Approach
Read-only synthesis of the Phase 27–29 audits and the four canonical frameworks against the existing repository surfaces, then write a single analysis document identifying the smallest real-world evidence package required to promote `tempo_sec` from Partially Supported → Truth Supported.

### Read-only sources
- `.lovable/phase-27-first-truth-supported-metric-closure.md`
- `.lovable/phase-28-first-truth-supported-metric-promotion-audit.md`
- `.lovable/phase-29-external-evidence-readiness-audit.md`
- `.lovable/canonical-validation-framework.md`
- `.lovable/canonical-calibration-architecture.md`
- `.lovable/canonical-confidence-architecture.md`
- `.lovable/canonical-production-gate-matrix.md`
- `src/lib/biomech/**` (versions, pipeline, calibration, validation harness, replay, gates, reportCard adapter)
- `src/lib/reportCard/**`
- `supabase/functions/analyze-video/**`
- `src/lib/biomech/__tests__/**`

## Document structure
1. **§1 Scope** — Acquisition-planning only for `tempo_sec`; explicit non-goals (no code, doctrine, new requirements, fabricated evidence).
2. **§2 Tempo Metric Promotion Path** — Current Partially Supported state and the 5-step promotion chain from Phase 28 §11 / Phase 29.
3. **§3 EXT-MODEL Acquisition Requirements** — Repository binding points (`src/lib/biomech/versions.ts` D-POSE pin, calibration residual envelope consumption), canonical requirements that any acquired model must satisfy, and the minimum acquisition artifact (model identity + version string + replay-deterministic invocation surface).
4. **§4 EXT-CORPUS Acquisition Requirements** — `TempoValidationPair` schema (`tempoHarness.ts:21-28`), `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` floor, canonical H2/H5 obligations, per-pair labeling requirements, deterministic ordering / fingerprint obligations.
5. **§5 Smallest Valid Athlete Evidence Package** — The minimum real-world package: 1 D-POSE model binding + ≥30 labeled paired-frame clips meeting the existing schema; no additional artifacts required.
6. **§6 Evidence Intake Readiness** — Repository surfaces already capable of ingesting the package (pipeline, versions, harness, analyze-video function), cited line-level.
7. **§7 Validation Consumption Readiness** — How `runTempoValidationHarness` deterministically consumes the corpus once ≥30 pairs supplied (status transition `insufficient_corpus` → `executed`).
8. **§8 Calibration Consumption Readiness** — How `tempoCalibration.ts` consumes residuals to emit the cal §4 D-POSE certificate deterministically.
9. **§9 Confidence Consumption Readiness** — Calibrated-confidence binding path already wired per Phase 29 §6.
10. **§10 Production Gate Consumption Readiness** — Mapping of the 3 currently-blocked gates (validation, calibration, confidence calibration) to automatic `pass` transitions once §§7–9 derivations execute.
11. **§11 First Truth-Supported Metric Promotion Sequence** — Deterministic ordered sequence: (1) bind EXT-MODEL, (2) ingest EXT-CORPUS, (3) harness execution, (4) calibration certificate emission, (5) confidence binding, (6) gate revaluation, (7) tile state transition.
12. **§12 Earliest Achievable Promotion Event** — Single promotion event reachable immediately upon delivery of the §5 package; no intermediate phases required.
13. **§13 Final Determination** — One of `ACQUISITION READY` | `ACQUISITION PARTIALLY READY` | `ACQUISITION NOT READY`, supported exclusively by repository evidence and existing canonical requirements (expected: `ACQUISITION READY`, since Phase 29 already certified READY FOR EVIDENCE ACQUISITION and no new repository surface is required to consume the §5 package).

## Constraints reaffirmed
Exactly one new file. No code. No implementation. No architecture changes. No doctrine changes. No new metrics, detectors, anchors, validation/calibration/confidence/gate requirements. No fabricated evidence, corpus, calibration, confidence, or gate outcomes.
