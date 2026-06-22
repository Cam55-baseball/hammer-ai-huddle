# Phase 35 — First Truth-Supported Metric Evidence Execution

## Deliverable
Create exactly one file:
- `.lovable/phase-35-first-truth-supported-metric-evidence-execution.md`

No other files created, modified, or deleted. No code, architecture, doctrine, audits, or requirements introduced. Execution-path documentation only, citation-bound to Phases 29–34 and existing repo surfaces under `src/lib/biomech/**`.

## Pre-write read-only sweep
Read once, cite by file:line in the doc — no edits:
- `.lovable/phase-29-*`, `phase-30-*`, `phase-31-*`, `phase-33-*`, `phase-34-*`
- `src/lib/biomech/versions.ts` (D-POSE stub binding)
- `src/lib/biomech/pipeline/tempoPipeline.ts`
- `src/lib/biomech/validation/tempoHarness.ts` + `validation/tempoCorpusIngestion.ts`
- `src/lib/biomech/calibration/tempoCalibration.ts`
- `src/lib/biomech/gates/tempoGateMatrix.ts`
- `src/lib/biomech/reportCard/tempoTileAdapter.ts`
- `src/lib/biomech/evidence/tempoEvidence.ts`
- `supabase/functions/analyze-video/**` (intake surface) and `supabase/functions/_shared/biomechFingerprint.ts`

## Document structure (exact sections requested)

§1 **Current State** — cite Phase 34 result: in-repo wiring complete; `EMPTY_TEMPO_CORPUS` yields `no_corpus` / `uncalibrated` / gate `all_pass=false` / tile `missing`. Two acquisition-class inputs outstanding: EXT-MODEL, EXT-CORPUS.

§2 **EXT-MODEL Acquisition Surface** — exact binding site `versions.ts:25` (`blazepose_full@0.0.0-stub`). Required: real BlazePose Full runtime + version pin replacing stub. Consumer: pipeline pose_frames input in `tempoPipeline.ts`. No fabrication permitted (Phase 22 F-6).

§3 **EXT-CORPUS Acquisition Surface** — schema `TempoValidationPair` at `tempoHarness.ts:18–25`; ingestion path `tempoCorpusIngestion.ts` (`parseTempoValidationCorpus`); floor `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` (`tempoHarness.ts`).

§4 **Corpus Labeling Requirements** — per pair: stable `clip_id`, `ground_truth_sec` from external labeling, `predicted_sec` from real-binding pipeline run. ≥30 pairs. Deterministic ordering + canonical fingerprint via `corpus_fingerprint_hex`.

§5 **Evidence Intake Path** — clip → analyze-video edge function → pose extraction (post-EXT-MODEL) → `runTempoPipeline` → `TempoEvidenceArtifact` (with `evidence_sha256_hex`, `cache_fingerprint_hex`).

§6 **Validation Execution Path** — labeled corpus JSON → `parseTempoValidationCorpus` → `runTempoValidationHarness` → status transitions `no_corpus` → `insufficient_corpus` → `executed` at n≥30.

§7 **Calibration Execution Path** — `executed` harness report → `generateTempoCalibrationCertificate` → status transitions `uncalibrated/no_corpus` → calibrated certificate.

§8 **Confidence Execution Path** — calibration certificate flows into tile-state contract through gate matrix `confidence_calibration` gate (per Phase 33 §8 citation).

§9 **Production Gate Execution Path** — `evaluateTempoGateMatrix` six-gate re-evaluation; blocking gates `validation`, `calibration`, `confidence_calibration` clear deterministically once §6–§8 complete; `all_pass=true` triggers tile promotion via `tempoEvidenceToTileState`.

§10 **Tempo Promotion Event Definition** — defined as: first deterministic transition of `tempoEvidenceToTileState` from `status: "missing"` to `status: "pass" | "fail"` under `all_pass=true` gate matrix, bound to (EXT-MODEL version pin, EXT-CORPUS fingerprint). Cited from existing tile adapter contract — no new event.

§11 **Truth-Supported Metric Success Criteria** — (a) `versions.ts` D-POSE bound to real runtime, (b) ≥30-pair corpus ingested with stable fingerprint, (c) harness `executed`, (d) calibration certificate issued, (e) confidence gate cleared, (f) six-gate matrix `all_pass=true`, (g) tile state non-`missing`.

§12 **Earliest Possible Promotion Sequence** — ordered, citation-bound: acquire EXT-MODEL → replace stub at `versions.ts:25` → run pipeline over labeled clip set → acquire EXT-CORPUS JSON → ingest via `parseTempoValidationCorpus` → harness → calibration → gate matrix → tile promotion. All in-repo wiring already exists (Phase 34); only two external acquisitions gate the sequence.

§13 **Final Determination** — `READY FOR EVIDENCE EXECUTION`, supported by Phase 33 go/no-go and Phase 34 closure: every in-repo surface required to consume EXT-MODEL + EXT-CORPUS exists and re-evaluates deterministically on arrival.

## Constraints honored
Exactly one new file; no code; no architecture/doctrine/requirements/audit changes; citation-only; reality-only.
