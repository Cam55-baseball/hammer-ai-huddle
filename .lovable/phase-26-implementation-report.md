# Phase 26 — First Executable Report Card Slice: Implementation Report

Authority: `.lovable/first-executable-report-card-slice.md` (Phase 25).
Scope: one surface (`bp` Baseball Pitching tile `tempo`) × one metric
(`tempo_sec`) × full D-1…D-11 pipeline, implemented honestly with no
fabricated validation, calibration, or confidence evidence.

---

## §1 Files created

```
src/lib/biomech/anchors/peakLegLift.ts
src/lib/biomech/anchors/frontFootStrike.ts
src/lib/biomech/detectors/plantDetector.ts
src/lib/biomech/metrics/missingness.ts
src/lib/biomech/metrics/confidence.ts
src/lib/biomech/metrics/tempoSec.ts
src/lib/biomech/evidence/tempoEvidence.ts
src/lib/biomech/validation/tempoHarness.ts
src/lib/biomech/calibration/tempoCalibration.ts
src/lib/biomech/gates/tempoGate.ts
src/lib/biomech/__tests__/tempoSec.test.ts
src/lib/biomech/__tests__/peakLegLift.test.ts
src/lib/biomech/__tests__/frontFootStrike.test.ts
src/lib/biomech/__tests__/tempoEvidence.test.ts
src/lib/biomech/__tests__/tempoHarness.test.ts
src/lib/biomech/__tests__/tempoCalibration.test.ts
src/lib/biomech/__tests__/tempoGate.test.ts
.lovable/phase-26-implementation-report.md
```

## §2 Files modified

None. The existing surfaces required by Phase 25 §11 (`bp.contract.ts`,
`bp.ts`, `useReportCardTrend.ts`, `frameExtractionDeterministic.ts`,
`fingerprint.ts`, `versions.ts`) already conform to the slice's read /
display contract; modifying them was not required to ship the deterministic
scaffold and would have introduced fabricated upstream wiring (see §10).

## §3 Components implemented

| Layer (Phase 23) | Component                                    | File                                            | Honest status |
|------------------|----------------------------------------------|-------------------------------------------------|---------------|
| D-1 Frames       | Deterministic extraction (pre-existing)      | `src/lib/biomech/frameExtractionDeterministic.ts` | already shipped |
| D-2 Pose         | Pose extraction                              | `src/lib/biomech/versions.ts` (`@0.0.0-stub`)    | STUBBED — blocker §10 |
| D-3 Anchor (lift)| Peak-leg-lift extractor                      | `anchors/peakLegLift.ts`                        | shape implemented, emits canonical missingness while D-POSE stubbed |
| D-3 Anchor (strike)| Front-foot-strike extractor                | `anchors/frontFootStrike.ts`                    | shape implemented, emits canonical missingness |
| D-4 Detector     | D-PLANT skeleton                             | `detectors/plantDetector.ts`                    | shape implemented, emits canonical missingness |
| D-5 Metric       | `tempo_sec` engine                           | `metrics/tempoSec.ts`                           | fully implemented (pure deterministic) |
| —                | Canonical missingness reasons enum           | `metrics/missingness.ts`                        | fully implemented |
| —                | Confidence emitter (`uncalibrated` default)  | `metrics/confidence.ts`                         | fully implemented; refuses to fabricate values |
| D-6 Evidence     | Lineage-bound evidence artifact              | `evidence/tempoEvidence.ts`                     | fully implemented, byte-stable across replays |
| D-7 Validation   | Harness over labeled-pair corpus             | `validation/tempoHarness.ts`                    | fully implemented; emits `no_corpus` over empty corpus |
| D-8 Calibration  | Certificate generator                        | `calibration/tempoCalibration.ts`               | fully implemented; refuses certificate below pair floor |
| D-9 Confidence   | Calibrated-confidence emission path          | `metrics/confidence.ts`                         | emission path live; output remains `uncalibrated` pending §10 |
| D-10 Missingness | Deterministic missingness emission           | `metrics/missingness.ts` + every layer above    | fully implemented |
| D-11 Gate        | Per-gate emitter                             | `gates/tempoGate.ts`                            | fully implemented; emits `block` when uncalibrated |

