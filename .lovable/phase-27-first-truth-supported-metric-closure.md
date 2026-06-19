# Phase 27 — First Truth-Supported Metric Closure

Authority: Phase 26 (`.lovable/phase-26-implementation-report.md`), Phase 23
(`.lovable/report-card-root-blocker-decomposition-audit.md`), Phase 21
(`.lovable/report-card-metric-truth-closure-audit.md`).

Scope: advance the Phase 26 `tempo_sec` slice as far as the existing
repository and canonical doctrine honestly permit, by retiring every
blocker that is **retirable in code today**. No fabricated evidence,
calibration, confidence, or synthetic ground-truth corpus was produced.

---

## §1 Blocker Audit and Retirement Classification

Every blocker carried forward from Phase 26 §10 and Phase 23 §§5/§8 has
been re-evaluated under Phase 27 constraints. The classification key is:

- **R-CODE** — retirable in code today using existing repository assets.
- **R-REPO** — retirable using assets already in the repository (no new
  external data).
- **EXT-EVIDENCE** — requires evidence not present in the repository.
- **EXT-CORPUS** — requires a labeled ground-truth corpus that does not
  exist in the repository (`val §6.2 H2`).
- **EXT-MODEL** — requires a non-stub model integration
  (`canonical-build-plan.md §2 D-POSE`; `versions.ts:24-26`).

### §1.1 Phase 26 §10 outstanding blockers

| ID | Blocker (verbatim from Phase 26 §10) | Class | Retired in Phase 27? |
|----|--------------------------------------|-------|----------------------|
| 26-1 | D-POSE non-stub model (`versions.ts` pinned `blazepose_full@0.0.0-stub`) | EXT-MODEL | **Not retired** |
| 26-2 | D-PLANT real implementation (requires D-POSE) | EXT-MODEL | **Not retired** |
| 26-3 | Labeled ground-truth corpus for `tempo_sec` (`val §6.2 H2`) | EXT-CORPUS | **Not retired** |
| 26-4 | Calibration certificate (`cal §3.2`), derivable only from 26-3 | EXT-CORPUS | **Not retired** |
| 26-5 | Calibrated confidence mapping (`conf §Detector D-PLANT`), derivable only from 26-4 | EXT-CORPUS | **Not retired** |
| 26-6 | Edge-function wiring (`supabase/functions/analyze-video/index.ts`) | R-CODE in part / EXT-MODEL in part | **Not retired** — wiring the deterministic `tempo_sec` chain into the AI edge function before 26-1 is resolved would require either fabricating a value (forbidden by Phase 22 F-2) or routing through the AI prompt (re-introducing F-1 AI-only dependency). The honest read-only adapter that **does not** require fabrication has been implemented instead (see §2.4). |

### §1.2 Phase 26 §9 F-1…F-9 retirement progression

| F-# | Blocker | Phase 26 status | Phase 27 status | Change |
|-----|---------|-----------------|-----------------|--------|
| F-1 | No deterministic evidence layer | Partially retired | **Partially retired (advanced)** — full deterministic D-3 → D-4 → D-5 → D-6 chain now wired through a single orchestrator (`src/lib/biomech/pipeline/tempoPipeline.ts`); replay-equivalence harness proves bit-stability of the chain (`src/lib/biomech/replay/tempoReplay.ts`). Upstream D-2 still stub. | Wiring depth |
| F-2 | Placeholder / AI-only outputs | Retired (structural) | **Retired (structural, reinforced)** — the read-only report-card adapter (`src/lib/biomech/reportCard/tempoTileAdapter.ts`) refuses to fabricate confidence and refuses to emit pass/fail while the six-gate matrix is not fully `pass`. | Hardening |
| F-3 | No detector | Partially retired | **Partially retired** — unchanged, still gated on 26-1 | — |
| F-4 | No anchor | Partially retired | **Partially retired** — unchanged, still gated on 26-1 | — |
| F-5 | No validation | Not retired | **Not retired** — gated on 26-3 | — |
| F-6 | No calibration | Not retired | **Not retired** — gated on 26-3/26-4 | — |
| F-7 | No calibrated confidence | Not retired | **Not retired** — gated on 26-4 | — |
| F-8 | Non-deterministic missingness | Retired | **Retired (reinforced)** — missingness-fidelity gate emitter (`src/lib/biomech/gates/tempoGateMatrix.ts`) deterministically asserts every emitted reason is a member of the canonical `MISSINGNESS_REASONS` enum; covered by `tempoGateMatrix.test.ts`. | Hardening |
| F-9 | No per-metric production-gate emission | Partially retired (value gate only) | **Partially retired (advanced)** — three of the six canonical production gates (`determinism`, `replay_equivalence`, `missingness_fidelity`) now emit `pass` evidence in code; the remaining three (`validation`, `calibration`, `confidence_calibration`) honestly emit `block` with canonical reason codes (`no_corpus`, etc.). `all_pass` is statically `false` and the slice cannot accidentally promote itself. | New gate emitters |

