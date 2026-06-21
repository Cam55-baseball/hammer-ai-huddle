# Phase 30 — First Truth-Supported Metric Acquisition Plan

Status: acquisition-planning only. No code, doctrine, architecture, metric,
detector, anchor, validation, calibration, confidence, or gate changes are
introduced by this document. All claims are sourced exclusively from existing
canonical documents and existing repository surfaces. No evidence, corpus,
calibration certificate, confidence binding, or gate outcome is fabricated.

---

## §1 Scope

This phase plans, but does not perform, acquisition of the smallest real-world
evidence package required to promote the first athlete-facing report-card
metric — `tempo_sec` — from **Partially Supported** to **Truth Supported**
under the existing canonical requirements identified in Phases 27–29.

In scope:
- Identifying the minimum acquisition artifacts for `EXT-MODEL` and
  `EXT-CORPUS` against existing repository binding points.
- Mapping each acquired artifact to its existing deterministic consumption
  surface (intake → validation → calibration → confidence → gate → tile).
- Determining the earliest achievable Truth-Supported promotion event.

Out of scope (explicit non-goals):
- Any code, schema, doctrine, architecture, gate-matrix, calibration-architecture,
  confidence-architecture, or validation-framework modification.
- Introduction of any new metric, detector, anchor, validation requirement,
  calibration requirement, confidence requirement, or production gate.
- Acquisition execution, model selection, vendor selection, dataset creation,
  labeling, or any synthesis of evidence.
- Any artifact for the remaining 29 Release-1 report-card metrics.

---

## §2 Tempo Metric Promotion Path

Per Phase 28 §§5–11 and Phase 29 §§4–10 the current `tempo_sec` state is:

- Tile state: **Partially Supported** (deterministic pipeline, replay
  equivalence, missingness fidelity all present; validation/calibration/
  confidence-calibration gates `block` pending external inputs).
- Promotion is **doctrinally feasible and implementation-ready**; no further
  code, schema, doctrine, or architecture change is required.

The Phase 28 §11 / Phase 29 §10 promotion chain has exactly five steps:

1. Supply `EXT-MODEL` — non-stub D-POSE replacing `blazepose_full@0.0.0-stub`
   pinned in `src/lib/biomech/versions.ts:25`.
2. Supply `EXT-CORPUS` — ≥ `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` labeled
   paired-frame examples conforming to `TempoValidationPair`
   (`src/lib/biomech/validation/tempoHarness.ts:21–28, 39`).
3. Deterministic validation harness execution (`runTempoValidationHarness`,
   `tempoHarness.ts:60–129`) transitions report `status` from
   `insufficient_corpus` → `executed`.
4. Deterministic calibration certificate emission
   (`generateTempoCalibrationCertificate`,
   `src/lib/biomech/calibration/tempoCalibration.ts:46–91`) transitions
   from `uncalibrated` → `calibrated` with the canonical
   `residual_envelope` + `corpus_fingerprint_hex` + `certificate_sha256_hex`.
5. Calibrated-confidence binding propagates through the existing report-card
   tile adapter to flip the three currently-blocked gates to `pass` and the
   tile to **Truth Supported**.

Steps 3–5 are deterministic derivations through code already present in the
repository (Phase 29 §§7–10). Only steps 1 and 2 are external acquisitions.

---

## §3 EXT-MODEL Acquisition Requirements

Binding points already in the repository:

- Version pin: `src/lib/biomech/versions.ts:24–25`
  (`LANDMARK_MODEL_ID`, `LANDMARK_MODEL_VERSION`). The `@0.0.0-stub` suffix
  marks the current placeholder; replacement of this constant is the
  EXT-MODEL binding.
- Cache fingerprint participation: `versions.ts:9–18` documents that
  `LANDMARK_MODEL_VERSION` participates in the deterministic cache
  fingerprint contract. Any acquired model MUST produce a stable version
  string suitable for inclusion in that fingerprint.
- Calibration residual-envelope consumption:
  `src/lib/biomech/calibration/tempoCalibration.ts:30–40` consumes the
  residuals produced through the EXT-MODEL-driven pipeline.

Existing canonical requirements (no new requirements introduced):

