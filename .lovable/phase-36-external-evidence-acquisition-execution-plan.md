# Phase 36 — External Evidence Acquisition Execution Plan

Status: operational acquisition plan for the first truth-supported metric
(`tempo_sec`). Reality-only. Citation-bound. No code, no implementation,
no architecture, no doctrine, no new metrics, detectors, anchors,
validation, calibration, confidence, or gate definitions are introduced
by this document.

Read-only sources: Phase 29, Phase 30, Phase 31, Phase 33, Phase 34,
Phase 35, and the existing repository surfaces under
`src/lib/biomech/**`, `src/lib/reportCard/**`, and
`supabase/functions/analyze-video/**`.

---

## §1 Scope

Restricted to the `tempo_sec` truth-support path authorized by Phase 31
and Phase 33 and partially implemented under Phase 34
(`.lovable/phase-34-tempo-sec-implementation-execution.md`,
determination: IMPLEMENTATION PARTIALLY COMPLETED). Phase 35
(`.lovable/phase-35-first-truth-supported-metric-evidence-execution.md`,
determination: READY FOR EVIDENCE EXECUTION) confirms every in-repo
surface required to consume external evidence is already wired.

Phase 36 documents only what must be acquired from outside the
repository to convert that readiness into a real truth-supported
`tempo_sec` tile state. No expansion to additional metrics. No new
constitutional surface.

## §2 EXT-MODEL Acquisition Inventory

Single canonical binding site, mirrored across browser and edge runtimes:

- `src/lib/biomech/versions.ts:25` — `LANDMARK_MODEL_VERSION =
  "blazepose_full@0.0.0-stub"` (current stub pin).
- `supabase/functions/_shared/biomechFingerprint.ts` —
  `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"` (byte-identical
  mirror per Phase 0 Determinism Foundation).

Items that must be acquired externally (Phase 30 EXT-MODEL class;
non-fabricable inside the repository per Phase 22 F-6 and Phase 34
determination):

1. Real BlazePose Full runtime artifact (model weights + executable
   inference path) consumable by the pose-extraction step feeding
   `src/lib/biomech/pipeline/tempoPipeline.ts` and the
   `supabase/functions/analyze-video/**` runtime.
2. Pinned non-stub version identifier replacing the `@0.0.0-stub`
   suffix in both binding sites above.
3. Provenance metadata sufficient to satisfy the deterministic
   fingerprint contract (see §8).

No in-repo path generates any of the above. Acquisition is external.

## §3 EXT-MODEL Acceptance Requirements

An EXT-MODEL artifact is acceptable when, and only when, all of the
following are true under existing repository contracts (no new
acceptance criteria introduced here):

- The pinned `LANDMARK_MODEL_VERSION` string is non-stub and identical
  across `src/lib/biomech/versions.ts` and
  `supabase/functions/_shared/biomechFingerprint.ts`.
- The artifact produces deterministic pose-frame output consumable by
  the existing anchor/detector chain invoked from
  `src/lib/biomech/pipeline/tempoPipeline.ts` (`findPeakLegLiftFrame`,
  `findFrontFootStrikeFrame`, `computeTempoSec`).
- The artifact preserves the fingerprint stability contract of
  `buildCacheFingerprint` (Phase 0): identical physical inputs +
  identical pinned versions ⇒ identical `cache_fingerprint`.

No additional acceptance gates are defined by Phase 36.

## §4 EXT-CORPUS Acquisition Inventory

Single canonical schema and ingestion path:

- Schema: `TempoValidationPair` at
  `src/lib/biomech/validation/tempoHarness.ts:18–25` —
  `{ clip_id: string; predicted_sec: number | null; ground_truth_sec: number }`.
- Ingestion: `parseTempoValidationCorpus` in
  `src/lib/biomech/validation/tempoCorpusIngestion.ts` (Phase 34 surface;
  rejects malformed input via `TempoCorpusParseError`; preserves `[]` as
  the `EMPTY_TEMPO_CORPUS` sentinel routed to `status: "no_corpus"`).
- Floor: `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` at
  `tempoHarness.ts:46` (H2 ground-truth requirement).

Items that must be acquired externally:

1. ≥30 athlete swing clips meeting the recording requirements in §5.
2. Per-clip externally measured `ground_truth_sec` values (see §6).
3. Per-clip `predicted_sec` values derived from real EXT-MODEL execution
   through `runTempoPipeline` (or legitimately `null` only when the
   pipeline itself yields null for that clip).

## §5 Athlete Recording Requirements

The only physical-clip acceptance surface in the repository is
`src/lib/biomech/videoAcceptance.ts`. Every acquired clip MUST satisfy
its existing constants and verdicts (no new requirement introduced):

- `evaluateProbe(...)` must return `{ ok: true }`, i.e. the clip clears
  `MIN_FPS`, `MIN_WIDTH`, `MIN_HEIGHT`, `MIN_DURATION_SEC`, and
  `MAX_DURATION_SEC`.
- `evaluateExtraction(requested, captured)` must return `{ ok: true }`,
  i.e. the dropped-frame ratio does not exceed
  `MAX_DROPPED_FRAME_RATIO`.

Clips that fail either verdict are inadmissible to the corpus.

## §6 Labeling Requirements

Per-pair requirements derived directly from the existing schema and
Phase 34 ingestion contract — no new field is introduced:

- `clip_id`: stable, non-empty string, unique within the corpus. Same
  identifier used end-to-end for fingerprint reconstruction and replay.