### §1.3 Phase 23 §3 D-1…D-11 dependency advancement

| Dep | Phase 26 state | Phase 27 state | Repository citation |
|-----|----------------|----------------|---------------------|
| D-1 Frames | Shipped | Shipped | `src/lib/biomech/frameExtractionDeterministic.ts` |
| D-2 Pose | Stubbed | Stubbed (EXT-MODEL) | `src/lib/biomech/versions.ts:25` |
| D-3 Anchors (lift, strike) | Shape only | Shape + orchestrated into pipeline | `src/lib/biomech/anchors/peakLegLift.ts`, `anchors/frontFootStrike.ts`, `pipeline/tempoPipeline.ts` |
| D-4 Detector (D-PLANT) | Shape only | Shape + orchestrated | `src/lib/biomech/detectors/plantDetector.ts`, `pipeline/tempoPipeline.ts` |
| D-5 Metric engine (`tempo_sec`) | Shipped | Shipped (orchestrator-driven) | `src/lib/biomech/metrics/tempoSec.ts`, `pipeline/tempoPipeline.ts` |
| D-6 Evidence artifact | Shipped | Shipped + replay-equivalence-proven | `src/lib/biomech/evidence/tempoEvidence.ts`, `replay/tempoReplay.ts` |
| D-7 Validation harness | Shape only (empty-corpus path) | Shape only (empty-corpus path) — gated on EXT-CORPUS | `src/lib/biomech/validation/tempoHarness.ts` |
| D-8 Calibration certificate | Refuses (correct) | Refuses (correct) — gated on EXT-CORPUS | `src/lib/biomech/calibration/tempoCalibration.ts` |
| D-9 Calibrated confidence | Emission path live | Emission path live — gated on D-8 | `src/lib/biomech/metrics/confidence.ts` |
| D-10 Deterministic missingness | Shipped | Shipped + canonical-enum fidelity gate emitting `pass` | `src/lib/biomech/metrics/missingness.ts`, `gates/tempoGateMatrix.ts` |
| D-11 Production-gate emitters | Value gate only | **Six-gate matrix shipped** — 3/6 emit `pass`, 3/6 honestly `block` | `src/lib/biomech/gates/tempoGate.ts`, `gates/tempoGateMatrix.ts` |

---

## §2 Implementation Evidence

### §2.1 Files created (Phase 27)

```
src/lib/biomech/pipeline/tempoPipeline.ts
src/lib/biomech/replay/tempoReplay.ts
src/lib/biomech/gates/tempoGateMatrix.ts
src/lib/biomech/reportCard/tempoTileAdapter.ts
src/lib/biomech/__tests__/tempoPipeline.test.ts
src/lib/biomech/__tests__/tempoReplay.test.ts
src/lib/biomech/__tests__/tempoGateMatrix.test.ts
src/lib/biomech/__tests__/tempoTileAdapter.test.ts
.lovable/phase-27-first-truth-supported-metric-closure.md
```

### §2.2 Files modified

None. Per Phase 27 constraints no contract, reader, hook, edge function,
or auto-generated file was modified.

### §2.3 Component evidence

| New component | Retires | Tests |
|---------------|---------|-------|
| `pipeline/tempoPipeline.ts` (D-3 → D-4 → D-5 → D-6 orchestrator) | F-1 lineage continuity; advances 26-6 honestly without fabrication | `__tests__/tempoPipeline.test.ts` (3) — proves end-to-end stub-missingness propagation, byte-identical evidence across runs, and evidence-hash change on input change |
| `replay/tempoReplay.ts` (val §H5 / bp §H5 replay-equivalence harness) | F-9 replay-equivalence gate evidence (D-11) | `__tests__/tempoReplay.test.ts` (2) — proves `equivalent` status and 2-run contract |
| `gates/tempoGateMatrix.ts` (six-gate aggregator: determinism, replay, missingness fidelity, validation, calibration, confidence calibration) | F-9 production-gate emission; reinforces F-8 via canonical-enum fidelity check; structurally enforces F-2 ("never promote on partial gates") via `all_pass: false` and `blocking_gates[]` | `__tests__/tempoGateMatrix.test.ts` (4) — proves 3/6 gates `pass`, 3/6 honestly `block`, `all_pass=false`, value gate `missing` while D-POSE stub propagates |
| `reportCard/tempoTileAdapter.ts` (evidence → `TileState`, read-only) | F-2 hardening — adapter refuses to fabricate confidence and refuses to emit pass/fail while gate matrix is not fully `pass` | `__tests__/tempoTileAdapter.test.ts` (2) — proves `missing` status with canonical reason; proves `confidence` is omitted, never fabricated |