- Replay determinism (`canonical-validation-framework.md §6 H1`).
- Replay equivalence under pinned model version
  (`canonical-validation-framework.md §6 H5`).
- Residual-envelope derivation under that pinned version
  (`canonical-calibration-architecture.md §§3.2, §4 D-POSE`).
- Confidence binding under that pinned version
  (`canonical-confidence-architecture.md`, Phase 29 §6).

Minimum acquisition artifact for EXT-MODEL:

- A single D-POSE inference surface whose outputs are deterministic for a
  fixed input video at the pipeline's already-defined ingestion contract.
- A stable, non-stub version string suitable to replace
  `blazepose_full@0.0.0-stub` at `versions.ts:25`.
- No additional repository surface, schema, or doctrinal binding is
  required. (Phase 29 §2.)

---

## §4 EXT-CORPUS Acquisition Requirements

Binding point already in the repository:

- Pair schema: `src/lib/biomech/validation/tempoHarness.ts:21–28`
  (`TempoValidationPair`: `clip_id: string`, `predicted_sec: number | null`,
  `ground_truth_sec: number`).
- Minimum pair count: `tempoHarness.ts:39`
  (`MIN_LABELED_PAIRS_FOR_VALIDATION = 30`). Below this floor the harness
  refuses an `executed` verdict (`tempoHarness.ts:113–117`).
- Deterministic ordering and fingerprinting: `tempoHarness.ts:62–64` (lexical
  `clip_id` sort) and `tempoHarness.ts:120` (`corpus_fingerprint_hex` via
  canonical-JSON SHA-256). Both are already-enforced determinism contracts.
- Residual derivation: `tempoHarness.ts:66–88` (six-decimal residual
  rounding, missing-prediction preservation).

Existing canonical requirements (no new requirements introduced):

- H2 ground-truth requirement (`canonical-validation-framework.md §6 H2`).
- H5 replay equivalence (`canonical-validation-framework.md §6 H5`).
- Missingness fidelity preservation (Phase 27 closure; Phase 29 §5).

Minimum acquisition artifact for EXT-CORPUS:

- ≥ 30 paired clips, each providing a stable `clip_id`, a ground-truth
  `tempo_sec` (seconds, scalar) measured against the project's existing
  tempo definition, and an input video usable by the EXT-MODEL-driven
  pipeline to produce `predicted_sec` (or a constitutionally legal `null`).
- No additional fields, no derived statistics, no auxiliary metadata, and
  no expansion of the schema are permitted or required.

---

## §5 Smallest Valid Athlete Evidence Package

The smallest real-world package that satisfies the existing canonical
requirements is the union of §3 and §4:

1. **One** D-POSE model binding satisfying §3.
2. **≥ 30** labeled paired-frame clips satisfying §4.

No additional artifacts, schemas, certificates, calibration tables,
confidence priors, gate overrides, doctrinal exceptions, or repository
changes are required. (Phase 29 §§2–7, §11.)

---

## §6 Evidence Intake Readiness

Existing intake surfaces capable of consuming the §5 package without
modification:

- Pipeline ingestion: `src/lib/biomech/pipeline/tempoPipeline.ts` (Phase 27).
- Version-pin participation: `src/lib/biomech/versions.ts:24–27`.
- Validation harness ingestion: `src/lib/biomech/validation/tempoHarness.ts`
  (`runTempoValidationHarness` accepts `readonly TempoValidationPair[]`).
- Calibration ingestion:
  `src/lib/biomech/calibration/tempoCalibration.ts:46–48` accepts the
  validation report directly.
- Server-side analysis path: `supabase/functions/analyze-video/**` already
  bound to the same `versions.ts` constants via the deterministic cache
  fingerprint contract documented at `versions.ts:9–18`.
- Replay equivalence: `src/lib/biomech/replay/tempoReplay.ts` (Phase 27).
- Report-card tile adapter: `src/lib/biomech/reportCard/tempoTileAdapter.ts`
  (Phase 27) plus `src/lib/reportCard/**`.

No new intake surface is required. (Phase 29 §5.)

---

## §7 Validation Consumption Readiness