## §4 Validation evidence generated

- 5 unit tests in `__tests__/tempoHarness.test.ts` (all passing) covering:
  - `no_corpus` over empty input,
  - `insufficient_corpus` below the labeled-pair floor (`MIN_LABELED_PAIRS_FOR_VALIDATION = 30`),
  - `executed` at/above the floor,
  - deterministic `corpus_fingerprint_hex` across input order,
  - missing-prediction counting without fabricated residuals.
- Over a real-world labeled corpus the harness output would be a
  `TempoValidationReport` with per-clip residuals and a corpus fingerprint.
- No real labeled-corpus residuals were generated: **the repo contains no
  labeled ground-truth corpus for `tempo_sec`**, and fabricating one would
  violate Phase 22 F-5 and `mem://` doctrine.

## §5 Calibration evidence generated

- 3 unit tests in `__tests__/tempoCalibration.test.ts` (all passing) covering:
  - refusal over `no_corpus`,
  - refusal over `insufficient_corpus`,
  - deterministic certificate emission at/above floor.
- No real calibration certificate was generated. The generator returned
  `{ status: "uncalibrated", reason: "no_corpus", observed_pair_count: 0 }`
  against the real-world corpus, which is the doctrinally correct output.

## §6 Confidence evidence generated

- The metric engine emits `ConfidenceRecord { status: "uncalibrated", value: null, certificate_hash: null }`
  on every successful computation, and `{ status: "missing", value: null, ... }`
  on every missingness path.
- The calibrated-confidence emission path (`calibrated(value, certificate_hash)`)
  enforces `[0,1]` range and a 64-char sha256 certificate hash; it is wired
  for use the moment §5's certificate becomes available.
- No fabricated confidence value was produced anywhere in the slice (per
  Phase 22 F-7).

## §7 Gate movement achieved

For `tempo_sec` against the canonical production gate (`gate Part 1`):

| Input state                                | Gate decision | Reason                  |
|--------------------------------------------|---------------|-------------------------|
| Metric missing                             | `missing`     | `metric_missing`        |
| Metric value present, calibration absent   | `block`       | `uncalibrated`          |
| Metric value present, calibrated, ≤1.05s   | `pass`        | `value_within_threshold`|
| Metric value present, calibrated, >1.05s   | `fail`        | `value_exceeds_threshold` |

Gate emitter behaviour is covered by 3 unit tests in
`__tests__/tempoGate.test.ts`, all passing. With today's inputs the gate
emits `block` for any non-missing value (correct: §5 has no certificate),
and `missing` for any path requiring D-POSE.

## §8 Truth-supported metric count — before

0 / 30 (per Phase 25 §13).

## §9 Truth-supported metric count — after

0 / 30. The slice did not promote `tempo_sec` to Truth Supported because
the slice cannot honestly retire F-5 (labeled corpus) or F-6 (calibration
certificate) in this turn. Both retirements require labeled ground-truth
data that does not exist in the repository.

### F-1…F-9 retirement status for `tempo_sec`

