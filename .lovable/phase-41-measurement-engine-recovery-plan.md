# Phase 41 — Measurement Engine Recovery Plan (Reality Acquisition Audit)

**Status:** Reality-only gap inventory. No code, implementation, architecture, doctrine, metric, detector, validation methodology, or calibration methodology changes.
**Scope of citations:** `src/lib/biomech/**`, `src/lib/reportCard/**`, `supabase/functions/analyze-video/**`, `supabase/functions/_shared/**`, plus Phase 39 and Phase 40 audits.

---

## §1 Executive Summary

Phase 39 (`.lovable/phase-39-real-evidence-acquisition-execution.md`) determined: **NO REAL EVIDENCE ACQUIRED**.
Phase 40 (`.lovable/phase-40-report-card-reality-failure-audit.md`) determined: **MEASUREMENT PIPELINE NOT WORKING** — the deterministic chain downstream of D-POSE is sound, but D-POSE itself is stub-pinned, no labeled corpus exists, no calibration certificate exists, and the athlete UI cannot disambiguate "missing" from "stub-derived" from "gate-blocked".

Phase 41 does not propose, redesign, or fix anything. It enumerates, with file-path citations, every external dependency, acquisition gap, integration gap, missing artifact, and missing proof item that must exist before the report-card measurement system can legitimately be considered operational. This is a recovery-planning inventory, not a recovery execution.

---

## §2 Measurement Chain Inventory

End-to-end measurement chain, with the file(s) that own each link:

| # | Link | Repo surface |
|---|------|--------------|
| 1 | Video acceptance | `src/lib/biomech/videoAcceptance.ts`, `src/lib/biomech/probeVideoMetadata.ts`, `src/lib/biomech/frameExtractionDeterministic.ts` |
| 2 | Landmark contract | `src/lib/biomech/versions.ts`, `supabase/functions/_shared/biomechFingerprint.ts` (contract only; no producer) |
| 3 | Detectors | `src/lib/biomech/detectors/plantDetector.ts` |
| 4 | Anchors | `src/lib/biomech/anchors/peakLegLift.ts`, `src/lib/biomech/anchors/frontFootStrike.ts` |
| 5 | Metrics | `src/lib/biomech/metrics/tempoSec.ts` |
| 6 | Pipeline orchestration | `src/lib/biomech/pipeline/tempoPipeline.ts` |
| 7 | Validation | `src/lib/biomech/validation/**`, `src/lib/biomech/gates/tempoGateMatrix.ts` |
| 8 | Calibration | `src/lib/biomech/calibration/**` |
| 9 | Evidence / fingerprint | `src/lib/biomech/evidence/tempoEvidence.ts`, `src/lib/biomech/auditTrail.ts`, `src/lib/biomech/fingerprint.ts` |
| 10 | Replay equivalence | `src/lib/biomech/replay/tempoReplay.ts` |
| 11 | Report-card readers / tile adapter | `src/lib/reportCard/metricReaders.ts`, `src/lib/reportCard/**` (tempo tile adapter) |
| 12 | Athlete UI | Tile renderers surfaced from the report-card spec |
| 13 | Server pathway | `supabase/functions/analyze-video/index.ts`, `supabase/functions/_shared/recordAnalysisRun.ts`, `supabase/functions/_shared/biomechFingerprint.ts` |

---

## §3 First Broken Link

