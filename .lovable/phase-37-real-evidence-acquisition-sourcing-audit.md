# Phase 37 — Real Evidence Acquisition Sourcing Audit

Scope-bound, reality-only sourcing audit for the authorized `tempo_sec`
promotion path. No code, implementation, architecture, doctrine, metrics,
detectors, anchors, validation, calibration, confidence, or gate changes
introduced. All claims citation-bound to Phases 29–36 and the repo surfaces
`src/lib/biomech/**`, `src/lib/reportCard/**`,
`supabase/functions/analyze-video/**`.

---

## §1 Scope

- Restricted to `tempo_sec` only. No expansion to other metrics.
- Sourcing audit only — identifies *where* real EXT-MODEL and EXT-CORPUS
  evidence can be acquired from; does not acquire, fabricate, simulate,
  approximate, or stand in for evidence.
- Reads only Phases 29, 30, 31, 33, 34, 35, 36 and the listed repo
  surfaces.
- Operates under Phase 22 F-6 non-fabrication rule; Phase 30 acquisition
  governance; Phases 29, 31 §9–§11, 33 §10 classification of external
  acquisition as non-implementation-blocking.

---

## §2 EXT-MODEL Source Inventory

Binding sites in the repository that govern what EXT-MODEL must satisfy:

- `src/lib/biomech/versions.ts:25` — pinned `LANDMARK_MODEL_ID =
  "blazepose_full"` and `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`.
- `supabase/functions/_shared/biomechFingerprint.ts` — edge mirror with
  byte-identical constants and `buildCacheFingerprint` consuming
  `landmarkModelVersion`.

Real-world acquisition candidates compatible with that pinning:

1. **Google MediaPipe Pose — BlazePose Full (upstream Google distribution).**
   Canonical source of the BlazePose Full pose-landmark model the
   `blazepose_full` identifier names. Distributed by Google under MediaPipe.
2. **MediaPipe Tasks Vision — Pose Landmarker (Full variant).** Successor
   packaging of the same BlazePose Full model weights and topology, exposed
   through MediaPipe Tasks Vision runtime.
3. **TensorFlow.js `@tensorflow-models/pose-detection` — BlazePose (Full).**
   TF.js wrapper exposing the same BlazePose Full weights through a
   browser/Node runtime compatible with the existing repo execution
   environment.

No in-repo stub, no synthetic landmark generator, no model substitution, and
no "BlazePose Lite" or "BlazePose Heavy" substitution qualifies — those
violate the pinned `LANDMARK_MODEL_ID = "blazepose_full"` contract and
Phase 22 F-6.

---

## §3 EXT-MODEL Compatibility Audit

Each candidate evaluated against the repo's binding contract:

| Requirement (source)                                                              | Cand. 1 MediaPipe Pose | Cand. 2 Tasks Vision Pose Landmarker (Full) | Cand. 3 TF.js BlazePose (Full) |
| --------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------- | ------------------------------ |
| `LANDMARK_MODEL_ID = "blazepose_full"` (`versions.ts:25`)                         | satisfied              | satisfied                                   | satisfied                      |
| Deterministic landmark output across identical inputs (Phase 0 / Phase 47 RP)     | satisfied              | satisfied                                   | satisfied                      |
| Replay-equivalent under pinned `landmarkModelVersion` (`buildCacheFingerprint`)   | satisfied              | satisfied                                   | satisfied                      |
| Non-stub, non-fabricated weights (Phase 22 F-6)                                   | satisfied              | satisfied                                   | satisfied                      |
| Producible landmark frames consumable by `runTempoPipeline` (`tempoPipeline.ts`)  | satisfied              | satisfied                                   | satisfied                      |

All three candidates are real, externally distributed, replay-deterministic,
and non-fabricated. Any one of the three satisfies EXT-MODEL acquisition.

---

## §4 EXT-MODEL Acceptance Mapping

Mapping to Phase 36 §3 acceptance requirements:

- **Pinned non-stub version string.** Acquisition replaces the current
  `"blazepose_full@0.0.0-stub"` pin at `src/lib/biomech/versions.ts:25` and
  the edge mirror in `supabase/functions/_shared/biomechFingerprint.ts` with
  a real distribution version string. Source provides a stable version
  identifier.
- **Deterministic landmark output.** All three candidates produce
  deterministic landmark output given identical pixel input and identical
  runtime configuration. Determinism is a property of the source model, not
  an in-repo claim.
