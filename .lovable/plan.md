## Phase 40 — Report Card Reality Failure Audit

Create exactly one new file: `.lovable/phase-40-report-card-reality-failure-audit.md`. No code, implementation, architecture, doctrine, metric, detector, anchor, validation, calibration, confidence, or gate changes. Reality-only, citation-bound to Phases 19–39 and existing repo surfaces.

### Reality Constraint

The sandbox holds no athlete test artifacts from the user's 20+ real-video session — no captured clips, no `videos.ai_analysis` rows, no exported report-card screenshots, no labeled ground truth. The audit will therefore record the user-reported behavior (zeros, contradictions, inconsistency) as observed athlete-side reality, and trace the truth chain through the actual repo surfaces to identify exactly where the break occurs, without fabricating per-video numbers.

### Sections (all 15, in order)

- **§1 Scope** — tempo_sec plus all report-card tiles in `src/lib/reportCard/**`; reality-only; cites Phases 19–39 (esp. Phase 39 NO REAL EVIDENCE ACQUIRED).
- **§2 Tested Video Inventory** — user-reported 20+ real athlete videos; sandbox holds zero artifacts; inventory recorded as athlete-side observation only, no fabricated per-video records.
- **§3 Reported Athlete Failures** — verbatim user-observed failure modes: frequent zero values, contradictions vs visible movement, inconsistency across videos, athlete-facing metrics not matching observed motion.
- **§4 Zero-Value Metric Audit** — trace zero/null paths through `metricReaders.ts::readNumber` → `missingState`, `tempoSec.ts` missingness branches, `tempoTileAdapter.ts` `status: "missing"` returns. Identify where canonical missingness ("no value") is being rendered/perceived as a zero.
- **§5 Contradictory Metric Audit** — trace contradiction sources: `LANDMARK_MODEL_VERSION = @0.0.0-stub` (Phase 39 §2), `pose_model_is_stub` propagation, anchor detectors operating on stub pose, uncalibrated confidence (Phase 26), absent calibration certificate (Phase 39 §7).
- **§6 Video → Landmark Audit** — `supabase/functions/analyze-video/**` ingestion → pose extraction binding sites; D-POSE is stub per Phase 22 F-6 / Phase 39 §2; landmarks emitted are not real human pose estimates.
- **§7 Landmark → Detector Audit** — `peakLegLift.ts`, `frontFootStrike.ts`, `plantDetector.ts` operating on stub landmarks; detectors are deterministic but inputs are non-truth.
- **§8 Detector → Metric Audit** — `computeTempoSec` + sibling metric engines; pure functions, byte-deterministic; output validity bounded by detector/anchor validity which is bounded by stub pose.
- **§9 Metric → Report Card Audit** — `getReportCardSpec` → `tile.compute(analysisLike)` → `readNumber`/`missingState`; `useReportCardTrend.ts` reads `videos.ai_analysis.metrics` and surfaces `grade: null` when metrics absent; tiles render `status: "missing"` when reader returns null.
- **§10 Report Card → UI Audit** — tile rendering paths; missing tiles, gate-blocked tiles (`gate_blocked:*`), and stub-pose tiles all collapse to the same athlete-visible "missing/zero/contradictory" surface because no truth-supported metric exists (Phase 39 final determination).
- **§11 Failure Classification Matrix** — classify each reported failure: (a) stub-pose root, (b) missingness-rendered-as-zero presentation, (c) gate-blocker presentation, (d) absent calibration → confidence omitted, (e) no labeled corpus → no validation. All trace to Phase 39 blockers.
- **§12 Root Cause Ranking** — ranked: (1) `LANDMARK_MODEL_VERSION @0.0.0-stub` (D-POSE not acquired, Phase 37/39), (2) zero labeled `TempoValidationPair` records (Phase 39 §4), (3) no calibration certificate (Phase 39 §7), (4) UI surface ambiguity between "missing", "gate-blocked", and athlete-perceived "zero". Root cause #1 dominates and structurally explains all four reported failure modes.
- **§13 Release-1 Impact** — out of scope per Phase 29 §10 / Phase 33 §10; report-card truth-supported promotion remains blocked by Phase 39 NO REAL EVIDENCE ACQUIRED.
- **§14 Required Missing Evidence** — the four Phase 39 external-acquisition blockers (real BlazePose Full weights, real athlete clips meeting `videoAcceptance.ts`, ≥30 independent `ground_truth_sec` labels, real `runTempoPipeline` outputs), plus a captured per-video evidence packet (clip hash + emitted `ai_analysis` row + rendered tile state) for each of the 20+ tested videos — none of which exist in sandbox.
- **§15 Final Determination** — **MEASUREMENT PIPELINE NOT WORKING**. Justification: pure deterministic chain downstream of D-POSE is correct, but D-POSE itself is stubbed at `@0.0.0-stub`, so every athlete-facing metric is structurally non-truth-supported; observed zeros/contradictions/inconsistency are the expected athlete-visible manifestation of a stub-pose pipeline rendered through a tile layer whose "missing" and "gate-blocked" surfaces are indistinguishable from "zero" at the UI.

### Constraints

Exactly one new file. No code. No implementation. No fabricated per-video data. No proposed solutions. Truth-chain break identified at D-POSE binding (stub) propagating through deterministic-but-input-starved detectors/metrics into a UI that cannot disambiguate missingness from zero.