**Earliest break: the landmark producer (link #2).**

Evidence:
- `src/lib/biomech/versions.ts` pins `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`. The `@0.0.0-stub` suffix is the explicit contract that no real model is bound.
- `supabase/functions/_shared/biomechFingerprint.ts` mirrors the same stub pin byte-identically.
- `package.json` declares **zero** pose-inference dependencies (no `@mediapipe/*`, no `@tensorflow/*`, no ONNX/WASM pose loader).
- `runTempoPipeline` (`src/lib/biomech/pipeline/tempoPipeline.ts`) is referenced only from `src/lib/biomech/replay/tempoReplay.ts`, `src/lib/biomech/gates/tempoGateMatrix.ts`, and `src/lib/biomech/__tests__/**` — **never** from any file under `supabase/functions/**`.
- `supabase/functions/analyze-video/index.ts` (2,643 lines) references `LANDMARK_MODEL_VERSION` only as a metadata tag emitted onto analysis records (~lines 1718, 1736, 1763, 1823, 2456, 2482, 2499, 2612). It performs no video decode, no frame sampling, no pose inference, and no pipeline invocation.

Downstream propagation (Phase 40 §4–§10): stub/absent landmarks → detectors execute on empty input and emit canonical missingness → anchors yield missingness → `computeTempoSec` returns missingness with `pose_model_is_stub` lineage → tempo tile adapter renders `status: "missing"` → `metricReaders.ts::readNumber`/`missingState` collapse missing / stub-derived / gate-blocked into a single athlete-visible surface (Phase 40 §10).

---

## §4 External Acquisition Inventory

Artifacts required but currently absent from the repository:

1. **Pose-estimation model asset and binding.** Replacement for `blazepose_full@0.0.0-stub` plus the runtime that loads it. Neither weight file nor loader exists in `src/` or `supabase/functions/**`.
2. **Athlete video corpus** satisfying `src/lib/biomech/videoAcceptance.ts` thresholds (`MIN_FPS`, `MIN_WIDTH`, `MIN_HEIGHT`, `MIN_DURATION_SEC`, `MAX_DURATION_SEC`, `MAX_DROPPED_FRAME_RATIO`). Sandbox holds zero such clips.
3. **Labeled validation corpus.** `TempoValidationPair` records ≥ `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` (Phase 39 §4). Current corpus surface is `EMPTY_TEMPO_CORPUS`.
4. **Calibration corpus and certificate.** `generateTempoCalibrationCertificate` currently returns `status: "uncalibrated", reason: "no_corpus"` (Phase 39 §7); no signed certificate, no `certificate_sha256_hex`.
5. **Evidence packets for the user's 20+ tested videos.** No captured clips, no `videos.ai_analysis` rows preserved for audit, no exported report-card screenshots, no labeled ground truth (Phase 40 §2).
6. **Per-video ground-truth annotations.** Peak-leg-lift frame, front-foot-strike frame, and tempo label per clip — required to populate `TempoValidationPair` records.

---

## §5 Current State vs Required State

| Layer | Current State | Required State | Evidence Present? | Evidence Missing? |
|-------|---------------|----------------|-------------------|-------------------|
| Video acceptance | Pure deterministic gate (`videoAcceptance.ts`) | Same, exercised against real athlete uploads | Code only | Acceptance records for the 20+ tested videos |
| Landmark producer | Contract + stub pin only (`versions.ts`, `biomechFingerprint.ts`) | Real model bound + invoked on accepted frames | None | Model asset, loader, invocation site |
| Detectors | Pure code (`detectors/plantDetector.ts`) | Same, executed on real landmark stream | Code only | Real input frames |
| Anchors | Pure code (`anchors/peakLegLift.ts`, `anchors/frontFootStrike.ts`) | Same, executed on real landmark stream | Code only | Real input frames |
| Metrics | Pure code (`metrics/tempoSec.ts`) | Same, fed by real anchor indices | Code only | Real anchor outputs |
| Pipeline orchestration | `runTempoPipeline` exists | Invoked from production path | Code only | Production call site |
| Validation | Harness + `EMPTY_TEMPO_CORPUS` only | `runTempoValidationHarness` exits `no_corpus` with `status: "executed"` | None | ≥30 `TempoValidationPair` records |
| Calibration | `status: "uncalibrated"` | Signed certificate with `certificate_sha256_hex` | None | Calibration corpus + run |
| Evidence packet | `tempoEvidence.ts` builder exists | Per-video lineage-complete packet with `cache_fingerprint_hex` + `evidence_sha256_hex` | Builder only | Real packets |
| Replay | `tempoReplay.ts` test harness | Replay equivalence proof at pinned engine_version + reasoning_version | Test-only | Production replay records |
| Report-card adapter | `metricReaders.ts` + tempo tile adapter | Same, disambiguating missing / stub / gate-blocked | Code | Truth-supported metric to read |
| Athlete UI | Tile renderers | Same, surfacing distinct states | Renderers | Truth-supported tile state |
| Server pipeline | `analyze-video/index.ts` tags only | Decodes video, calls landmark producer, runs pipeline, persists packet | Metadata tags | Decode, inference, persistence, integration |

---

## §6 Validation Inventory

Artifacts required before athlete-facing deployment can be justified (none currently present):

- Labeled `TempoValidationPair` corpus ≥ `MIN_LABELED_PAIRS_FOR_VALIDATION` (Phase 39 §4).
- `runTempoValidationHarness` execution with `status: "executed"` (currently returns `status: "no_corpus"`).
- Per-metric tolerance evidence (observed vs labeled tempo deltas).
- Replay-equivalence proof under pinned `engine_version` + `reasoning_version` via `src/lib/biomech/replay/tempoReplay.ts` against real packets, not fixtures.
- Contradiction-lineage records captured during validation.
- Gate-evaluation result from `src/lib/biomech/gates/tempoGateMatrix.ts` with `status: "executed"` (Phase 39 §9).
- Per-video evidence binding via `cache_fingerprint_hex` and `evidence_sha256_hex`.

---

## §7 Calibration Inventory

Artifacts required before athlete-facing deployment can be justified (none currently present):

- Calibration corpus distinct from the validation corpus.
- Calibration run execution against that corpus.
- Signed calibration certificate carrying `certificate_sha256_hex` (Phase 39 §7).
- Confidence model bound to real measurements, replacing `uncalibrated()` per Phase 26.
- Recalibration cadence record (when, against what corpus, who signed).
- Cache fingerprint binding (`cache_fingerprint_hex`) tying calibration to pinned `LANDMARK_MODEL_VERSION` + `DETECTOR_VERSION` + `METRIC_ENGINE_VERSION` per the contract in `supabase/functions/_shared/biomechFingerprint.ts`.

---

## §8 Evidence Packet Specification

For a single athlete video to become a truth-supported measurement record, the packet must carry:

1. Source video bytes with `video_sha256_hex`.
2. Probed metadata: `fps_true`, width, height, duration_sec, dropped-frame ratio.
3. Frame-extraction record (requested vs captured frames, deterministic ordering).
4. `LANDMARK_MODEL_VERSION` not ending in `-stub`.
5. Emitted pose-frame stream covering the analyzed interval.
6. Anchor frame indices (`peak_leg_lift_frame_index`, `front_foot_strike_frame_index`) with `missingness` and `source_model` lineage.
7. Detector outputs (`plantDetector`) with lineage.
8. Metric output from `computeTempoSec` including `value`, `unit`, `missingness`, `confidence`, full `lineage`.
9. Replay re-execution result establishing byte-equivalence at the pinned engine versions.
10. Validation pair entry referencing this video's ground-truth label.
11. Calibration certificate reference (`certificate_sha256_hex`).
12. `cache_fingerprint_hex` per `buildCacheFingerprint` contract in `supabase/functions/_shared/biomechFingerprint.ts`.
13. `evidence_sha256_hex` over the assembled packet.
14. Gate-evaluation result with `status: "executed"`.
15. Report-card tile state derived from the metric output.
16. Athlete-facing rendering record (what the athlete actually saw).

---

## §9 Operational Readiness Matrix

| Layer | Status | Citation |
|-------|--------|----------|
| D-POSE producer | NOT STARTED | `versions.ts` `@0.0.0-stub`; no loader in `package.json`; no invocation in `supabase/functions/**` |
| Landmark persistence | NOT STARTED | No writer path for pose-frame rows in `supabase/functions/**` or `src/` |
| Detectors | PARTIAL | `detectors/plantDetector.ts` present; input-starved (no producer) |
| Anchors | PARTIAL | `anchors/peakLegLift.ts`, `anchors/frontFootStrike.ts` present; input-starved |
| Metrics | PARTIAL | `metrics/tempoSec.ts` present; input-starved |
| Pipeline orchestration | PARTIAL | `runTempoPipeline` present; not called from production |
| Validation | NOT STARTED | `EMPTY_TEMPO_CORPUS`; Phase 39 §4 |
| Calibration | NOT STARTED | `status: "uncalibrated"`; Phase 39 §7 |
| Evidence packet emission | NOT STARTED | Builder exists, no production emission |
| Report-card adapter | PARTIAL | `metricReaders.ts` collapses missing / stub / gate-blocked (Phase 40 §10) |
| Athlete UI | PARTIAL | Renderers exist; cannot disambiguate states |
| Server pipeline integration | NOT STARTED | `analyze-video/index.ts` tags only, no pipeline call site |

---

## §10 Measurement Engine Readiness Determination

- **D-POSE:** NOT READY (stub-pinned, no model, no invocation).
- **Landmark layer:** NOT READY (no producer, no persistence).
- **Detector layer:** CODE-READY / INPUT-STARVED.
- **Anchor layer:** CODE-READY / INPUT-STARVED.
- **Metric layer:** CODE-READY / INPUT-STARVED.
- **Validation layer:** NOT READY (empty corpus; harness exits `no_corpus`).
- **Calibration layer:** NOT READY (no certificate; confidence remains `uncalibrated()`).
- **Report Card:** NOT READY (cannot surface truth-supported tiles because no truth-supported metric exists, and missing/stub/gate-blocked collapse on the read path).

---

## §11 Release Blocking Inventory

Ranked by severity (most blocking first):

1. **No real pose model bound** (`LANDMARK_MODEL_VERSION = blazepose_full@0.0.0-stub`) — blocks every downstream link.
2. **No pose-inference invocation site in production** — even if a model existed, nothing would call it (`supabase/functions/analyze-video/index.ts` has no pipeline import).
3. **No labeled validation corpus** — blocks `runTempoValidationHarness` from exiting `no_corpus` (Phase 39 §4).
4. **No calibration certificate** — blocks confidence emission above `uncalibrated()` (Phase 26, Phase 39 §7).
5. **No evidence-packet pipeline** — blocks per-video truth records (§8).
6. **Report-card UI ambiguity** — missing / stub-derived / gate-blocked collapse to the same athlete-visible surface (Phase 40 §10); blocks athlete-truth surfacing even after upstream is fixed.
7. **No captured evidence for the 20+ user-tested videos** — blocks reality post-mortem (Phase 40 §2).

---

## §12 Final Determination

**CAN ATHLETE-FACING MEASUREMENTS BE TRUSTED TODAY? NO.**

Supporting citations:
- Stub-pinned landmark contract: `src/lib/biomech/versions.ts`, `supabase/functions/_shared/biomechFingerprint.ts`.
- Absent producer / absent invocation site: Phase 40 §6 plus the chain audit in §2–§3 above (`supabase/functions/analyze-video/index.ts` carries no pipeline import; `runTempoPipeline` callers are limited to `replay/`, `gates/`, and `__tests__/`).
- Empty validation corpus: Phase 39 §4 (`EMPTY_TEMPO_CORPUS`, `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` unmet).
- Absent calibration certificate: Phase 39 §7 (`status: "uncalibrated", reason: "no_corpus"`).
- Uncalibrated confidence: Phase 26 contract surfaced through `metrics/tempoSec.ts`.
- Report-card adapter collapsing missingness to athlete-visible zero/contradiction: `src/lib/reportCard/metricReaders.ts` (`readNumber`, `missingState`), Phase 40 §10.

No fixes, recommendations, or future architecture are proposed by this document. It records only the gap between current repository reality and a truth-supported measurement engine.