- `ground_truth_sec`: finite number measured by an external labeler
  using a method outside the system. The system MUST NOT generate
  ground truth (Phase 22 F-6; `tempoHarness.ts` lines 10–13).
- `predicted_sec`: finite number produced by running the matching clip
  through `runTempoPipeline` under the real EXT-MODEL of §2; or `null`
  if and only if the pipeline itself returns null for that clip.

No in-repo labeling tool exists. Labeling is an external process.

## §7 Corpus Acceptance Requirements

A corpus file is acceptable when, and only when, all of the following
hold (existing contracts only):

- `parseTempoValidationCorpus(raw)` returns without throwing
  `TempoCorpusParseError` (root is an array; every entry passes the
  shape and finiteness checks defined in
  `tempoCorpusIngestion.ts:31–62`).
- The resulting array length is ≥ `MIN_LABELED_PAIRS_FOR_VALIDATION`
  (= 30).
- `runTempoValidationHarness(pairs)` transitions out of `no_corpus` and
  out of `insufficient_corpus` (i.e. yields `status: "executed"`).

No additional corpus acceptance criteria are introduced.

## §8 Fingerprint Requirements

Two existing deterministic fingerprints must remain stable across
acquisition and replay (no new fingerprint defined):

- Per-clip cache fingerprint: `buildCacheFingerprint` (browser:
  `src/lib/biomech/fingerprint.ts`; edge:
  `supabase/functions/_shared/biomechFingerprint.ts`) combines
  `videoSha256Hex`, `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`,
  `METRIC_ENGINE_VERSION`, `fpsTrue`, `landingTimeSec`,
  `directionSign`, and `calibrationHpx`. Replacing the stub
  `LANDMARK_MODEL_VERSION` legally invalidates the cache layer and
  only that layer (Phase 0).
- Corpus fingerprint: `corpus_fingerprint_hex` in `TempoValidationReport`
  (`tempoHarness.ts:57`), derived deterministically from the parsed
  pairs via `sha256OfCanonicalJson`.

Both must be reproducible byte-for-byte under identical physical
inputs and identical pinned versions.

## §9 Validation Execution Readiness

`runTempoValidationHarness` is wired (Phase 34) and re-evaluates
deterministically on corpus arrival. With a §7-acceptable corpus it
produces `status: "executed"`, residual records, and a stable
`corpus_fingerprint_hex`. No additional validation surface is required.

## §10 Calibration Execution Readiness

`generateTempoCalibrationCertificate` is wired (Phase 34) and consumes
the `TempoValidationReport`. On an `executed` report it deterministically
transitions out of `uncalibrated`/`no_corpus` to issue the calibration
certificate. No additional calibration surface is required.

## §11 Confidence Execution Readiness

`evaluateTempoGateMatrix` is wired (Phase 34). Its
`confidence_calibration` gate consumes the calibration certificate of
§10 and re-evaluates deterministically. No additional confidence
surface is required.

## §12 Promotion Execution Readiness

`tempoEvidenceToTileState` is wired (Phase 34). When the six-gate matrix
yields `all_pass: true`, the adapter deterministically transitions the
`tempo_sec` tile out of `status: "missing"` to a truth-supported `pass`
or `fail` state. No additional promotion surface is required.

## §13 Earliest Truth-Supported Metric Event

Strict acquisition-to-promotion sequence. Steps 1–4 are external;
steps 5–7 are deterministic re-evaluation of existing repository
surfaces and require no further repo work.

1. Acquire EXT-MODEL per §2; replace the stub
   `LANDMARK_MODEL_VERSION` in both binding sites with the real pinned
   version (§3).
2. Record ≥30 athlete swing clips satisfying `videoAcceptance` (§5).
3. Run each clip through `runTempoPipeline` under the real EXT-MODEL
   to obtain `predicted_sec` (§6).
4. Assemble the labeled corpus by attaching externally measured
   `ground_truth_sec` to each `clip_id` (§6); save in a form that
   `parseTempoValidationCorpus` accepts (§7).
5. Ingest via `parseTempoValidationCorpus`; harness yields
   `status: "executed"` (§9).
6. Certificate via `generateTempoCalibrationCertificate`; gate matrix
   via `evaluateTempoGateMatrix` (§10, §11).
7. `tempoEvidenceToTileState` emits the first truth-supported
   `tempo_sec` tile state (§12).

This sequence is the earliest possible truth-supported metric event
under the existing constitution.

## §14 Release-1 Scaling Implications

The acquisition pattern documented here — one EXT-MODEL acquisition
(amortized across all biomech metrics) plus one EXT-CORPUS acquisition
per metric — is the same pattern any subsequent metric would follow
under its own future authorization phase. Phase 36 makes no commitment
about the scope, ordering, or timing of any non-`tempo_sec` metric.
Scaling is explicitly out of scope here and is governed by future
phases.

## §15 Final Determination

**READY TO ACQUIRE REAL EVIDENCE.**

All in-repo surfaces required to consume EXT-MODEL and EXT-CORPUS exist,
are wired, and re-evaluate deterministically on arrival
(Phases 34, 35). The remaining work is purely external evidence
acquisition governed by Phase 30 and explicitly classified as
non-implementation-blocking by Phase 29, Phase 31 §9–§11, and
Phase 33 §10.

No additional planning, audit, doctrine, architecture, metric,
detector, anchor, validation, calibration, confidence, gate, or
in-repo implementation artifact is identified as a prerequisite to
external evidence acquisition for `tempo_sec`.
