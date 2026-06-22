# Phase 41 — Measurement Engine Recovery Plan (Reality Acquisition Audit)

## Deliverable
Create exactly one new file:
- `.lovable/phase-41-measurement-engine-recovery-plan.md`

No code, implementation, architecture, doctrine, metric, detector, validation methodology, or calibration methodology changes. Reality-only, citation-bound to Phase 40 and observed repo surfaces under `src/lib/biomech/**`, `src/lib/reportCard/**`, `supabase/functions/analyze-video/**`, and `supabase/functions/_shared/**`.

## Reality Already Verified Against the Repo
- `src/lib/biomech/versions.ts` and `supabase/functions/_shared/biomechFingerprint.ts` both pin `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`.
- `package.json` carries zero pose-inference dependencies (no `@mediapipe/*`, no `@tensorflow/*`, no ONNX/WASM pose loader).
- `runTempoPipeline` (`src/lib/biomech/pipeline/tempoPipeline.ts`) is referenced only from `replay/tempoReplay.ts`, `gates/tempoGateMatrix.ts`, and `__tests__/**` — never from any edge function.
- `supabase/functions/analyze-video/index.ts` (2,643 lines) references `LANDMARK_MODEL_VERSION` purely as a record-tag; performs no video decode, no frame sampling, no pose inference.
- No `TempoValidationPair` records exist; `EMPTY_TEMPO_CORPUS` is the only corpus surface (Phase 39 §4).
- No calibration certificate exists; `generateTempoCalibrationCertificate` returns `status: "uncalibrated"` (Phase 39 §7).
- `src/lib/reportCard/metricReaders.ts::readNumber` + `missingState` collapse missing/stub/gate-blocked into indistinguishable athlete-visible states (Phase 40 §10).

## Document Structure (12 sections, matches user spec verbatim)

1. **Executive Summary** — Restate Phase 40 determination (MEASUREMENT PIPELINE NOT WORKING) and Phase 39 determination (NO REAL EVIDENCE ACQUIRED). Frame Phase 41 as a gap inventory, not a design or fix.

2. **Measurement Chain Inventory** — Trace every link with file citations:
   - video acceptance → `src/lib/biomech/videoAcceptance.ts`, `probeVideoMetadata.ts`, `frameExtractionDeterministic.ts`
   - landmarks → `versions.ts` (contract only; no producer)
   - detectors → `detectors/plantDetector.ts`
   - anchors → `anchors/peakLegLift.ts`, `anchors/frontFootStrike.ts`
   - metrics → `metrics/tempoSec.ts`
   - validation → `validation/**` + `gates/tempoGateMatrix.ts`
   - calibration → `calibration/**`
   - evidence → `evidence/tempoEvidence.ts`, `auditTrail.ts`, `fingerprint.ts`
   - report card → `src/lib/reportCard/metricReaders.ts`, `reportCard/**`, tempo tile adapter
   - athlete UI → tile renderers surfaced from report-card spec
   - server pathway → `supabase/functions/analyze-video/index.ts`, `supabase/functions/_shared/recordAnalysisRun.ts`, `biomechFingerprint.ts`

3. **First Broken Link** — Earliest break is the **landmark producer**: D-POSE is contract-defined and stub-pinned but never invoked from any production code path (Phase 40 §6, Phase 41 chain audit). Downstream impact propagates deterministically through detectors → anchors → metrics → validation → calibration → report card → athlete UI, where the UI collapses missing/stub/gate-blocked states into the same surface.

4. **External Acquisition Inventory** — Absent artifacts:
   - real pose-estimation model binding (replacement for `@0.0.0-stub`)
   - labeled athlete validation corpus (`TempoValidationPair` records, `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` unmet)
   - calibration corpus and resulting calibration certificate
   - real-athlete video corpus satisfying `videoAcceptance.ts` thresholds
   - captured evidence packets for the 20+ user-tested videos (sandbox holds zero)
   - per-video ground-truth annotations (anchor frames, tempo labels)

5. **Current State vs Required State** — Per-layer table with four columns (Current / Required / Evidence Present? / Evidence Missing?) for: video acceptance, landmark producer, detectors, anchors, metrics, validation, calibration, evidence packet, report card adapter, athlete UI, server pipeline.

