# Phase 36 — External Evidence Acquisition Execution Plan

## Deliverable

Create exactly one new file:

- `.lovable/phase-36-external-evidence-acquisition-execution-plan.md`

No other files created, modified, or deleted. No code, implementation, architecture, doctrine, metrics, detectors, anchors, validation, calibration, confidence, or gate definitions introduced. Reality-only, citation-bound to Phases 29, 30, 31, 33, 34, 35 and the existing repo surfaces under `src/lib/biomech/**`, `src/lib/reportCard/**`, and `supabase/functions/analyze-video/**`.

## Document Outline

The document contains exactly the 15 required sections:

- **§1 Scope** — Restricted to `tempo_sec`. Operational acquisition plan only. No expansion to other metrics. Cites Phase 34 partial-completion result and Phase 35 READY FOR EVIDENCE EXECUTION determination.
- **§2 EXT-MODEL Acquisition Inventory** — Identifies the single binding site `src/lib/biomech/versions.ts:25` (`blazepose_full@0.0.0-stub`) and its edge-function mirror `supabase/functions/_shared/biomechFingerprint.ts` (`LANDMARK_MODEL_VERSION`). Enumerates what must be acquired externally: real BlazePose Full runtime artifact, pinned version identifier, and accompanying provenance metadata. No in-repo fabrication path exists (Phase 22 F-6, Phase 30).
- **§3 EXT-MODEL Acceptance Requirements** — Citation-bound conditions for accepting an EXT-MODEL artifact: pinned non-stub version string replacing `@0.0.0-stub`, deterministic landmark output under `src/lib/biomech/pipeline/tempoPipeline.ts` consumers, fingerprint stability across `buildCacheFingerprint`. No new acceptance criteria introduced.
- **§4 EXT-CORPUS Acquisition Inventory** — Names the schema (`TempoValidationPair` at `src/lib/biomech/validation/tempoHarness.ts:18–25`), ingestion path (`parseTempoValidationCorpus` in `tempoCorpusIngestion.ts`), and floor (`MIN_LABELED_PAIRS_FOR_VALIDATION` = 30 pairs).
- **§5 Athlete Recording Requirements** — Cites existing `src/lib/biomech/videoAcceptance.ts` constants (MIN_FPS, MIN_WIDTH, MIN_HEIGHT, MIN_DURATION_SEC, MAX_DURATION_SEC, MAX_DROPPED_FRAME_RATIO) as the only physical-clip acceptance surface. Recording acquisition must satisfy `evaluateProbe` and `evaluateExtraction` verdicts. No new recording requirement introduced.
- **§6 Labeling Requirements** — Per-pair fields: stable non-empty `clip_id`, finite externally measured `ground_truth_sec`, `predicted_sec` derived from real EXT-MODEL run through `runTempoPipeline` (or `null` only when pipeline legitimately yields null). Labelers external to the system; no in-repo labeling generator exists.
- **§7 Corpus Acceptance Requirements** — Re-states harness contract: `parseTempoValidationCorpus` must accept without throwing `TempoCorpusParseError`; `runTempoValidationHarness` must transition out of `no_corpus` and clear the `MIN_LABELED_PAIRS_FOR_VALIDATION` floor. No new corpus criteria.
- **§8 Fingerprint Requirements** — Cites `buildCacheFingerprint` inputs (videoSha256Hex, fpsTrue, landingTimeSec, directionSign, calibrationHpx, pinned versions) and the harness `corpus_fingerprint_hex` derivation in `tempoHarness.ts`. Both must be deterministic and stable across replay.
- **§9 Validation Execution Readiness** — Confirms the wired path (`runTempoValidationHarness`) deterministically re-evaluates on corpus arrival. No new validation surface required.
- **§10 Calibration Execution Readiness** — Confirms `generateTempoCalibrationCertificate` deterministically transitions out of `uncalibrated`/`no_corpus` on harness report arrival.
- **§11 Confidence Execution Readiness** — Confirms `evaluateTempoGateMatrix` `confidence_calibration` gate re-evaluates on certificate arrival. No new confidence surface.
- **§12 Promotion Execution Readiness** — Confirms `tempoEvidenceToTileState` transitions from `missing` to `pass`/`fail` deterministically once the six-gate matrix yields `all_pass`. No new promotion surface.
- **§13 Earliest Truth-Supported Metric Event** — Ordered enumeration: (1) EXT-MODEL acquired and binding replaced, (2) athlete clips recorded meeting `videoAcceptance`, (3) clips run through `runTempoPipeline` under real EXT-MODEL, (4) ≥30 externally labeled pairs assembled, (5) `parseTempoValidationCorpus` accepts the file, (6) harness → certificate → gate matrix → tile adapter re-evaluate deterministically, (7) `tempo_sec` tile emits first truth-supported state. Steps 6–7 require no further repo work.
- **§14 Release-1 Scaling Implications** — Notes that the same external-acquisition pattern (EXT-MODEL once, per-metric EXT-CORPUS) generalizes to subsequent metrics under their own future phases, but is explicitly out of scope for Phase 36. No commitments made.
- **§15 Final Determination** — `READY TO ACQUIRE REAL EVIDENCE`. All in-repo surfaces required to consume EXT-MODEL and EXT-CORPUS exist and re-evaluate deterministically; the remaining work is purely external acquisition governed by Phase 30, classified non-blocking by Phases 29, 31 §9–§11, and 33 §10.

## Constraints Honored

- Exactly one file created.
- No code, no implementation, no architecture / doctrine / metric / detector / anchor / validation / calibration / confidence / gate definitions.
- Reality-only and citation-bound to the listed read-only sources and existing repo surfaces.
- `.lovable/plan.md` will be updated to reflect Phase 36 entry per the established convention from Phases 33–35 (this is the only auxiliary edit; if the user wants Phase 36 to be strictly one-file with zero plan-log update, they can say so and I will drop the plan.md edit).