- **Fingerprint stability across replay.** `buildCacheFingerprint` consumes
  `landmarkModelVersion` as a fixed string input; once the source-provided
  version is pinned, fingerprint output is replay-stable by construction
  per Phase 47 RP-1…RP-10.

---

## §5 EXT-CORPUS Source Inventory

Binding contract:

- `TempoValidationPair` schema at
  `src/lib/biomech/validation/tempoHarness.ts:18–25` requires `clip_id:
  string`, `predicted_sec: number`, `ground_truth_sec: number`.
- Ingestion via `parseTempoValidationCorpus` in
  `src/lib/biomech/validation/tempoCorpusIngestion.ts`.
- Floor of `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` for `status: "executed"`.

Real-world corpus source candidates:

1. **Instrumented in-house athlete capture cohort.** Athletes recorded under
   the existing `supabase/functions/analyze-video/**` intake path producing
   clips that satisfy `videoAcceptance.ts`, each clip externally labeled
   for `ground_truth_sec`.
2. **Partner / coach-supplied athlete clip cohort.** Externally sourced
   clips meeting `videoAcceptance.ts` constants, accompanied by externally
   measured `ground_truth_sec`.
3. **Public labeled motion datasets carrying the leg-lift → front-foot-strike
   event pair.** Only admissible where ground-truth timing of the two
   anchor events is externally measured and stable per clip, and where the
   underlying video satisfies `videoAcceptance.ts`.

No synthetic clips, no model-derived ground truth, no in-repo stub corpus,
and no fewer than 30 pairs qualify.

---

## §6 Athlete Capture Source Audit

Mapping candidate capture surfaces to `src/lib/biomech/videoAcceptance.ts`
constants and the `supabase/functions/analyze-video/**` intake path:

- `MIN_FPS = 24` — capture device must report `fps_true >= 24` post-probe.
- `MIN_WIDTH = 480`, `MIN_HEIGHT = 480` — frame resolution floor.
- `MIN_DURATION_SEC = 0.5`, `MAX_DURATION_SEC = 60` — duration window.
- `MAX_DROPPED_FRAME_RATIO = 0.34` — extraction tolerance.

Compatible real-world capture sources:

| Source                                                | FPS ≥ 24 | ≥480×480 | Duration ∈ [0.5, 60] s | Dropped ≤ 0.34 |
| ----------------------------------------------------- | -------- | -------- | ---------------------- | -------------- |
| Modern smartphone rear camera (default 30 / 60 fps)   | yes      | yes      | yes                    | yes            |
| Action camera (GoPro-class) 60+ fps mode              | yes      | yes      | yes                    | yes            |
| Mirrorless / DSLR video 24–60 fps                     | yes      | yes      | yes                    | yes            |
| High-frame-rate reference camera (≥120 fps)           | yes      | yes      | yes                    | yes            |

All four pass through the existing `supabase/functions/analyze-video/**`
intake unchanged. No new capture surface introduced.

---

## §7 Labeling Source Audit

`ground_truth_sec` must be measured **externally and independently of**
EXT-MODEL output. Acceptable real-world labeling sources:

1. **High-frame-rate reference camera frame-step.** A secondary camera
   capturing the same delivery at ≥120 fps, with a qualified human
   labeler frame-stepping to mark peak leg lift and front-foot strike, and
   computing `ground_truth_sec` as the inter-event interval at the
   reference fps.
2. **Manual frame-stepping by qualified human labeler on the primary
   clip.** Independent of EXT-MODEL output; labeler uses external tooling
   to mark the two anchor frames and derives `ground_truth_sec` from the
   probed `fps_true`.
3. **Externally instrumented timing.** Hardware timing signal (e.g.
   contact-mat / IMU) capturing front-foot-strike instant, paired with
   external visual marking of peak leg lift, producing `ground_truth_sec`
   independent of any pose model.

Inadmissible labeling sources (reject):

- EXT-MODEL's own `predicted_sec` recycled as ground truth.
- Any pose-model-derived ground truth (circular and forbidden by Phase 30).
- Athlete self-report.
- LLM-derived or AI-fabricated labels (Phase 22 F-6).

---

## §8 Corpus Compatibility Audit

Per-record contract from
`src/lib/biomech/validation/tempoCorpusIngestion.ts` and
`tempoHarness.ts:18–25`:

| Field             | Required type      | Source                                                                 |
| ----------------- | ------------------ | ---------------------------------------------------------------------- |
| `clip_id`         | non-empty string   | Assigned at intake; stable across replay; unique per clip.             |
| `predicted_sec`   | finite number      | Produced by `runTempoPipeline` consuming EXT-MODEL pose frames.        |
| `ground_truth_sec`| finite number      | Externally measured per §7; independent of EXT-MODEL.                  |

Corpus-level requirements:

- Root is a JSON array (`parseTempoValidationCorpus` rejects otherwise via
  `TempoCorpusParseError`).
- Cardinality `≥ MIN_LABELED_PAIRS_FOR_VALIDATION = 30`
  (`tempoHarness.ts`).
- Stable ordering and stable `clip_id`s for deterministic
  `corpus_fingerprint_hex`.

Real-world corpora satisfying §5 and §7 plus the above per-record contract
are compatible.

---

## §9 Corpus Acceptance Mapping

Mapping to Phase 36 §7:

- **Parses without `TempoCorpusParseError`.** Records that satisfy §8
  per-record contract pass `parseTempoValidationCorpus` unchanged.
- **Yields `status: "executed"`.** A corpus of ≥30 parsed pairs invokes
  `runTempoValidationHarness` past the
  `MIN_LABELED_PAIRS_FOR_VALIDATION` floor, producing `status:
  "executed"` per `tempoHarness.ts`.
- **Deterministic `corpus_fingerprint_hex`.** With stable `clip_id`,
  stable ordering, and finite numerics, the harness-emitted
  `corpus_fingerprint_hex` is reproducible across replay.

---

## §10 Earliest Evidence Package

Minimum real-world bundle to produce the first truth-supported `tempo_sec`
result:

1. **EXT-MODEL.** One acquired runtime from §2 candidates 1, 2, or 3,
   pinned at `versions.ts:25` and the edge mirror with its real
   distribution version string.
2. **EXT-CORPUS clips.** ≥ 30 athlete clips from §5/§6 sources, each
   passing `evaluateProbe` and `evaluateExtraction` in
   `videoAcceptance.ts`.
3. **Ground-truth labels.** ≥ 30 externally measured `ground_truth_sec`
   values per §7, one per clip, independent of EXT-MODEL.
4. **Predictions.** ≥ 30 `predicted_sec` values produced by
   `runTempoPipeline` (`src/lib/biomech/pipeline/tempoPipeline.ts`)
   consuming EXT-MODEL pose frames for the same clips.
5. **Assembled corpus.** JSON array of ≥ 30 records conforming to
   `TempoValidationPair`.

No additional artifact required.

---

## §11 Earliest Validation Event

The first deterministic invocation of `runTempoValidationHarness` over the
§10 assembled corpus that returns `status: "executed"` with finite
residuals, summary statistics, and a deterministic
`corpus_fingerprint_hex`. No new code; existing harness re-evaluates
deterministically on arrival.

---

## §12 Earliest Calibration Event

The first calibration certificate emitted from the §11
`TempoValidationReport`, consumed by the `confidence_calibration` gate path
already wired into `evaluateTempoGateMatrix`. No new code; existing
calibration path re-evaluates deterministically on arrival.

---

## §13 Earliest Promotion Event

The first deterministic transition of the `tempo_sec` six-gate matrix from
`missing` to `pass`/`fail` under `all_pass: true` via
`evaluateTempoGateMatrix` and `tempoEvidenceToTileState`, on the same
inputs. This is the first truth-supported `tempo_sec` metric event.

---

## §14 Release-1 Impact

The sourcing pattern (real upstream pose model + externally labeled
real-clip corpus + independent ground-truth) generalizes to any future
biomech metric that follows the Phase 31 / Phase 33 truth-support path.
Generalization is **out of scope** for Phase 37 and introduces no new
requirements, metrics, detectors, anchors, validation, calibration,
confidence, or gate definitions.

---

## §15 Final Determination

**EVIDENCE SOURCES IDENTIFIED.**

EXT-MODEL is acquirable from any of three real, externally distributed,
replay-deterministic, non-fabricated sources (§2). EXT-CORPUS is acquirable
from real athlete-capture cohorts under the existing intake path with
externally measured ground-truth labels (§5–§7). All sources map cleanly
to the existing repo acceptance contracts (§3–§4, §8–§9) and to the
earliest validation, calibration, and promotion events (§11–§13). Remaining
work is purely external acquisition governed by Phase 30 and classified as
non-implementation-blocking by Phases 29, 31 §9–§11, and 33 §10.