| F-# | Blocker                                  | Status after Phase 26 | Remaining precondition |
|-----|------------------------------------------|-----------------------|------------------------|
| F-1 | No deterministic evidence layer          | **Partially retired** — D-1, D-5, D-6, D-10 fully implemented; D-2/D-3/D-4 emit canonical missingness rather than fabricated values | Replace D-POSE stub (`versions.ts`) |
| F-2 | Placeholder / AI-only outputs            | **Retired (structural)** — the deterministic path never invokes the AI gateway for `tempo_sec`; missingness is preserved instead | Edge-function wiring (§10) |
| F-3 | No detector                              | **Partially retired** — D-PLANT skeleton emits canonical missingness; real implementation requires D-POSE | Replace D-POSE stub |
| F-4 | No anchor                                | **Partially retired** — `peakLegLift` / `frontFootStrike` extractors live | Replace D-POSE stub |
| F-5 | No validation                            | **Not retired** — harness lives, corpus does not | Labeled ground-truth corpus (≥30 pairs per `canonical-verification-audit.md`) |
| F-6 | No calibration                           | **Not retired** — generator lives, certificate does not | Labeled corpus per F-5 |
| F-7 | No calibrated confidence                 | **Not retired** — emission path lives, mapping does not | Certificate per F-6 |
| F-8 | Non-deterministic missingness            | **Retired** — `missingness.ts` enum + deterministic propagation across every layer | — |
| F-9 | No per-metric production-gate emission   | **Partially retired** — gate emitter lives and correctly emits `block` while preconditions unmet | Certificate per F-6 to unblock pass/fail |

## §10 Outstanding implementation blockers (named verbatim from canonical inputs)

1. **D-POSE non-stub model** — `src/lib/biomech/versions.ts` still pins
   `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`. Per
   `canonical-build-plan.md §2 D-POSE`: "Land deterministic extractor
   satisfying `bp §B1` and `arch §Landmarks`; eliminate `@0.0.0-stub` pin
   per `val §1.4`." This is the upstream blocker for all D-2/D-3/D-4 work.
2. **D-PLANT real implementation** — `canonical-build-plan.md §2 D-PLANT`
   "Front-foot first-contact / full-plant detector"; requires D-POSE.
3. **Labeled ground-truth corpus for `tempo_sec`** — required by `val §6.2 H2`
   ("ground-truth on golden landmark set" / "labeled plants"). The repository
   does not contain such a corpus.
4. **Calibration certificate per `cal §3.2`** — derivable only from blocker 3.
5. **Calibrated confidence mapping per `conf §Detector D-PLANT`** —
   derivable only from blocker 4.
6. **Edge-function wiring** —
   `supabase/functions/analyze-video/index.ts` does not yet route the
   deterministic `tempo_sec` chain. Wiring it before blocker 1 is resolved
   would require the AI to fabricate the `tempo_sec` value, which Phase 22
   F-2 and `mem://` doctrine explicitly forbid.

## §11 Test summary

```
src/lib/biomech/__tests__/fingerprint.test.ts        5 passed
src/lib/biomech/__tests__/tempoSec.test.ts           7 passed
src/lib/biomech/__tests__/tempoEvidence.test.ts      3 passed
src/lib/biomech/__tests__/tempoHarness.test.ts       5 passed
src/lib/biomech/__tests__/tempoCalibration.test.ts   3 passed
src/lib/biomech/__tests__/tempoGate.test.ts          3 passed
src/lib/biomech/__tests__/peakLegLift.test.ts        1 passed
src/lib/biomech/__tests__/frontFootStrike.test.ts    1 passed
-----------------------------------------------------------
TOTAL                                                28 passed
```

## §12 Final Determination

**IMPLEMENTATION PARTIALLY COMPLETE.**

The deterministic scaffold for the chosen slice (D-1, D-5, D-6, D-7, D-8,
D-9 emission path, D-10, D-11) is shipped, covered by tests, and emits
canonical missingness wherever upstream inputs are absent. The slice
cannot reach `IMPLEMENTATION COMPLETE` in this turn because (a) D-POSE
remains stubbed, and (b) no labeled ground-truth corpus exists in the
repository from which validation residuals or a calibration certificate
could be honestly derived. Both blockers are external-data preconditions
that cannot be discharged by additional code without violating the
constitutional prohibition on fabricated evidence (Phase 22 F-2, F-5, F-6;
`mem://` doctrine).