### §2.4 Test summary

```
src/lib/biomech/__tests__/fingerprint.test.ts        5 passed
src/lib/biomech/__tests__/tempoSec.test.ts           7 passed
src/lib/biomech/__tests__/peakLegLift.test.ts        1 passed
src/lib/biomech/__tests__/frontFootStrike.test.ts    1 passed
src/lib/biomech/__tests__/tempoEvidence.test.ts      3 passed
src/lib/biomech/__tests__/tempoHarness.test.ts       5 passed
src/lib/biomech/__tests__/tempoCalibration.test.ts   3 passed
src/lib/biomech/__tests__/tempoGate.test.ts          3 passed
src/lib/biomech/__tests__/tempoPipeline.test.ts      3 passed   [Phase 27]
src/lib/biomech/__tests__/tempoReplay.test.ts        2 passed   [Phase 27]
src/lib/biomech/__tests__/tempoGateMatrix.test.ts    4 passed   [Phase 27]
src/lib/biomech/__tests__/tempoTileAdapter.test.ts   2 passed   [Phase 27]
-------------------------------------------------------------
TOTAL                                                39 passed
```

(Phase 26: 28 passing → Phase 27: 39 passing. +11 tests; 0 regressions.)

---

## §3 Per-Blocker Retirement Status (consolidated)

| Blocker | Status after Phase 27 | Repository citation |
|---------|----------------------|---------------------|
| 26-1 D-POSE non-stub model | **Not retired** (EXT-MODEL) | `src/lib/biomech/versions.ts:25` |
| 26-2 D-PLANT real implementation | **Not retired** (depends on 26-1) | `src/lib/biomech/detectors/plantDetector.ts:36-46` |
| 26-3 Labeled ground-truth corpus for `tempo_sec` | **Not retired** (EXT-CORPUS) | `src/lib/biomech/validation/tempoHarness.ts:46` enforces `MIN_LABELED_PAIRS_FOR_VALIDATION = 30`; no corpus present in repo |
| 26-4 Calibration certificate | **Not retired** (depends on 26-3) | `src/lib/biomech/calibration/tempoCalibration.ts:49-56` correctly returns `uncalibrated/no_corpus` |
| 26-5 Calibrated confidence mapping | **Not retired** (depends on 26-4) | `src/lib/biomech/metrics/confidence.ts:30-45` `calibrated()` path is live but requires a certificate hash |
| 26-6 Edge-function wiring (deterministic chain into `analyze-video`) | **Partially retired** — honest read-only adapter shipped at `src/lib/biomech/reportCard/tempoTileAdapter.ts`; AI edge function intentionally untouched to avoid re-introducing F-1 / F-2 | `src/lib/biomech/reportCard/tempoTileAdapter.ts`; `supabase/functions/analyze-video/index.ts` (unmodified) |
| F-9 production-gate emission (Phase 21 §3) | **Partially retired (advanced)** — 3/6 gates emit `pass`, 3/6 honestly emit `block` with canonical reason codes | `src/lib/biomech/gates/tempoGateMatrix.ts` |
| Replay-equivalence gate (`val §H5` / `bp §H5`) | **Retired** — harness exists, deterministically asserts `equivalent` on the canonical pipeline | `src/lib/biomech/replay/tempoReplay.ts`; `__tests__/tempoReplay.test.ts` |
| Determinism gate (`canonical-production-gate-matrix.md` Part 0) | **Retired** — cache-fingerprint stability asserted across 2 runs | `src/lib/biomech/gates/tempoGateMatrix.ts` (determinism gate); `__tests__/tempoGateMatrix.test.ts` |
| Missingness-fidelity gate (`arch §Missingness rules`) | **Retired** — every emitted reason cross-checked against canonical enum at runtime | `src/lib/biomech/gates/tempoGateMatrix.ts` (missingness_fidelity gate) |

