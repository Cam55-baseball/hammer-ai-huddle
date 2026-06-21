# Phase 31 — First Truth-Supported Metric Implementation Readiness

Readiness-only determination. No code, architecture, doctrine, metric,
detector, anchor, validation, calibration, confidence, or production-gate
changes are introduced by this document. All claims derive from sealed
`.lovable/` Phase 27–30 audits, the canonical authority documents listed in
the source inputs, and existing repository surfaces at the cited lines.

---

## §1 Scope

Subject: the single metric candidate `tempo_sec`, as identified and
re-affirmed in:

- `.lovable/phase-27-first-truth-supported-metric-closure.md` (closure)
- `.lovable/phase-28-first-truth-supported-metric-promotion-audit.md`
  (smallest promotion closure set)
- `.lovable/phase-29-external-evidence-readiness-audit.md`
  (READY FOR EVIDENCE ACQUISITION)
- `.lovable/phase-30-first-truth-supported-metric-acquisition-plan.md`
  (ACQUISITION READY)

Question answered here: are all planning, authority, audit, validation,
calibration, confidence, production-gate, and evidence-readiness
prerequisites satisfied such that implementation work for the
`tempo_sec` truth-supported path may begin? This is the final readiness
gate before implementation; the 29 other report-card metrics are
explicitly out of scope.

---

## §2 Planning Completion Audit

| Phase | Document | Sealed Determination |
|------|----------|----------------------|
| 27 | `.lovable/phase-27-first-truth-supported-metric-closure.md` | `tempo_sec` identified as sole Partially Supported candidate with a fully-wired downstream consumption chain |
| 28 | `.lovable/phase-28-first-truth-supported-metric-promotion-audit.md` | Smallest promotion closure set reduces to two external blockers (EXT-MODEL, EXT-CORPUS); no missing repository surface |
| 29 | `.lovable/phase-29-external-evidence-readiness-audit.md` | READY FOR EVIDENCE ACQUISITION |
| 30 | `.lovable/phase-30-first-truth-supported-metric-acquisition-plan.md` | ACQUISITION READY |

No prior phase remains open. No prior phase identifies a planning artifact
still pending. Planning prerequisites are complete.

---

## §3 Authority Completion Audit

Operative authority envelope (source inputs):

- `.lovable/report-card-implementation-authority-package.md` — implementation
  authority package for the report-card metric path.
- `.lovable/canonical-execution-authorization.md` — execution authorization
  envelope.
- `.lovable/canonical-production-readiness-audit.md` — production-readiness
  audit envelope.
- `.lovable/canonical-implementation-execution-audit.md` — implementation
  execution audit envelope.

These four documents collectively constitute the standing authority surface
under which Phase 27–30 audits were performed. No source input identifies a
further authority artifact whose absence blocks implementation start.
Authority prerequisites are complete for the scoped `tempo_sec` path.

---

## §4 Repository Readiness Audit

The full deterministic chain D-3 → D-4 → D-5 → D-6 → D-7 → D-8 → gate
matrix → replay → tile adapter is present at line-level citations:

- D-3 anchors: `src/lib/biomech/anchors/peakLegLift.ts`,
  `src/lib/biomech/anchors/frontFootStrike.ts`
  (consumed in `src/lib/biomech/pipeline/tempoPipeline.ts:53–54`).
- D-4 detector: `src/lib/biomech/detectors/plantDetector.ts` (embedded in
  front-foot-strike anchor per `tempoPipeline.ts` header doctrine).
- D-5 metric: `src/lib/biomech/metrics/tempoSec.ts::computeTempoSec`
  (called at `tempoPipeline.ts:56–60`).
- D-6 evidence artifact:
  `src/lib/biomech/evidence/tempoEvidence.ts::buildTempoEvidence`
  (called at `tempoPipeline.ts:62–71`).
