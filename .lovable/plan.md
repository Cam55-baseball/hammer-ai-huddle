# Phase 26 — First Executable Report Card Slice: Partial Honest Scaffold

## Selected metric (per Phase 25 §2 selection criteria)

**`tempo_sec`** on the **Baseball Pitching (`bp`)** Report Card tile (`tempo`):

1. Detector dependencies named in `canonical-build-plan.md §2`: D-POSE, D-PLANT.
2. Anchors named in existing methodology / contract prompts: `peak_leg_lift_frame`, `front_foot_strike_frame`.
3. Contract field exists in `src/lib/reportCard/contracts/bp.contract.ts` (`tempo_sec`, range 0.4–2.0s).
4. One of the 30 inventory metrics; tile spec already in `src/lib/reportCard/disciplines/bp.ts`.

Definition: `tempo_sec = (front_foot_strike_frame_index − peak_leg_lift_frame_index) / fps_true`.

## What this slice honestly implements (no fabricated certainty)

End-to-end deterministic pipeline scaffold for one metric, with every layer that can be implemented today implemented in pure deterministic code, and every layer that requires absent inputs (non-stub pose model, labeled corpus, calibration certificate) wired to emit **canonical missingness** rather than fabricated values.

### Files to create

```
src/lib/biomech/
  anchors/
    peakLegLift.ts            D-3 anchor extractor (consumes pose frames; missing when pose stub)
    frontFootStrike.ts        D-3 anchor extractor (consumes plant detector; missing when D-PLANT absent)
  detectors/
    plantDetector.ts          D-PLANT skeleton; emits `front_foot_first_contact_missing` until pose non-stub
  metrics/
    tempoSec.ts               D-5 pure metric engine: (strike − lift) / fps_true
    missingness.ts            canonical missingness reason enum (from arch §Missingness rules)
    confidence.ts             confidence emitter with explicit "uncalibrated" state (no fabrication)
  evidence/
    tempoEvidence.ts          D-6 lineage-bound artifact shape (video_sha256, fps_true, anchor frame indices,
                              engine_version, cache_fingerprint, missingness, confidence_status)
  validation/
    tempoHarness.ts           harness consuming (predicted, ground_truth) pairs → residual records
                              (executes deterministically over empty corpus → emits "no_corpus" status)
  calibration/
    tempoCalibration.ts       certificate generator skeleton; refuses to emit a certificate without ≥N labeled
                              residuals (per cal §3.2) → emits CalibrationStatus.uncalibrated
  gates/
    tempoGate.ts              per-gate emitter consuming {value, confidence_status, missingness, calibration_status};
                              emits gate decision conforming to canonical-production-gate-matrix
  __tests__/
    tempoSec.test.ts          determinism + boundary + missingness paths
    peakLegLift.test.ts       deterministic anchor selection + missingness on empty pose
    frontFootStrike.test.ts   deterministic + missingness on absent D-PLANT
    tempoEvidence.test.ts     lineage-bound artifact byte-stable across repeated runs
    tempoHarness.test.ts      empty-corpus → no_corpus; non-empty → deterministic residuals
    tempoCalibration.test.ts  refuses certificate when residuals < required N
    tempoGate.test.ts         gate decision matrix (pass/fail/block) on (calibrated, uncalibrated, missing) inputs

.lovable/phase-26-implementation-report.md
```

### Files NOT modified

- `src/lib/biomech/versions.ts` — D-POSE stub pin (`@0.0.0-stub`) stays. Replacing it requires a real Blazepose-Full integration outside this slice.
- `src/lib/reportCard/contracts/bp.contract.ts` — contract is already correct.
- `src/lib/reportCard/disciplines/bp.ts` — tile already reads `tempo_sec`, surfaces missingness via `missingState`, surfaces confidence. The athlete-facing surface for the chosen metric is already correct.
- `supabase/functions/analyze-video/index.ts` — wiring the new deterministic chain into the edge function is explicitly deferred until D-POSE is non-stub; wiring it now would require pose data that doesn't exist and would force fabricated metric values.
- `src/hooks/useReportCardTrend.ts` — read path is already correct (consumes `ai_analysis.metrics.tempo_sec`).

### Determination

`IMPLEMENTATION PARTIALLY COMPLETE`.

### Blockers enumerated in the report

- D-POSE non-stub model integration (`versions.ts` still `@0.0.0-stub`).
- D-PLANT real implementation (currently emits structural missingness).
- Labeled ground-truth corpus for tempo (does not exist in repo).
- Calibration certificate (cannot be honestly derived without corpus).
- Confidence calibration mapping (cannot be derived without corpus).
- Edge-function wiring (deferred until upstream stubs replaced).

The report will list, for each F-1…F-9 blocker, whether the slice retires it for `tempo_sec` (full / partial / not retired) with the exact remaining preconditions cited to `canonical-build-plan.md`, `canonical-verification-audit.md`, `canonical-production-readiness-audit.md`.

## Constraints respected

- No fabricated validation evidence.
- No fabricated calibration evidence.
- No fabricated confidence values (explicit `uncalibrated` status emitted instead).
- No new metrics, detectors, anchors, validation requirements, calibration requirements, confidence requirements, or production gates introduced.
- No doctrine or architecture changes.
- No DB migrations.
- No edits to auto-generated files or `supabase/config.toml`.