---

## §4 Truth Classification for `tempo_sec`

Per Phase 21 §2 the criteria for **Truth Supported** are:

1. Deterministic evidence-producing system with version pin.
2. Calibration evidence.
3. Validation evidence.
4. Surfaced confidence + missingness.
5. Production-gate evidence.

Post-Phase-27 status of `tempo_sec`:

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. Deterministic evidence-producing system with version pin | **Partially met** — deterministic chain D-1/D-3/D-4/D-5/D-6 shipped and replay-equivalence-proven; version pin `LANDMARK_MODEL_VERSION` is STILL `@0.0.0-stub` per `versions.ts:25`, so criterion 1's "version pin" clause is **not met for non-stub authority** | `pipeline/tempoPipeline.ts`; `versions.ts:24-26` |
| 2. Calibration evidence | **Not met** — no labeled corpus → no certificate per `cal §3.2` | `calibration/tempoCalibration.ts` (refuses) |
| 3. Validation evidence | **Not met** — no labeled corpus → harness emits `no_corpus` per `val §6.2 H2` | `validation/tempoHarness.ts` (refuses) |
| 4. Surfaced confidence + missingness | **Partially met** — missingness fully canonical and deterministic; confidence remains `uncalibrated` until criterion 2 is met | `gates/tempoGateMatrix.ts` (missingness_fidelity = pass); `metrics/confidence.ts` |
| 5. Production-gate evidence | **Partially met** — 3/6 gates pass; 3/6 honestly block | `gates/tempoGateMatrix.ts` |

**`tempo_sec` truth classification: Partially Supported.**

Promotion to **Truth Supported** is honestly impossible at Phase 27
because criterion 2 and criterion 3 require a labeled ground-truth corpus
that does not exist in this repository, and fabricating one (or
fabricating a calibration certificate) is forbidden by Phase 22 F-5 / F-6
and `mem://` doctrine. This is the same external-data wall identified by
Phase 26 §10 blockers 26-3 / 26-4 / 26-5.

---

## §5 Release 1 Report Card Advancement

Counts derive from the 30 unique metric keys enumerated in Phase 21 §8
(`bp.contract.ts` 9 + `bh.contract.ts` 21).

| Status | Phase 26 count | Phase 27 count | Repository evidence |
|--------|----------------|----------------|---------------------|
| Truth Supported | 0 / 30 | **0 / 30** | No metric has all 5 of Phase 21 §2 criteria met. |
| Partially Supported | 0 / 30 | **1 / 30** (`tempo_sec`) | This document §4; `src/lib/biomech/{pipeline,replay,gates,reportCard}/**` |
| Unsupported | 30 / 30 | **29 / 30** | Phase 21 §2 inventory minus `tempo_sec` |

`tempo_sec` is the first repository metric to move off `Unsupported` and
into `Partially Supported` on the basis of code-resident, replay-stable,
test-covered deterministic evidence.

---

## §6 Final Determination

**FIRST TRUTH-SUPPORTED METRIC NOT ACHIEVED.**

`tempo_sec` has advanced from **Unsupported** to **Partially Supported**
on the basis of code-only retirement of every blocker that was honestly
retirable at Phase 27 (lineage continuity, replay equivalence,
determinism, missingness fidelity, six-gate emission, read-only
report-card adapter). Promotion to **Truth Supported** remains gated by
three blockers that are NOT retirable in code today:

1. **D-POSE non-stub model integration** (`versions.ts:25`,
   `canonical-build-plan.md §2 D-POSE`) — required to satisfy Phase 21 §2
   criterion 1's "version pin" clause for non-stub authority.
2. **Labeled ground-truth corpus** (`val §6.2 H2`) — required to satisfy
   criterion 3.
3. **Calibration certificate** (`cal §3.2`) — derivable only from 2, and
   required to satisfy criterion 2 and to unblock criterion 4's confidence
   half.

Per the constitutional prohibition on fabricated evidence
(Phase 22 F-2 / F-5 / F-6 / F-7; `mem://` doctrine; Phase 27 deliverable
constraints "No fabricated evidence / No fabricated calibration / No
fabricated confidence / No synthetic ground-truth corpus"), Phase 27
declines to invent any of (1)–(3) and instead reports the honest
outcome: the first metric has reached the highest truth classification
currently reachable without external data.

Supported exclusively by §§1–5 above and the test evidence in §2.4.