- D-7 validation harness:
  `src/lib/biomech/validation/tempoHarness.ts::runTempoValidationHarness`
  (`tempoHarness.ts:69–125`), `TempoValidationPair`
  (`tempoHarness.ts:21–28`), `MIN_LABELED_PAIRS_FOR_VALIDATION = 30`
  (`tempoHarness.ts:39`).
- D-8 calibration certificate generator:
  `src/lib/biomech/calibration/tempoCalibration.ts::generateTempoCalibrationCertificate`
  (`tempoCalibration.ts:45–88`).
- Production gate matrix: `src/lib/biomech/gates/tempoGate.ts`,
  consumed by `src/lib/biomech/reportCard/tempoTileAdapter.ts`.
- Replay: `src/lib/biomech/replay/tempoReplay.ts`.
- Tile adapter →
  `src/lib/reportCard/types.ts::TileState`:
  `src/lib/biomech/reportCard/tempoTileAdapter.ts::tempoEvidenceToTileState`.
- Tests: `src/lib/biomech/__tests__/tempoHarness.test.ts`,
  `src/lib/biomech/__tests__/tempoGateMatrix.test.ts`.

Per Phase 28 §11 and Phase 29, no missing repository surface remains.
Repository readiness is complete.

---

## §5 Validation Readiness Audit

`runTempoValidationHarness` (`tempoHarness.ts:69–125`) is deterministic
(per-call sort at `tempoHarness.ts:70–72`, canonical-JSON fingerprint at
`tempoHarness.ts:120`), refuses fabrication, and emits
`status: "executed"` only when the corpus contains
`>= MIN_LABELED_PAIRS_FOR_VALIDATION` (30) labeled pairs
(`tempoHarness.ts:113–117, 39`). The harness consumes EXT-CORPUS exclusively;
no other input is required. Validation readiness is complete pending the
external corpus identified in Phase 28 §11.

---

## §6 Calibration Readiness Audit

`generateTempoCalibrationCertificate`
(`tempoCalibration.ts:45–88`) emits `status: "calibrated"` iff the upstream
`TempoValidationReport.status === "executed"` AND
`mean_residual_sec`/`mean_absolute_residual_sec` are non-null
(`tempoCalibration.ts:48–73`). Otherwise it returns an
`UncalibratedCertificate` carrying the exact unmet precondition
(`no_corpus` | `insufficient_corpus` | `validation_not_executed`). The
generator refuses to fabricate a residual envelope (file header,
`tempoCalibration.ts:1–13`). Calibration readiness is complete pending the
upstream `executed` harness report.

---

## §7 Confidence Readiness Audit

The calibrated-confidence binding path runs through
`computeTempoSec` → `buildTempoEvidence` → `tempoEvidenceToTileState`
(`tempoTileAdapter.ts:77–84`), which surfaces `confidence` on the tile
only when `metric.confidence.status === "calibrated"` and
`metric.confidence.value != null`. Until then no confidence number is
fabricated, and the tile renders without confidence per the existing
adapter contract (`tempoTileAdapter.ts:14–25`). The binding is wired
end-to-end; it remains gated by (a) the `pose_model_is_stub` missingness
reason originating in the anchors while D-POSE is stubbed
(`tempoPipeline.ts:14–18`) and (b) the uncalibrated certificate from §6.
Confidence readiness is complete pending §5–§6 inputs.

---

## §8 Production Gate Readiness Audit

The six-gate production matrix at `src/lib/biomech/gates/tempoGate.ts`
is consumed by `tempoEvidenceToTileState`
(`tempoTileAdapter.ts:48–66`), which refuses to emit a `pass`/`fail`
verdict unless `gate_matrix.all_pass` is true and otherwise emits
`status: "missing"` with `missing_reason: "gate_blocked:<gate>"`. The
matrix reevaluates automatically when its inputs change; no gate code
mutation is required by §1 scope. Gate readiness is complete pending the
inputs satisfied via §5–§7.

---

## §9 External Dependency Audit

Two external blockers remain, unchanged from Phase 28 §11, Phase 29, and
Phase 30:

- **EXT-MODEL** — non-stub D-POSE replacing
  `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"` at
  `src/lib/biomech/versions.ts:25`. Stub state additionally visible at
  `versions.ts:26–27` (`DETECTOR_VERSION`, `METRIC_ENGINE_VERSION`) but
  per Phase 28 §11 only the D-POSE binding gates `tempo_sec`.
- **EXT-CORPUS** — ≥ 30 `TempoValidationPair` records conforming to
  `tempoHarness.ts:21–28`, ingested into the harness consumers.

Both are acquisition-class, not implementation-class. No additional
external dependency is identified in the source inputs.

---

## §10 Remaining Non-Implementation Blockers

None internal to the repository. No further planning artifact, authority
artifact, audit artifact, doctrinal artifact, schema, contract, or
deterministic chain wiring is identified by Phases 27–30 or the four
canonical authority documents as a prerequisite to implementation start
for the scoped `tempo_sec` path. The only remaining non-implementation
work is the external acquisition of EXT-MODEL and EXT-CORPUS, which is
covered by the Phase 30 acquisition plan.

---

## §11 Earliest Implementation Start Condition

Implementation work for the scoped `tempo_sec` truth-supported path may
begin immediately, scoped to:

1. Replacing the D-POSE stub version binding at
   `src/lib/biomech/versions.ts:25` with the non-stub
   `LANDMARK_MODEL_VERSION` string once EXT-MODEL is acquired.
2. Wiring labeled-corpus ingestion into `runTempoValidationHarness`
   consumers using the schema at `tempoHarness.ts:21–28` once
   EXT-CORPUS is acquired.

No further planning, audit, doctrinal, architectural, or authority
artifact is required to authorize these two implementation steps. Both
remain bounded by the existing canonical authority envelope cited in §3
and may not introduce new metrics, detectors, anchors, validation
requirements, calibration requirements, confidence requirements, or
production gates.

---

## §12 Earliest Truth-Supported Metric Path

Reproduced from Phase 30 §11 (deterministic, no new requirements):

1. EXT-MODEL bound at `versions.ts:25`.
2. EXT-CORPUS ingested as `readonly TempoValidationPair[]`.
3. `runTempoValidationHarness` returns `status: "executed"`
   (`tempoHarness.ts:113–117`).
4. `generateTempoCalibrationCertificate` returns `status: "calibrated"`
   (`tempoCalibration.ts:74–88`).
5. Calibrated confidence binds through `computeTempoSec` →
   `buildTempoEvidence` → `tempoEvidenceToTileState`
   (`tempoTileAdapter.ts:77–84`).
6. Six-gate matrix reevaluates to `all_pass`
   (`tempoTileAdapter.ts:48–66`).
7. Tile transitions to **Truth Supported** with calibrated confidence.

Earliest achievable Release-1 report-card scope: 1 / 30 tiles
(`tempo_sec` only); the remaining 29 metrics are out of scope.

---

## §13 Final Determination

**IMPLEMENTATION AUTHORIZED**

Justification:

- §2: all four prior planning phases (27–30) are sealed with explicit
  determinations.
- §3: the four canonical authority documents form a complete authority
  envelope; no missing authority artifact is identified by the source
  inputs.
- §4: every D-3 → tile-adapter surface exists at cited lines; no missing
  repository surface remains.
- §§5–8: validation, calibration, confidence, and production-gate
  consumption paths are wired and refuse fabrication; their remaining
  blockers are exclusively the two external inputs in §9.
- §9–§10: the sole remaining blockers (EXT-MODEL, EXT-CORPUS) are
  acquisition-class, not implementation-class, and are governed by the
  Phase 30 acquisition plan.
- §11: the implementation steps authorized here are strictly bounded to
  the two binding/ingestion edits and introduce no new requirements.

Authorization is scoped to the `tempo_sec` path defined above. All other
29 report-card metrics remain out of scope and unauthorized by this
determination.
