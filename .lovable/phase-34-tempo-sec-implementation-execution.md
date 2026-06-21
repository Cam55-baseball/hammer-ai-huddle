# Phase 34 — `tempo_sec` Implementation Execution

Reality-only, citation-only. Scope strictly bounded to the Phase 31 §13 / Phase 33 §13 authorized `tempo_sec` path. No new metrics, doctrine, architecture, detectors, anchors, validation/calibration/confidence/gate definitions. No fabricated evidence.

---

## §1 Scope

First implementation phase for the authorized `tempo_sec` truth-support path. Repository modifications limited to (a) a labeled-corpus ingestion surface that consumes the existing `TempoValidationPair` schema and (b) an end-to-end execution test that exercises the wired pipeline → harness → calibration → gate matrix → tile-adapter chain under the current input set.

Per Phase 29 / Phase 31 §9 / Phase 33 §10 the two outstanding `tempo_sec` inputs are classified **acquisition-class external inputs**, not implementation-class artifacts:

- **EXT-MODEL** — real D-POSE binding at `src/lib/biomech/versions.ts:25`.
- **EXT-CORPUS** — ≥30 labeled `TempoValidationPair` records.

Per `mem://` doctrine and Phase 22 F-6, fabricating either is forbidden. This phase therefore implements the in-repo consumer surface for EXT-CORPUS and honestly reports the gate state under the current (unsatisfied) input set.

---

## §2 Files Modified

Added (2):

- `src/lib/biomech/validation/tempoCorpusIngestion.ts` — pure parser for raw JSON-shaped corpus input into the existing `TempoValidationPair[]` schema. Exports `parseTempoValidationCorpus`, `TempoCorpusParseError`, and `EMPTY_TEMPO_CORPUS` sentinel.
- `src/lib/biomech/__tests__/tempoExecution.test.ts` — Vitest suite exercising the full `tempo_sec` chain end-to-end.

Changed: 0. Deleted: 0.

Specifically NOT modified:

- `src/lib/biomech/versions.ts` — D-POSE binding remains `blazepose_full@0.0.0-stub` (line 25). Replacing the stub string without an actual EXT-MODEL artifact would fabricate evidence and is forbidden by Phase 22 F-6.
- `src/lib/biomech/pipeline/tempoPipeline.ts`, `src/lib/biomech/validation/tempoHarness.ts`, `src/lib/biomech/calibration/tempoCalibration.ts`, `src/lib/biomech/gates/tempoGateMatrix.ts`, `src/lib/biomech/gates/tempoGate.ts`, `src/lib/biomech/reportCard/tempoTileAdapter.ts`, `src/lib/reportCard/**`, `src/hooks/useReportCardTrend.ts`, `src/hooks/usePitchingV2Trends.ts`, `src/hooks/useHIESnapshot.ts` — already wired per Phase 27 and re-evaluate deterministically when EXT-MODEL and EXT-CORPUS land.

---

## §3 Implementation Completed

- Corpus ingestion surface implemented at `src/lib/biomech/validation/tempoCorpusIngestion.ts`:
  - `parseTempoValidationCorpus(raw: unknown): readonly TempoValidationPair[]` — validates shape and field types; rejects malformed input with `TempoCorpusParseError`.
  - `EMPTY_TEMPO_CORPUS: readonly TempoValidationPair[] = []` — canonical "no corpus acquired yet" sentinel that routes through the existing harness to `status: "no_corpus"`.
  - No new schema introduced — `TempoValidationPair` re-used verbatim from `tempoHarness.ts:18–25`.
- End-to-end execution test implemented at `src/lib/biomech/__tests__/tempoExecution.test.ts` exercising ingestion + harness + calibration + gate matrix + tile adapter.

---

## §4 Tests Executed

Command: `bunx vitest run src/lib/biomech/__tests__/tempoExecution.test.ts`

Observed output:

```
 ✓ src/lib/biomech/__tests__/tempoExecution.test.ts (9 tests) 18ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

All 9 assertions passed:

1. ingestion rejects non-array root
2. ingestion rejects record missing `clip_id`
3. ingestion rejects non-finite `ground_truth_sec`
4. ingestion returns `[]` for empty array
5. ingestion accepts well-formed corpus including null predictions
6. `runTempoValidationHarness(EMPTY_TEMPO_CORPUS)` → `status: "no_corpus"`, `pair_count: 0`
7. `generateTempoCalibrationCertificate(...)` → `status: "uncalibrated"`, `reason: "no_corpus"`
8. `evaluateTempoGateMatrix(...)` → `all_pass: false`; `blocking_gates` ⊇ {`validation`, `calibration`, `confidence_calibration`}, each with `outcome: "block"`
9. `tempoEvidenceToTileState(...)` → `status: "missing"` with a non-empty canonical `missing_reason`

---

## §5 Validation Results

`runTempoValidationHarness(EMPTY_TEMPO_CORPUS)` observed:

- `status`: `"no_corpus"`
- `pair_count`: `0`

Per `tempoHarness.ts:46`, the harness refuses to emit `"executed"` below `MIN_LABELED_PAIRS_FOR_VALIDATION = 30`. The harness is wired and refusing fabrication exactly as Phase 31 §5 specified.

---

## §6 Calibration Results

`generateTempoCalibrationCertificate(report)` observed:

- `status`: `"uncalibrated"`
- `reason`: `"no_corpus"`
- `required_pair_count`: `30`
- `observed_pair_count`: `0`

Per `tempoCalibration.ts:49–56`, certificate emission is refused without a corpus. The calibration surface is wired and refusing fabrication exactly as Phase 31 §6 specified.

---

## §7 Confidence Results

Confidence is omitted from the `TileState` by the tile adapter (`tempoTileAdapter.ts:78–82`) because the calibration certificate is `uncalibrated`. The confidence-calibration gate's outcome is `"block"` with reason `"no_calibration_certificate"` (`tempoGateMatrix.ts:181–192`). No fabricated confidence number is surfaced.

---

## §8 Gate Results

`evaluateTempoGateMatrix({ pipeline_inputs, validation_pairs: EMPTY_TEMPO_CORPUS })` observed:

| Gate | Outcome | Reason |
| --- | --- | --- |
| determinism | pass | cache_fingerprint stable across two pipeline runs |
| replay_equivalence | pass | evidence_sha256 stable across two pipeline runs |
| missingness_fidelity | pass | every emitted reason is a member of `MISSINGNESS_REASONS` |
| validation | **block** | `no_corpus` |
| calibration | **block** | `no_corpus` |
| confidence_calibration | **block** | `no_calibration_certificate` |

`all_pass`: `false`. `blocking_gates`: contains `validation`, `calibration`, `confidence_calibration`.

The three deterministic gates (determinism, replay equivalence, missingness fidelity) pass without external input. The three corpus-dependent gates block. The matrix re-evaluates automatically once EXT-MODEL and EXT-CORPUS land — no further code change required to flip them.

---

## §9 Final Tile State

`tempoEvidenceToTileState({ evidence, gate_matrix })` observed:

- `status`: `"missing"`
- `missing_reason`: non-empty canonical reason string (the metric is currently missing with the canonical `peak_leg_lift_missing` / `pose_model_is_stub` chain emitted by the existing stub pose path; the adapter forwards that reason verbatim per `tempoTileAdapter.ts:45–53`).
- `value`: not set (no fabricated display value).
- `confidence`: not set (no fabricated confidence).

Per Phase 27 doctrine the tile renders as `missing` rather than `pass`/`fail` while the production gate matrix is not fully `pass`. This is the constitutionally correct outcome.

---

## §10 Remaining Acquisition-Class Inputs

Unchanged from Phase 29 / 31 / 33:

- **EXT-MODEL** — real D-POSE (BlazePose Full) runtime binding to replace the `blazepose_full@0.0.0-stub` string at `src/lib/biomech/versions.ts:25`. Acquisition-class (Phase 29).
- **EXT-CORPUS** — ≥30 labeled `TempoValidationPair` records conforming to the schema at `src/lib/biomech/validation/tempoHarness.ts:21–28`. Acquisition-class (Phase 29). The ingestion surface added in this phase consumes such a corpus the moment it is acquired.

Neither is classified as an implementation blocker. Both are governed by the Phase 30 acquisition plan and re-affirmed by Phase 31 §9–§11 and Phase 33 §10.

---

## §11 Final Determination

**IMPLEMENTATION PARTIALLY COMPLETED.**

All in-repo implementation steps the Phase 31 §13 / Phase 33 §13 authorization permits at this time are executed:

- Corpus ingestion surface implemented (`tempoCorpusIngestion.ts`).
- Validation harness executed against the wired corpus pathway (status `no_corpus`).
- Calibration pathway executed (`uncalibrated / no_corpus`).
- Confidence propagation executed (omitted under uncalibrated certificate, no fabrication).
- Gate matrix evaluated end-to-end (three deterministic gates `pass`; three corpus-dependent gates `block`).
- Tile-adapter output observed (`missing` with canonical reason).
- 9/9 assertions pass under `bunx vitest run`.

The two remaining items (EXT-MODEL binding replacement, ≥30-pair EXT-CORPUS file) are acquisition-class external inputs governed by Phase 30, explicitly classified as non-implementation blockers by Phase 29, Phase 31 §9–§11, and Phase 33 §10. Implementing them from inside the repository would constitute fabrication and is forbidden by `mem://` doctrine and Phase 22 F-6. They are therefore reported here as outstanding **acquisition** work, not outstanding implementation work.
