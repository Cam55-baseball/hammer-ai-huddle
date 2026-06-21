## Phase 34 — `tempo_sec` Implementation Execution

Scope is the Phase 31 §13 / Phase 33 §13 authorized `tempo_sec` path only. No new metrics, doctrine, architecture, detectors, or anchors. No fabricated evidence (no synthetic pose model, no synthetic corpus).

### Reality constraint
Phase 29 / Phase 31 §9 / Phase 33 §10 classified the two remaining inputs as **acquisition-class external inputs**:
- **EXT-MODEL** — a real D-POSE (BlazePose Full) runtime binding. Not present in the repository; cannot be invented.
- **EXT-CORPUS** — ≥30 labeled `TempoValidationPair` records. No corpus file exists.

Per `mem://` doctrine and Phase 22 F-6, fabricating either is forbidden. This phase therefore implements the **in-repo surfaces** that consume those inputs the moment they land, and honestly reports the resulting gate state.

### Files to add (2)
1. `src/lib/biomech/validation/tempoCorpusIngestion.ts` — a small, pure module that accepts a raw JSON value, validates it against the existing `TempoValidationPair` schema (clip_id: string, predicted_sec: number|null, ground_truth_sec: number), rejects unknown/malformed records, and returns a typed `readonly TempoValidationPair[]`. No new schema, no new doctrine. Adds an `EMPTY_TEMPO_CORPUS: readonly TempoValidationPair[] = []` export so callers can wire the harness deterministically when no corpus is present.
2. `src/lib/biomech/__tests__/tempoExecution.test.ts` — Vitest suite that:
   - Calls `parseTempoValidationCorpus` against a malformed value (rejects), an empty array (returns `[]`), and a small valid array (returns typed records).
   - Calls `runTempoValidationHarness(EMPTY_TEMPO_CORPUS)` and asserts `status === "no_corpus"`.
   - Calls `generateTempoCalibrationCertificate` on that report and asserts `status === "uncalibrated"`, `reason === "no_corpus"`.
   - Builds a minimal `TempoPipelineInputs` with `pose_frames: []` (the existing D-POSE stub path — anchors emit canonical missingness), runs `evaluateTempoGateMatrix`, asserts `all_pass === false`, asserts `blocking_gates` contains `validation`, `calibration`, `confidence_calibration`.
   - Runs `tempoEvidenceToTileState` on the resulting evidence + matrix, asserts `status === "missing"` with a canonical `missing_reason`.

### Files NOT modified
- `src/lib/biomech/versions.ts` — D-POSE binding line stays `blazepose_full@0.0.0-stub`. Replacing it with a fabricated non-stub version would fabricate evidence. The string flips only when a real EXT-MODEL artifact lands; that is acquisition, not implementation.
- All pipeline / harness / calibration / gate / tile-adapter / reportCard / hooks files — already wired per Phase 27; they re-evaluate automatically when EXT-MODEL and EXT-CORPUS arrive.

### Audit document
Create exactly one new file: `.lovable/phase-34-tempo-sec-implementation-execution.md` with sections:
1. Scope
2. Files modified (2 added, 0 changed)
3. Implementation completed (corpus ingestion surface + test harness)
4. Tests executed (vitest results)
5. Validation results (`status: "no_corpus"`)
6. Calibration results (`uncalibrated / no_corpus`)
7. Confidence results (omitted — gate blocked)
8. Gate results (6-gate matrix; 3 blocking, `all_pass: false`)
9. Final tile state (`status: "missing"`, canonical `missing_reason`)
10. Remaining acquisition-class inputs (EXT-MODEL, EXT-CORPUS) — explicitly not implementation blockers per Phase 29 / 31 / 33
11. Final Determination: **IMPLEMENTATION PARTIALLY COMPLETED** — all in-repo implementation steps the authorization permits are executed; the two remaining items are acquisition-class external inputs governed by Phase 30, not implementation work.

### Verification
Run vitest on the new test file and capture the actual pass/fail output for §4 of the audit doc. Do not claim results that were not observed.