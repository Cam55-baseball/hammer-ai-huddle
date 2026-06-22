# Phase 35 — First Truth-Supported Metric Evidence Execution

Scope: `tempo_sec` only. Execution-path documentation. No code, architecture,
doctrine, audits, or requirements introduced. All claims citation-bound to
Phases 29–34 and existing repository surfaces.

---

## §1 Current State

Per Phase 34 (`.lovable/phase-34-tempo-sec-implementation-execution.md`,
determination `IMPLEMENTATION PARTIALLY COMPLETED`), every in-repo surface
on the Phase 31 §13 / Phase 33 §13 authorized `tempo_sec` path is wired
and deterministically executable:

- Anchors → detector → metric → evidence: `src/lib/biomech/pipeline/tempoPipeline.ts`
- Validation harness: `src/lib/biomech/validation/tempoHarness.ts`
- Corpus ingestion: `src/lib/biomech/validation/tempoCorpusIngestion.ts`
  (with `EMPTY_TEMPO_CORPUS` sentinel)
- Calibration: `src/lib/biomech/calibration/tempoCalibration.ts`
- Six-gate matrix: `src/lib/biomech/gates/tempoGateMatrix.ts`
- Tile adapter: `src/lib/biomech/reportCard/tempoTileAdapter.ts`

Under `EMPTY_TEMPO_CORPUS` (Phase 34 test suite
`src/lib/biomech/__tests__/tempoExecution.test.ts`, 9/9 passing):

- `runTempoValidationHarness` → `status: "no_corpus"`, `pair_count: 0`
- `generateTempoCalibrationCertificate` → `status: "uncalibrated"`,
  `reason: "no_corpus"`
- `evaluateTempoGateMatrix` → `all_pass: false`; blocking gates ⊇
  `{validation, calibration, confidence_calibration}`
- `tempoEvidenceToTileState` → `status: "missing"`

Two acquisition-class external inputs remain outstanding, classified
non-implementation blockers by Phase 29, Phase 31 §9–§11, Phase 33 §10:

- **EXT-MODEL** — real BlazePose Full runtime binding
- **EXT-CORPUS** — ≥30 labeled `TempoValidationPair` records

---

## §2 EXT-MODEL Acquisition Surface

- **Binding site:** `src/lib/biomech/versions.ts:25`
  (`LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`)
- **Model id pin:** `versions.ts:24` (`LANDMARK_MODEL_ID = "blazepose_full"`)
- **Consumer:** `runTempoPipeline` `pose_frames` input
  (`src/lib/biomech/pipeline/tempoPipeline.ts`)
- **Required artifact:** real BlazePose Full runtime emitting
  `(PoseFrame & PlantPoseFrame)[]` with a versioned, replay-stable model
  pin (e.g. `blazepose_full@<semver>`) replacing the `0.0.0-stub` suffix.
- **Fabrication forbidden:** per Phase 22 F-6 and `mem://` Eternal Laws
  the stub may not be replaced with a synthesized or guessed pin. The
  pin must derive from a real, version-fixed runtime acquisition.

---

## §3 EXT-CORPUS Acquisition Surface

- **Schema:** `TempoValidationPair`
  (`src/lib/biomech/validation/tempoHarness.ts:18–25`):
  `{ clip_id: string, predicted_sec: number | null, ground_truth_sec: number }`
- **Ingestion entry point:** `parseTempoValidationCorpus`
  (`src/lib/biomech/validation/tempoCorpusIngestion.ts`), raising
  `TempoCorpusParseError` on shape/type violations.
- **Minimum pair count:** `MIN_LABELED_PAIRS_FOR_VALIDATION = 30`
  (`tempoHarness.ts`); below this floor the harness refuses an
  `executed` verdict.
- **Sentinel for empty state:** `EMPTY_TEMPO_CORPUS`
  (`tempoCorpusIngestion.ts`).

---

## §4 Corpus Labeling Requirements

Per pair:

1. **`clip_id`** — stable, externally assigned identifier; the harness
   sorts by `clip_id` lexicographically (`tempoHarness.ts` sort step),
   producing a deterministic `corpus_fingerprint_hex` via
   `sha256OfCanonicalJson`.
2. **`ground_truth_sec`** — externally labeled tempo for the clip,
   produced outside the repository. Doctrine forbids in-repo
   fabrication.
3. **`predicted_sec`** — produced by running `runTempoPipeline` against
   the clip under the EXT-MODEL real runtime (§2); `null` propagates
   canonical missingness through the harness without invalidating the
   pair.
4. **Cardinality:** `pairs.length ≥ 30`.
5. **Determinism:** identical pair sets produce identical
   `corpus_fingerprint_hex`; ordering is normalized inside the harness.

---

## §5 Evidence Intake Path

Per-clip artifact pipeline (already wired):

```text
video clip
  → analyze-video edge function (supabase/functions/analyze-video/**)
  → pose extraction (post-EXT-MODEL, consumed as pose_frames)
  → runTempoPipeline(...)            [pipeline/tempoPipeline.ts]
  → TempoEvidenceArtifact            [evidence/tempoEvidence.ts]
       ├─ evidence_sha256_hex        (replay equivalence anchor)
       └─ cache_fingerprint_hex      (determinism anchor)
```

Fingerprint composition rules: `supabase/functions/_shared/biomechFingerprint.ts`
and `src/lib/biomech/versions.ts` (prompt/athlete-context/AI-model-id
constitutionally excluded per `versions.ts:18–22`).