`runTempoValidationHarness` (`tempoHarness.ts:60–129`) deterministically
consumes the §5 package. With pair count ≥ 30 the status branch
`tempoHarness.ts:113–117` selects `executed`, populating
`summary.mean_residual_sec` and `summary.mean_absolute_residual_sec`
(`tempoHarness.ts:96–112`) and the canonical `corpus_fingerprint_hex`
(`tempoHarness.ts:120`). The existing test surface
`src/lib/biomech/__tests__/tempoHarness.test.ts` already certifies these
transitions for `no_corpus` and `insufficient_corpus` cases.

No additional validation requirement is introduced.

---

## §8 Calibration Consumption Readiness

`generateTempoCalibrationCertificate`
(`tempoCalibration.ts:46–91`) accepts the `executed` validation report and
deterministically emits a `CalibrationCertificate` containing the canonical
`residual_envelope`, `corpus_fingerprint_hex`, and
`certificate_sha256_hex` (derived via `sha256OfCanonicalJson` over the
canonicalized body, `tempoCalibration.ts:77–90`). The `uncalibrated`
branches at `tempoCalibration.ts:49–75` are bypassed by construction once
§7 yields `executed` and the summary scalars are non-null.

No additional calibration requirement is introduced. (Phase 29 §6.)

---

## §9 Confidence Consumption Readiness

Per Phase 29 §6 the calibrated-confidence binding consumes the §8
certificate envelope through the existing report-card tile adapter
(`src/lib/biomech/reportCard/tempoTileAdapter.ts`). No additional
confidence requirement, prior, or binding surface is introduced.
(`canonical-confidence-architecture.md` baseline preserved.)

---

## §10 Production Gate Consumption Readiness

Per Phase 28 §§5–9 the six `tempo_sec` production gates currently stand at:

- `pass`: determinism, replay equivalence, missingness fidelity.
- `block`: validation, calibration, confidence calibration — each blocked
  exclusively on the supply of EXT-MODEL and EXT-CORPUS.

The three currently-blocked gates have deterministic dependencies on §§7–9
outputs and revaluate to `pass` automatically once those outputs exist,
under `canonical-production-gate-matrix.md` as-is. No gate is added, removed,
relaxed, or re-weighted.

---

## §11 First Truth-Supported Metric Promotion Sequence

Deterministic ordered sequence (existing code paths only):

1. Bind EXT-MODEL by replacing `LANDMARK_MODEL_VERSION` at
   `src/lib/biomech/versions.ts:25` with the acquired non-stub version
   string.
2. Ingest EXT-CORPUS as `TempoValidationPair[]` per §4 schema.
3. `runTempoValidationHarness(corpus)` returns a report with
   `status = "executed"` (§7).
4. `generateTempoCalibrationCertificate(report)` returns a
   `CalibrationCertificate` with `status = "calibrated"` (§8).
5. Calibrated-confidence binding propagates through the existing tile
   adapter (§9).
6. The three currently-blocked production gates revaluate to `pass` (§10).
7. The report-card tile transitions from **Partially Supported** to
   **Truth Supported**.

Steps 3–7 are non-discretionary derivations; only steps 1–2 require
external acquisition.

---

## §12 Earliest Achievable Promotion Event

A single promotion event is reachable immediately upon delivery of the §5
package; no intervening Lovable phase, doctrinal action, code change, or
architectural change is required. The remaining 29 Release-1 metrics are
out of scope for Phase 30 (Phase 29 §9) and their first-tile counts remain:

- Earliest Release-1 Report Card achievable on this acquisition event:
  **1 / 30** Truth Supported (the `tempo_sec` tile), with the other 29
  tiles unchanged.

---

## §13 Final Determination

**ACQUISITION READY.**

Basis (repository evidence and existing canonical requirements only):

- Phase 29 §12 already certified `READY FOR EVIDENCE ACQUISITION`.
- The two external inputs (EXT-MODEL §3, EXT-CORPUS §4) have explicit
  repository binding points (`versions.ts:24–27`, `tempoHarness.ts:21–28,
  39`) and explicit canonical requirements satisfied by their minimum
  schemas without expansion.
- All downstream consumption surfaces (§§6–10) exist in the repository at
  the line-level citations above and require no modification.
- The promotion sequence (§11) is fully deterministic from the moment the
  §5 package is supplied; no further evidence, doctrine, or code change is
  needed to reach the first Truth-Supported metric event (§12).
