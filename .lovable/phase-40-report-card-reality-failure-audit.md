# Phase 40 — Report Card Reality Failure Audit

Reality-only investigation of athlete-observed report-card failures across 20+
real test videos. No code, implementation, architecture, doctrine, metric,
detector, anchor, validation, calibration, confidence, or gate changes are
introduced. Citation-bound to Phases 19–39 and the existing read-only repo
surfaces (`src/lib/reportCard/**`, `src/lib/biomech/**`,
`supabase/functions/analyze-video/**`). No fabricated per-video evidence. No
proposed solutions.

---

## §1 Scope

- In scope: every athlete-facing tile produced by `src/lib/reportCard/**`,
  with the deterministic `tempo_sec` slice (Phases 25–27) as the canonical
  trace path through `src/lib/biomech/**`.
- Reality-only. The audit reports what the user observed on real athlete
  test videos and what the repository deterministically does with such
  inputs, no more.
- Cites prior audits Phases 19–39, in particular:
  - Phase 22 F-6 — D-POSE stub binding contract.
  - Phase 26 — `tempo_sec` metric engine + uncalibrated confidence.
  - Phase 27 — `tempo_sec` evidence → tile adapter.
  - Phase 29 — Release-1 exclusion of truth-supported metric promotion.
  - Phase 33 §10 / Phase 34 — confidence + calibration non-implementation-blocking classification.
  - Phase 37 — EVIDENCE SOURCES IDENTIFIED.
  - Phase 38 — EXECUTION PACKAGE COMPLETE.
  - Phase 39 — **NO REAL EVIDENCE ACQUIRED**.

## §2 Tested Video Inventory

- User-reported: 20+ real athlete videos uploaded through the live
  application and routed through `supabase/functions/analyze-video/**`.
- Sandbox-side reality: zero athlete clips, zero captured
  `videos.ai_analysis` rows, zero exported report-card screenshots, zero
  labeled `ground_truth_sec` values, zero `TempoValidationPair` records.
- Per Phase 39 §3, `videoAcceptance.ts` acceptance criteria
  (≥24 fps, ≥480×480, 0.5–60 s, ≤0.34 dropped frames) are not
  re-verifiable from sandbox; the 20+ count is recorded as athlete-side
  observation only, with no fabricated per-video record produced here.

## §3 Reported Athlete Failures

Verbatim user-observed failure modes:

1. Report cards frequently return **zero values** on tiles where the
   athlete saw real movement.
2. Report cards frequently **contradict visible video evidence**
   (e.g. plainly visible leg lift / front-foot strike not reflected in
   the tile output).
3. Outputs are **inconsistent across videos** of comparable movement.
4. Athlete-facing metrics **do not match observed movement**.

These four observations are treated as ground truth for the audit. They
are not fabricated; they are the user's stated reality from real testing.

## §4 Zero-Value Metric Audit

Trace of every place a "zero" can reach the athlete:

- `src/lib/biomech/metrics/tempoSec.ts::computeTempoSec` returns
  `value: null` (never numeric zero) when any of the following hold:
  - `peak_leg_lift_frame_index == null`
  - `front_foot_strike_frame_index == null`
  - `fps_true` non-finite or ≤ 0
  - `delta = strike − lift` non-integer or ≤ 0
- `src/lib/reportCard/metricReaders.ts::readNumber` returns `null` when
  the metric is missing or `missing: true`.
- `src/lib/reportCard/metricReaders.ts::missingState` returns
  `{ status: "missing", missing_reason }` — never `score100: 0`.
- `src/lib/biomech/reportCard/tempoTileAdapter.ts::tempoEvidenceToTileState`
  returns `{ status: "missing", missing_reason }` whenever
  `metric.missingness != null` or `metric.value == null` or the gate
  matrix is not fully passing (`gate_blocked:<gate>`).

**Deterministic conclusion.** Nothing in the metric or report-card code
path emits a numeric `0` as a tile value when the underlying signal is
absent. Every "zero" observed by the athlete is therefore one of:

- a `status: "missing"` tile rendered by the UI in a way the athlete
  reads as "0", or
- a `score_meter` tile whose `score100` was computed off a
  zero-or-near-zero reading derived from an upstream pipeline running
  on stub pose (`LANDMARK_MODEL_VERSION = @0.0.0-stub`, Phase 39 §2).