---

## §6 Validation Execution Path

```text
labeled corpus JSON
  → parseTempoValidationCorpus(...)        [validation/tempoCorpusIngestion.ts]
  → readonly TempoValidationPair[]
  → runTempoValidationHarness(pairs)       [validation/tempoHarness.ts]
  → TempoValidationReport
```

Status transition table (`tempoHarness.ts`):

| pair_count           | status                  |
| -------------------- | ----------------------- |
| 0                    | `no_corpus`             |
| 1 … 29               | `insufficient_corpus`   |
| ≥ 30                 | `executed`              |

The `executed` state is the precondition for §7.

---

## §7 Calibration Execution Path

```text
TempoValidationReport (status: "executed")
  → generateTempoCalibrationCertificate(report)
       [calibration/tempoCalibration.ts]
  → TempoCalibrationResult
       (status transitions out of "uncalibrated/no_corpus" into a
        calibrated certificate bound to the report's
        corpus_fingerprint_hex)
```

Calibration is deterministic over the harness report (no extra inputs).

---

## §8 Confidence Execution Path

Per Phase 33 §8 (confidence binding flows through the tile-state
contract), the calibration certificate from §7 is consumed by the
`confidence_calibration` gate inside `evaluateTempoGateMatrix`
(`gates/tempoGateMatrix.ts:5–11` gate inventory; §8 confidence is
`conf §Promotion-Demotion`). No separate confidence pipeline exists or
is needed.

---

## §9 Production Gate Execution Path

Six-gate matrix (`gates/tempoGateMatrix.ts:5–11`):

1. Validation (`val §7`)
2. Calibration (`cal §3` / `cal §7`)
3. Confidence calibration (`conf §Promotion-Demotion`)
4. Replay equivalence (`bp §H5` / `val §H5`)
5. Missingness fidelity (`arch §Missingness rules`)
6. Determinism (cache fingerprint stability)

Today's blocking set (Phase 34): `{validation, calibration,
confidence_calibration}`. Replay equivalence, missingness fidelity, and
determinism already pass deterministically against the current
artifact (Phase 27 wiring).

On EXT-MODEL + EXT-CORPUS arrival the three blocking gates clear
without code changes; `evaluateTempoGateMatrix` re-evaluates to
`all_pass: true`, and `tempoEvidenceToTileState` transitions out of
`status: "missing"`.

---

## §10 Tempo Promotion Event Definition

The tempo promotion event is the first deterministic transition of
`tempoEvidenceToTileState`
(`src/lib/biomech/reportCard/tempoTileAdapter.ts`) from
`status: "missing"` to `status: "pass" | "fail"` under a
`TempoGateMatrixReport` with `all_pass: true`, bound to the tuple:

```text
(LANDMARK_MODEL_VERSION pin, corpus_fingerprint_hex,
 evidence_sha256_hex, cache_fingerprint_hex)
```

No new event surface is introduced; the event is defined entirely in
terms of the existing tile-adapter contract and gate-matrix report.

---

## §11 Truth-Supported Metric Success Criteria

All seven must hold simultaneously:

a. `versions.ts:25` `LANDMARK_MODEL_VERSION` bound to a real
   non-`-stub` runtime pin.
b. ≥30-pair corpus ingested via `parseTempoValidationCorpus` with a
   stable `corpus_fingerprint_hex`.
c. `runTempoValidationHarness` → `status: "executed"`.
d. `generateTempoCalibrationCertificate` → calibrated (not
   `uncalibrated`).
e. `confidence_calibration` gate `outcome: "pass"`.
f. `evaluateTempoGateMatrix` → `all_pass: true` across all six gates.
g. `tempoEvidenceToTileState` → `status !== "missing"`.

---

## §12 Earliest Possible Promotion Sequence

Citation-bound, in order:

1. Acquire EXT-MODEL (real BlazePose Full runtime).
2. Replace stub at `src/lib/biomech/versions.ts:25` with the real
   version pin.
3. Run `runTempoPipeline` over the labeled clip set to produce
   `predicted_sec` values.
4. Acquire EXT-CORPUS JSON (≥30 pairs with external `ground_truth_sec`
   labels).
5. Ingest via `parseTempoValidationCorpus`.
6. Execute `runTempoValidationHarness` → `executed`.
7. Execute `generateTempoCalibrationCertificate` → calibrated.
8. Execute `evaluateTempoGateMatrix` → `all_pass: true`.
9. `tempoEvidenceToTileState` → tile promotion event (§10).

All in-repo wiring required by steps 3 and 5–9 already exists
(Phase 27 + Phase 34). Only steps 1 and 4 are external acquisitions.

---

## §13 Final Determination

**READY FOR EVIDENCE EXECUTION**

Supported by:

- Phase 33 (`.lovable/phase-33-implementation-execution-go-no-go-audit.md`,
  determination `IMPLEMENTATION MAY BEGIN`).
- Phase 34 (`.lovable/phase-34-tempo-sec-implementation-execution.md`,
  determination `IMPLEMENTATION PARTIALLY COMPLETED`; all in-repo
  surfaces wired and deterministically executable).
- Phase 30 / Phase 31 §9–§11 classification of EXT-MODEL and
  EXT-CORPUS as acquisition-class external inputs.

Every in-repo surface required to consume EXT-MODEL and EXT-CORPUS
exists and re-evaluates deterministically on arrival. The remaining
work is external evidence acquisition (§2, §3), not planning,
architecture, doctrine, audit, or implementation.
