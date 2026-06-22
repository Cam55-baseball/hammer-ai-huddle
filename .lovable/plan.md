# Phase 38 — First Truth-Supported Metric Execution Package

## Deliverable
Create exactly one new file:
- `.lovable/phase-38-first-truth-supported-metric-execution-package.md`

No other files created, modified, or deleted. No code, implementation, architecture, doctrine, metric, detector, anchor, validation, calibration, confidence, or gate changes.

## Sources (read-only)
- Phases 29, 30, 31, 33, 34, 35, 36, 37
- `src/lib/biomech/**` (notably `pipeline/tempoPipeline.ts`, `videoAcceptance.ts`, `metrics/tempoSec.ts`, `validation/tempoCorpusIngestion.ts`, `calibration/tempoCalibration.ts`, `evidence/tempoEvidence.ts`)
- `src/lib/reportCard/**`
- `supabase/functions/analyze-video/**`
- `supabase/functions/_shared/biomechFingerprint.ts`

## Document Structure (15 sections)
1. **Scope** — `tempo_sec` only; converts Phase 37 sourcing determination into an executable operational package. Reality-only, citation-bound. No new requirements.
2. **Current State** — Phase 34 partially completed; Phase 35 READY FOR EVIDENCE EXECUTION; Phase 36 READY TO ACQUIRE REAL EVIDENCE; Phase 37 EVIDENCE SOURCES IDENTIFIED.
3. **EXT-MODEL Acquisition Package** — operational steps to obtain one Phase 37–identified real BlazePose Full runtime; binding sites in `versions.ts` and `biomechFingerprint.ts`; no in-repo fabrication (Phase 22 F-6).
4. **EXT-MODEL Acceptance Checklist** — pinned non-stub version; deterministic output; fingerprint stability; `pose_model_is_stub` cleared.
5. **Athlete Capture Package** — operational steps to capture clips passing `videoAcceptance.ts` constants (MIN_FPS 24, MIN_WIDTH/HEIGHT 480, duration 0.5–60s, dropped ≤ 0.34).
6. **Labeling Package** — operational steps to obtain independent `ground_truth_sec` per Phase 37 §7 (high-FPS reference, manual frame-stepping, or hardware timing); never model-derived.
7. **Corpus Assembly Package** — operational steps to bind ≥30 records to the `TempoValidationPair` schema with stable `clip_id`, `predicted_sec` (from real EXT-MODEL via `runTempoPipeline`), and `ground_truth_sec`.
8. **Corpus Acceptance Checklist** — parses without `TempoCorpusParseError`; ≥30 pairs (`MIN_LABELED_PAIRS_FOR_VALIDATION`); deterministic `corpus_fingerprint_hex`; yields `status: "executed"`.
9. **Validation Execution Package** — operational invocation of `runTempoValidationHarness` on the assembled corpus; deterministic re-evaluation on arrival.
10. **Calibration Execution Package** — operational invocation of `generateTempoCalibrationCertificate` on the validation report; transitions from `uncalibrated/no_corpus` to `calibrated`.
11. **Confidence Execution Package** — operational re-evaluation of tempo confidence using the calibration certificate; deterministic.
12. **Gate Evaluation Package** — operational re-evaluation of the gate matrix using the calibration certificate and confidence outputs.
13. **Tempo Promotion Package** — operational transition through `tempoEvidenceToTileState` from `pending` to truth-supported; promotion event definition per Phase 35 §10.
14. **First Truth-Supported Metric Success Event** — fixed ordered sequence (EXT-MODEL acquired → clips captured → ground truth labeled → `runTempoPipeline` yields `predicted_sec` → corpus assembled → ingestion accepts → validation executed → calibration certificate issued → confidence re-evaluated → gate matrix re-evaluated → tile transitions to truth-supported).
15. **Final Determination** — `EXECUTION PACKAGE COMPLETE`.

## Notes
- Operational package only; all in-repo surfaces already exist and re-evaluate deterministically on arrival per Phases 33–37.
- Release-1 scaling remains out of scope (governed by future phases).
- Remaining work is purely external acquisition + execution; classified non-implementation-blocking by Phases 29, 31 §9–§11, 33 §10.