The zero is an athlete-visible **presentation** of canonical missingness
or stub-pose-derived numbers, not a fabricated metric.

## §5 Contradictory Metric Audit

Trace of contradictions vs visible movement:

- `LANDMARK_MODEL_VERSION` remains pinned at `@0.0.0-stub` in
  `versions.ts` / `biomechFingerprint.ts` (Phase 39 §2). The
  `pose_model_is_stub` missingness reason propagates through every
  anchor and detector that runs on its output.
- `peakLegLift.ts`, `frontFootStrike.ts`, and `plantDetector.ts` are
  deterministic functions of their pose-frame inputs. Given non-truth
  pose frames, they produce deterministic but non-truth anchor frame
  indices.
- `computeTempoSec` then produces a deterministic value from
  deterministic-but-non-truth anchors. The resulting `value` may pass
  the structural guard (`delta_frames > 0`) and round-trip cleanly,
  yet bear no relationship to the athlete's actual leg lift / strike
  timing — the canonical mechanism for "the tile shows a number that
  contradicts what I see in the video."
- Confidence per Phase 26 is `uncalibrated()` until a calibration
  certificate exists; Phase 39 §7 records no certificate issued
  (`status: "uncalibrated", reason: "no_corpus"`). Athletes therefore
  see metric values with no confidence band attached, increasing
  perceived contradiction.

## §6 Video → Landmark Audit

- Ingress through `supabase/functions/analyze-video/**` is wired and
  exercised on every uploaded video.
- The pose-extraction binding site consumes the model identified by
  `LANDMARK_MODEL_VERSION`. Per Phase 22 F-6 and Phase 39 §2, that pin
  is `@0.0.0-stub`. The shared fingerprint surface
  (`supabase/functions/_shared/biomechFingerprint.ts`) records the
  stub identity into every emitted record.
- Consequence: the landmarks reaching the detectors are **not real
  human pose estimates**. The break in the truth chain is here, at the
  D-POSE binding, not downstream.

## §7 Landmark → Detector Audit

- `peakLegLift.ts` (D-3) selects a frame from the pose-frame stream
  via deterministic geometric criteria.
- `frontFootStrike.ts` (D-3 / D-4 via embedded D-PLANT) selects the
  first plant frame using `plantDetector.ts` over the same stream.
- Both detectors are correct under valid input and emit canonical
  missingness when geometric prerequisites fail.
- Under stub pose, the detectors still execute and either:
  (a) emit canonical missingness (→ §4 path), or
  (b) emit a deterministic but spurious frame index (→ §5 path).

No fault is observable in the detector logic itself.

## §8 Detector → Metric Audit

- `computeTempoSec` is a pure function of three numbers
  (`peak_leg_lift_frame_index`, `front_foot_strike_frame_index`,
  `fps_true`). It is byte-deterministic and rounds to 6 decimals to
  preserve `numeric(12,6)` round-trip equivalence.
- Sibling metric engines under `src/lib/biomech/metrics/**` follow
  the same shape: pure function over anchor / detector outputs,
  canonical missingness on absent antecedents, no fabrication.

The metric layer is **not** the break point. Its outputs are only as
truthful as the anchors it consumes, which are only as truthful as the
pose frames they consume, which are stub.

## §9 Metric → Report Card Audit

- `src/lib/reportCard/index.ts::getReportCardSpec` selects the spec by
  `sport` + `module`.
- `tile.compute(analysisLike)` reads from `analysis.metrics[*]` via
  `metricReaders.ts`. When the metric is absent or `missing: true`,
  the tile receives `{ status: "missing", missing_reason? }`.
- `src/hooks/useReportCardTrend.ts` reads `videos.ai_analysis` only,
  surfaces `hasMetrics = false` when the structured `metrics` object
  is empty, and returns `grade: null` in that case — never a
  fabricated grade.

The report-card layer faithfully renders whatever the metric layer
produced. No fault is observable here either.

## §10 Report Card → UI Audit

- Tile components render three categorically different states through
  visually similar surfaces:
  1. Canonical missingness (`status: "missing"`, with or without
     `missing_reason`).
  2. Gate-blocked (`status: "missing"`, `missing_reason: "gate_blocked:<gate>"` per Phase 27 adapter).
  3. Numeric value rendered with no confidence band (Phase 26
     uncalibrated path).
