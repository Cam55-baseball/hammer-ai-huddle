## Phase 31 — First Truth-Supported Metric Implementation Readiness

### Deliverable
Create exactly one new file:
- `.lovable/phase-31-first-truth-supported-metric-implementation-readiness.md`

No other files created, modified, or deleted. No code, architecture, doctrine, metric, detector, anchor, validation, calibration, confidence, or gate changes.

### Method
Read-only synthesis of:
- Phase 27–30 audit docs in `.lovable/`
- `.lovable/report-card-implementation-authority-package.md`, `canonical-execution-authorization.md`, `canonical-production-readiness-audit.md`, `canonical-implementation-execution-audit.md`
- Repository surfaces already cited in Phases 27–30: `src/lib/biomech/{versions.ts, pipeline/tempoPipeline.ts, calibration/tempoCalibration.ts, validation/tempoHarness.ts, gates/tempoGate.ts, replay/tempoReplay.ts, reportCard/tempoTileAdapter.ts, __tests__/**}`, `src/lib/reportCard/**`, `supabase/functions/analyze-video/**`.

All claims line-cited; no new requirements or fabricated evidence introduced.

### Document Structure (13 sections, as specified)
1. **§1 Scope** — `tempo_sec` Partially Supported → Truth Supported; readiness-only.
2. **§2 Planning Completion Audit** — confirms Phases 27 (closure), 28 (promotion), 29 (evidence readiness), 30 (acquisition plan) all sealed with cited determinations.
3. **§3 Authority Completion Audit** — cites authority package + execution authorization + production-readiness + implementation-execution audits as the operative authority envelope.
4. **§4 Repository Readiness Audit** — D-3/D-4/D-5/D-6/D-7/D-8 surfaces (anchors, plant detector, `computeTempoSec`, evidence artifact, `tempoHarness`, `tempoCalibration`, gate matrix, replay, tile adapter) present at line-level citations; no missing repository surface.
5. **§5 Validation Readiness Audit** — `runTempoValidationHarness` deterministic, `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` enforced; consumes EXT-CORPUS only.
6. **§6 Calibration Readiness Audit** — `generateTempoCalibrationCertificate` refuses fabrication; emits `calibrated` iff harness `executed` + residual envelope present.
7. **§7 Confidence Readiness Audit** — calibrated-confidence binding path through metric → evidence → tile is wired but currently blocked by `pose_model_is_stub` + uncalibrated certificate.
8. **§8 Production Gate Readiness Audit** — six-gate matrix in `tempoGateMatrix`; tile adapter blocks promotion until `all_pass`; gates reevaluate automatically once EXT-MODEL + EXT-CORPUS supplied.
9. **§9 External Dependency Audit** — EXT-MODEL (`blazepose_full@0.0.0-stub` at `versions.ts:25`) and EXT-CORPUS (≥30 `TempoValidationPair`) remain the sole external blockers (per Phase 28 §11, Phase 29, Phase 30).
10. **§10 Remaining Non-Implementation Blockers** — none internal to repository; only EXT-MODEL + EXT-CORPUS acquisition.
11. **§11 Earliest Implementation Start Condition** — implementation work itself (binding the non-stub D-POSE version string and ingesting the labeled corpus into the harness inputs) is authorized to begin; no further planning, audit, or doctrinal artifact required.
12. **§12 Earliest Truth-Supported Metric Path** — 7-step deterministic sequence from Phase 30 §11 (EXT-MODEL bind → EXT-CORPUS ingest → harness `executed` → certificate `calibrated` → confidence calibrated → gate matrix `all_pass` → tile Truth Supported).
13. **§13 Final Determination** — `IMPLEMENTATION AUTHORIZED` for the `tempo_sec` path, scoped to (a) replacing the D-POSE stub version binding and (b) wiring the labeled-corpus ingestion into `runTempoValidationHarness` consumers. All other 29 metrics remain out of scope.

### Expected Determination
**IMPLEMENTATION AUTHORIZED** — Phase 29 certified READY FOR EVIDENCE ACQUISITION, Phase 30 certified ACQUISITION READY, all downstream consumption surfaces exist at cited lines, and no further planning/authority/audit artifact is identified as a prerequisite in the source inputs.

### Constraints Reiterated
Exactly one new file. No code. No implementation. No architecture/doctrine/requirements changes. No fabricated evidence. All citations point to existing repository lines or sealed `.lovable/` documents.
