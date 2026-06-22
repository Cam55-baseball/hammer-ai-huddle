# Phase 37 — Real Evidence Acquisition Sourcing Audit

## Deliverable
Create exactly one file: `.lovable/phase-37-real-evidence-acquisition-sourcing-audit.md`. No other files created, modified, or deleted. No code, implementation, architecture, doctrine, metrics, detectors, anchors, validation, calibration, confidence, or gate changes.

## Purpose
Identify the exact real-world sources from which EXT-MODEL and EXT-CORPUS can be acquired for the `tempo_sec` promotion path defined in Phases 29–36, against existing repo surfaces only.

## Document Sections (15)
1. **Scope** — `tempo_sec` only; sourcing audit only; reality-only; citation-bound to Phases 29–36 and `src/lib/biomech/**`, `src/lib/reportCard/**`, `supabase/functions/analyze-video/**`.
2. **EXT-MODEL Source Inventory** — enumerate real-world acquisition candidates compatible with the BlazePose Full pinning at `src/lib/biomech/versions.ts:25` and edge mirror `supabase/functions/_shared/biomechFingerprint.ts` (MediaPipe Pose / BlazePose Full upstream Google distribution, TF.js pose-detection package, MediaPipe Tasks Vision). No fabrication.
3. **EXT-MODEL Compatibility Audit** — map each candidate against `LANDMARK_MODEL_ID = "blazepose_full"` contract, deterministic landmark output requirement, replay-equivalence requirement, and Phase 22 F-6 non-fabrication rule.
4. **EXT-MODEL Acceptance Mapping** — map sources to the acceptance requirements declared in Phase 36 §3 (pinned non-stub version string, deterministic landmark output, fingerprint stability across replay via `buildCacheFingerprint`).
5. **EXT-CORPUS Source Inventory** — enumerate real-world labeled tempo source candidates (instrumented athlete capture, externally-timed clips, third-party labeled motion datasets) compatible with `TempoValidationPair` schema at `src/lib/biomech/validation/tempoHarness.ts:18–25`.
6. **Athlete Capture Source Audit** — map candidate capture surfaces against `src/lib/biomech/videoAcceptance.ts` constants (MIN_FPS 24, MIN_WIDTH/HEIGHT 480, duration 0.5–60s, dropped-frame ratio ≤ 0.34) and existing `supabase/functions/analyze-video/**` intake path.
7. **Labeling Source Audit** — identify acceptable real-world ground-truth measurement sources (high-fps reference capture, manual frame-stepping by qualified human labeler, externally instrumented timing) producing `ground_truth_sec` independent of EXT-MODEL output; reject any self-labeled or model-derived ground truth.
8. **Corpus Compatibility Audit** — map candidate corpora against `parseTempoValidationCorpus` contract in `src/lib/biomech/validation/tempoCorpusIngestion.ts` (stable `clip_id`, finite `predicted_sec`, finite `ground_truth_sec`, ≥ `MIN_LABELED_PAIRS_FOR_VALIDATION` = 30).
9. **Corpus Acceptance Mapping** — map sources to Phase 36 §7 acceptance (parses without `TempoCorpusParseError`, yields `status: "executed"`, deterministic `corpus_fingerprint_hex`).
10. **Earliest Evidence Package** — minimum real-world bundle: 1 acquired EXT-MODEL runtime + ≥30 athlete clips passing `videoAcceptance` + externally measured `ground_truth_sec` per clip + `predicted_sec` produced by EXT-MODEL through `runTempoPipeline`.
11. **Earliest Validation Event** — first deterministic `runTempoValidationHarness` invocation yielding `status: "executed"` on the acquired corpus.
12. **Earliest Calibration Event** — first calibration certificate emitted from that validation report.
13. **Earliest Promotion Event** — first transition of `tempo_sec` six-gate matrix from `missing` to `pass`/`fail` under `all_pass: true` via `evaluateTempoGateMatrix` / `tempoEvidenceToTileState`.
14. **Release-1 Impact** — sourcing pattern generalizes to future metrics but remains out of Phase 37 scope; no new requirements introduced.
15. **Final Determination** — `EVIDENCE SOURCES IDENTIFIED`.

## Constraints
Exactly one new file. No edits to any other file (including `.lovable/plan.md`). No code. No new requirements. All claims citation-bound to Phases 29–36 and the listed repo surfaces.
