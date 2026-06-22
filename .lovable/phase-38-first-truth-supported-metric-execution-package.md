# Phase 38 — First Truth-Supported Metric Execution Package

Scope: `tempo_sec` only. Reality-only. Citation-bound to Phases 29, 30, 31, 33, 34, 35, 36, 37 and to existing repository surfaces in `src/lib/biomech/**`, `src/lib/reportCard/**`, `supabase/functions/analyze-video/**`, and `supabase/functions/_shared/biomechFingerprint.ts`. No code, no implementation, no architecture changes, no doctrine changes, and no new metrics, detectors, anchors, validation, calibration, confidence, or gate requirements are introduced by this document.

## §1 Scope

This phase converts the Phase 37 determination (`EVIDENCE SOURCES IDENTIFIED`) into a single executable operational package for producing the first Truth-Supported metric (`tempo_sec`). It is operational, not architectural. Every step binds to a surface already present in the repository at the phases listed above. Nothing in this document defines a new contract, threshold, schema, or gate.

## §2 Current State

- Phase 34: partially completed (operational readiness established for the `tempo_sec` slice).
- Phase 35: `READY FOR EVIDENCE EXECUTION` — all in-repo evidence-consumption surfaces re-evaluate deterministically on arrival.
- Phase 36: `READY TO ACQUIRE REAL EVIDENCE` — external acquisition plan operationalized.
- Phase 37: `EVIDENCE SOURCES IDENTIFIED` — real-world EXT-MODEL and EXT-CORPUS candidates audited against existing acceptance contracts.
- Repository surfaces consumed by this package are already present and unchanged: `src/lib/biomech/pipeline/tempoPipeline.ts`, `src/lib/biomech/videoAcceptance.ts`, `src/lib/biomech/metrics/tempoSec.ts`, `src/lib/biomech/validation/tempoCorpusIngestion.ts`, `src/lib/biomech/calibration/tempoCalibration.ts`, `src/lib/biomech/evidence/tempoEvidence.ts`, `supabase/functions/_shared/biomechFingerprint.ts`, and the analyze-video function surface.

## §3 EXT-MODEL Acquisition Package

Operational steps to obtain exactly one of the Phase 37 §2–§3 identified real BlazePose Full runtimes (Google MediaPipe Pose, MediaPipe Tasks Vision, or TF.js `@tensorflow-models/pose-detection`):

1. Select a single Phase 37–audited candidate.
2. Acquire the corresponding non-stub model weights from the vendor distribution channel that pins to `LANDMARK_MODEL_ID = "blazepose_full"` as referenced by the fingerprint surface (`supabase/functions/_shared/biomechFingerprint.ts`) and the engine version binding (`versions.ts`).
3. Stage the runtime at the existing binding sites without modifying the binding contract (Phase 22 F-6: no in-repo fabrication of pose model state).
4. Record the vendor identifier, version string, and weight provenance in the operational acquisition record (external to this repository, per Phase 30 doctrine).

This step performs acquisition only; no in-repo files change as a result.

## §4 EXT-MODEL Acceptance Checklist

Acceptance is satisfied when, against the pre-existing surfaces:

- [ ] Pinned non-stub version is bound at `versions.ts` and reflected in `biomechFingerprint.ts` output.
- [ ] Deterministic output: identical input clip yields byte-identical pose frames across repeated invocations.
- [ ] Fingerprint stability: `cache_fingerprint_hex` and downstream `evidence_sha256_hex` reproduce per Phase 27 lineage.
- [ ] `pose_model_is_stub` missingness reason no longer propagates through `runTempoPipeline` for the EXT-MODEL invocation.

No new acceptance criteria are introduced; this checklist enumerates only the pre-existing contracts.

## §5 Athlete Capture Package

Operational steps to capture clips that pass the existing acceptance gates in `src/lib/biomech/videoAcceptance.ts`:

1. Capture at `fps_true ≥ MIN_FPS` (24).
2. Capture at resolution `≥ MIN_WIDTH × MIN_HEIGHT` (480 × 480).
3. Constrain clip duration to `[MIN_DURATION_SEC, MAX_DURATION_SEC]` = `[0.5, 60]` seconds.
4. Ensure extraction yields a dropped-frame ratio `≤ MAX_DROPPED_FRAME_RATIO` (0.34).
5. Verify each clip passes `evaluateProbe` and `evaluateExtraction` before admission to the corpus pool.

Clips that fail any gate are rejected with the existing canonical `RejectionReason` tag and excluded from the corpus.

## §6 Labeling Package

Operational steps to obtain independent `ground_truth_sec` per Phase 37 §7 audit, using one of the three acceptable sources:

1. High-framerate reference camera measurement of peak-leg-lift to front-foot-strike interval.
2. Manual frame-stepping on the captured clip by a qualified human labeler.
3. Hardware timing capture independent of the EXT-MODEL inference path.

Constraints:

- Ground truth must be independent of EXT-MODEL output (Phase 37 §7: model-derived labels rejected).
- Each label records the source method and operator/device provenance externally to this repository.
- Each label binds to a stable `clip_id` matching the corpus record.

## §7 Corpus Assembly Package

Operational steps to bind ≥30 records into the existing `TempoValidationPair` schema (`src/lib/biomech/validation/tempoCorpusIngestion.ts`):

1. For each accepted clip, run the existing `runTempoPipeline` against the acquired EXT-MODEL to produce `predicted_sec` (carried from `TempoSecResult.value`).
2. Pair each `predicted_sec` with the independently labeled `ground_truth_sec` from §6.
3. Assign a stable `clip_id` per record.
4. Serialize the resulting array in the JSON shape consumed by `parseTempoValidationCorpus`.

No schema change. No fabrication of records. Records lacking either field, or with non-finite numeric fields, are excluded.

## §8 Corpus Acceptance Checklist

Against the pre-existing ingestion contract:

- [ ] `parseTempoValidationCorpus` returns without throwing `TempoCorpusParseError`.
- [ ] Record count `≥ MIN_LABELED_PAIRS_FOR_VALIDATION` (30).
- [ ] `corpus_fingerprint_hex` is deterministic across repeated parses of the same canonical input.
- [ ] Downstream `runTempoValidationHarness` yields `status: "executed"` (no `no_corpus` / `insufficient_corpus` short-circuit).

## §9 Validation Execution Package

Operational invocation only:

1. Pass the parsed corpus into `runTempoValidationHarness` exactly as accepted by the existing harness contract.
2. Observe the returned `TempoValidationReport` with `status: "executed"` and the existing residual envelope fields.
3. Re-invocation on identical canonical inputs reproduces the report byte-identically (Phase 35 §9 determinism).

No new validation logic, no new envelopes, no new fields.

## §10 Calibration Execution Package

Operational invocation only:

1. Pass the executed `TempoValidationReport` into `generateTempoCalibrationCertificate` (`src/lib/biomech/calibration/tempoCalibration.ts`).
2. Observe the transition from the prior `UncalibratedCertificate` (`reason: "no_corpus"`) to a `CalibrationCertificate` with `status: "calibrated"`.
3. The certificate body's SHA256 is deterministic across re-invocation on identical inputs.

No new calibration model. No new thresholds.

## §11 Confidence Execution Package

Operational re-evaluation only:

1. Re-evaluate the existing tempo confidence surface using the issued `CalibrationCertificate`.
2. Confirm deterministic output across re-invocation.
3. Confirm propagation of confidence into the existing evidence artifact and report-card binding without schema change.

No new confidence formula. No new bounds.

## §12 Gate Evaluation Package

Operational re-evaluation only:

1. Re-evaluate the existing tempo gate matrix using the calibration certificate from §10 and the confidence output from §11.
2. Confirm gate transitions are computed exclusively from already-defined gate inputs.
3. Confirm deterministic re-evaluation across identical inputs.

No new gates introduced. No new gate inputs introduced.

## §13 Tempo Promotion Package

Operational transition only:

1. Re-evaluate `tempoEvidenceToTileState` (`src/lib/reportCard/**`) using the evidence artifact produced by `runTempoPipeline` against the acquired EXT-MODEL with calibration and confidence available.
2. Observe transition of the tempo tile from its prior `pending` state into the truth-supported state defined by the existing tile-state contract.
3. The promotion event is the first transition of `tempo_sec` to truth-supported under a calibrated, validated, confidence-bearing evidence artifact (Phase 35 §10 definition; no redefinition here).

## §14 First Truth-Supported Metric Success Event

The fixed ordered operational sequence that constitutes the success event:

1. EXT-MODEL acquired per §3 and accepted per §4.
2. ≥30 athlete clips captured per §5.
3. Independent `ground_truth_sec` labels obtained per §6.
4. `runTempoPipeline` invoked per clip against the EXT-MODEL, yielding `predicted_sec` per §7.
5. Corpus assembled per §7 and serialized per the existing ingestion shape.
6. `parseTempoValidationCorpus` accepts the corpus per §8.
7. `runTempoValidationHarness` returns `status: "executed"` per §9.
8. `generateTempoCalibrationCertificate` returns `status: "calibrated"` per §10.
9. Tempo confidence re-evaluated per §11.
10. Tempo gate matrix re-evaluated per §12.
11. `tempoEvidenceToTileState` transitions the tempo tile to truth-supported per §13.

Completion of step 11 is the first Truth-Supported metric event for the application. Release-1 scaling (additional metrics, additional clips beyond the 30-pair floor, cross-metric promotion choreography) remains out of scope and is governed by future phases.

## §15 Final Determination

All in-repo surfaces required to consume the external evidence package exist, are deterministic on arrival, and require no further implementation. The operational steps in §3–§13 are fully enumerated against those surfaces with no introduction of new contracts. The success event in §14 is the deterministic consequence of executing those steps against real acquired evidence.

**Determination: EXECUTION PACKAGE COMPLETE**