6. **Validation Inventory** — Required artifacts before athlete-facing deployment can be justified: labeled pair corpus ≥ `MIN_LABELED_PAIRS_FOR_VALIDATION`, validation harness execution status `executed` (currently `no_corpus`), per-metric tolerance evidence, replay-equivalence proof under pinned engine_version + reasoning_version, contradiction lineage records, gate-evaluation result with `status: "executed"`.

7. **Calibration Inventory** — Required artifacts: calibration corpus, calibration run execution, signed calibration certificate (`certificate_sha256_hex`), confidence model bound to real measurements (replaces `uncalibrated()` per Phase 26), recalibration cadence record, cache fingerprint binding (`cache_fingerprint_hex`) — all currently absent (Phase 39 §6–§7).

8. **Evidence Packet Specification** — Per single athlete video, a truth-supported record requires: source video bytes + `video_sha256_hex`; probed metadata (`fps_true`, dims, duration); frame-extraction record; non-stub `LANDMARK_MODEL_VERSION`; emitted pose frames; anchor frame indices with missingness lineage; detector outputs; metric outputs from `computeTempoSec`; replay re-execution equivalence; validation pair entry; calibration certificate reference; `cache_fingerprint_hex` and `evidence_sha256_hex`; gate evaluation result; report-card tile state; athlete-facing rendering record.

9. **Operational Readiness Matrix** — Per layer mark NOT STARTED / PARTIAL / COMPLETE with citations:
   - D-POSE producer: NOT STARTED
   - Landmark persistence: NOT STARTED
   - Detectors: PARTIAL (pure code present, input-starved)
   - Anchors: PARTIAL (pure code present, input-starved)
   - Metrics: PARTIAL (`computeTempoSec` present, input-starved)
   - Validation: NOT STARTED (empty corpus)
   - Calibration: NOT STARTED (no certificate)
   - Evidence packet emission: NOT STARTED
   - Report card adapter: PARTIAL (renders missing as zero-equivalent)
   - Athlete UI: PARTIAL (cannot disambiguate states)
   - Server pipeline integration: NOT STARTED (no pipeline call site)

10. **Measurement Engine Readiness Determination** — D-POSE NOT READY; Landmark layer NOT READY; Detector layer CODE-READY / INPUT-STARVED; Metric layer CODE-READY / INPUT-STARVED; Validation layer NOT READY; Calibration layer NOT READY; Report Card NOT READY (cannot surface truth-supported tiles because no truth-supported metric exists).

11. **Release Blocking Inventory** — Ranked by severity:
    1. No real pose model bound (`@0.0.0-stub`) — blocks every downstream link.
    2. No pose-inference invocation site in production — blocks landmark production even if a model existed.
    3. No labeled validation corpus — blocks `runTempoValidationHarness` exit from `no_corpus`.
    4. No calibration certificate — blocks confidence emission above `uncalibrated()`.
    5. No evidence-packet pipeline — blocks per-video truth records.
    6. Report-card UI ambiguity between missing / stub / gate-blocked — blocks athlete-truth surfacing even after upstream is fixed.
    7. No captured evidence for the 20+ user-tested videos — blocks reality post-mortem.

12. **Final Determination** — **CAN ATHLETE-FACING MEASUREMENTS BE TRUSTED TODAY? NO.** Supported by: stub-pinned landmark contract (`versions.ts`, `biomechFingerprint.ts`), absent producer (Phase 40 §6, chain audit above), empty validation corpus (Phase 39 §4), absent calibration certificate (Phase 39 §7), uncalibrated confidence (Phase 26), and report-card adapter collapsing missingness to athlete-visible zero/contradiction (`metricReaders.ts`, Phase 40 §10).

## Constraints Honored
- Exactly one new file; no other files created, modified, or deleted.
- No code, implementation, architecture, doctrine, metric, detector, validation methodology, or calibration methodology changes.
- No proposed solutions; only gap inventory between current repo reality and a truth-supported measurement engine.
- Every claim cites either a Phase 39/40 finding or an observed file path.