- From the athlete's perspective all three collapse into "no real
  answer" — frequently perceived as "zero", "broken", or
  "contradicting the video". The UI layer does not currently
  distinguish missingness from stub-derived numbers from
  gate-blocked-but-computed states in a way that an athlete can
  parse.

## §11 Failure Classification Matrix

| Reported failure (§3) | Mechanism | Where in chain |
|---|---|---|
| Frequent zeros | Canonical missingness rendered as "0" by the tile surface | §4, §10 |
| Contradicts visible video | Deterministic detector output over stub pose frames | §5, §6, §7 |
| Inconsistent across videos | Stub pose produces frame-by-frame non-truth landmarks; downstream determinism amplifies input noise into output drift | §6, §7 |
| Metrics not matching observed movement | Whole chain is structurally non-truth-supported per Phase 39 final determination | §6 (root) |

All four trace to the Phase 39 blocker set.

## §12 Root Cause Ranking

1. **`LANDMARK_MODEL_VERSION = @0.0.0-stub`** — D-POSE not acquired
   (Phase 37 sources identified, Phase 39 not acquired). Dominant
   cause; structurally explains all four reported failure modes.
2. **Zero labeled `TempoValidationPair` records** —
   `MIN_LABELED_PAIRS_FOR_VALIDATION = 30` unmet (Phase 39 §4); no
   validation can refute or confirm any per-video output.
3. **No calibration certificate** — `generateTempoCalibrationCertificate`
   returns `status: "uncalibrated", reason: "no_corpus"` (Phase 39 §7).
   Athlete-facing metrics carry no calibrated confidence.
4. **UI surface ambiguity** — missingness, gate-blocked, and
   stub-derived numeric states collapse to indistinguishable
   athlete-visible outcomes (§10). Secondary to root cause #1 but
   responsible for the specific "zero" perception in §3.

## §13 Release-1 Impact

Out of scope per Phase 29 §10 and Phase 33 §10. Report-card
truth-supported promotion remains blocked by Phase 39
**NO REAL EVIDENCE ACQUIRED**. No Release-1 surface depends on
truth-supported `tempo_sec` or any sibling biomech metric for launch
eligibility.

## §14 Required Missing Evidence

To convert this audit's determination, the following must exist
(none present in sandbox):

- Real BlazePose Full (or Phase 37-audited equivalent) non-stub
  weights bound at the D-POSE site, retiring `pose_model_is_stub`.
- Real athlete clips meeting `videoAcceptance.ts` constants
  (≥24 fps, ≥480×480, 0.5–60 s, ≤0.34 dropped frames).
- ≥30 independent `ground_truth_sec` labels per Phase 37 §7
  (never model-derived).
- Real `runTempoPipeline` outputs paired with those labels into
  `TempoValidationPair` records.
- A captured per-video evidence packet for each of the 20+ tested
  videos: `video_sha256_hex`, the emitted `ai_analysis` row, the
  rendered tile state at observation time, and the athlete's
  reported discrepancy. This per-video corpus is the only artifact
  that would let a future phase rank failure modes per-video rather
  than per-chain.

## §15 Final Determination

**MEASUREMENT PIPELINE NOT WORKING.**

Justification. The deterministic chain from detectors through metric
engines through report-card readers through tile state is observably
correct under the read-only audit (§7–§9). The chain is, however,
structurally starved at its head: the D-POSE binding remains
`@0.0.0-stub` (Phase 39 §2), no labeled corpus exists (Phase 39 §4),
no calibration certificate exists (Phase 39 §7), and the UI layer
collapses missingness, gate-blocked, and stub-derived states into a
single athlete-visible surface (§10). The athlete-reported
behavior — frequent zeros, contradictions with visible movement, and
cross-video inconsistency — is the expected, deterministic
manifestation of running a correct downstream chain on non-truth
pose inputs and rendering the result through a tile layer that
cannot disambiguate "no value" from "stub-derived value" from
"gate-blocked value". The truth chain breaks at the D-POSE binding
and is amplified by the UI presentation layer; every link in
between is sound.
