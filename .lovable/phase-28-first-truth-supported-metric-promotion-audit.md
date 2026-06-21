# Phase 28 — First Truth-Supported Metric Promotion Audit

Authority (read-only): `.lovable/phase-27-first-truth-supported-metric-closure.md`,
`.lovable/report-card-metric-truth-audit.md`,
`.lovable/report-card-metric-truth-closure-audit.md`,
`.lovable/report-card-root-blocker-decomposition-audit.md`,
`.lovable/report-card-implementation-authority-package.md`,
`.lovable/canonical-validation-framework.md` (`val`),
`.lovable/canonical-calibration-architecture.md` (`cal`),
`.lovable/canonical-confidence-architecture.md` (`conf`),
`.lovable/canonical-production-gate-matrix.md` (`gate`).

Repository surfaces inspected read-only: `src/lib/reportCard/**`,
`src/lib/biomech/**`, `supabase/functions/analyze-video/**`, Phase 26–27 tests.

Promotion-analysis only. No code, doctrine, architecture, gate, metric,
detector, anchor, validation, calibration, confidence, or new
requirement is introduced by this document.

---

## §1 Scope

This phase determines, by reference to existing repository evidence and
existing canonical doctrine only, the minimum remaining evidence
required to promote the single repository metric currently classified as
**Partially Supported** to **Truth Supported**, per the five-criterion
definition in `.lovable/report-card-metric-truth-audit.md` Phase 21 §2
and reaffirmed by Phase 27 §4.

Out of scope: producing any of that evidence; modifying any gate,
metric, detector, anchor, harness, certificate, model, or contract;
introducing new validation, calibration, confidence, or production-gate
requirements; modifying any file other than this one.

---

## §2 Candidate Metric Review

Per Phase 27 §5 the Release-1 metric inventory (30 metric keys total
from `bp.contract.ts` 9 + `bh.contract.ts` 21) currently distributes as:

| Status | Count | Metrics |
|---|---|---|
| Truth Supported | 0 / 30 | (none) |
| Partially Supported | 1 / 30 | `tempo_sec` (Baseball Pitching) |
| Unsupported | 29 / 30 | all others |

`tempo_sec` is the **only** candidate for promotion. No other metric has
a deterministic D-3 → D-4 → D-5 → D-6 chain, replay-equivalence harness,
six-gate emitter, or read-only tile adapter in the repository
(`src/lib/biomech/pipeline/tempoPipeline.ts`,
`src/lib/biomech/replay/tempoReplay.ts`,
`src/lib/biomech/gates/tempoGateMatrix.ts`,
`src/lib/biomech/reportCard/tempoTileAdapter.ts`). Promotion analysis is
therefore restricted to `tempo_sec`.

---

## §3 Current Evidence Inventory

Sources: Phase 27 §1.3, §2.3, §3 and the cited repository files.

| Evidence layer | Status | Repository citation |
|---|---|---|
| D-1 frame extraction (deterministic) | Shipped | `src/lib/biomech/frameExtractionDeterministic.ts` |
| D-2 pose model | **Stub** (`blazepose_full@0.0.0-stub`) | `src/lib/biomech/versions.ts:24-26` |
| D-3 anchors (peak leg lift, front-foot strike) | Shipped, stub-missingness-propagating | `src/lib/biomech/anchors/peakLegLift.ts`, `anchors/frontFootStrike.ts` |
| D-4 detector (D-PLANT) | Shape only; emits canonical missingness while D-2 is stub | `src/lib/biomech/detectors/plantDetector.ts` |
| D-5 metric engine (`tempo_sec`) | Shipped, pure, deterministic | `src/lib/biomech/metrics/tempoSec.ts` |
| D-6 evidence artifact | Shipped; replay-equivalent (bit-identical `evidence_sha256_hex` across runs) | `src/lib/biomech/evidence/tempoEvidence.ts`, `replay/tempoReplay.ts` |
| D-7 validation harness | Shape only; honestly refuses on empty corpus | `src/lib/biomech/validation/tempoHarness.ts` (`MIN_LABELED_PAIRS_FOR_VALIDATION = 30`) |
| D-8 calibration certificate generator | Honestly refuses (`uncalibrated/no_corpus`) | `src/lib/biomech/calibration/tempoCalibration.ts` |
| D-9 calibrated confidence path | Code path live; awaits certificate hash | `src/lib/biomech/metrics/confidence.ts` |
| D-10 deterministic missingness | Shipped; canonical-enum fidelity gate emits `pass` | `src/lib/biomech/metrics/missingness.ts`, `gates/tempoGateMatrix.ts` |
| D-11 production-gate emission | **3 / 6 `pass`** (`determinism`, `replay_equivalence`, `missingness_fidelity`); **3 / 6 `block`** (`validation`, `calibration`, `confidence_calibration`); `all_pass = false` | `src/lib/biomech/gates/tempoGateMatrix.ts`, `gates/tempoGate.ts` |
| Read-only Report-Card tile adapter | Shipped; refuses to fabricate confidence or pass/fail while matrix not fully `pass` | `src/lib/biomech/reportCard/tempoTileAdapter.ts` |
| Edge-function wiring (`analyze-video`) | Intentionally untouched (Phase 27 §1.1 row 26-6) to avoid re-introducing F-1 / F-2 | `supabase/functions/analyze-video/index.ts` (unmodified) |

39 tests pass (Phase 27 §2.4). No fabricated evidence, calibration,
confidence, or corpus data exists in the repository.

---

## §4 Remaining Promotion Requirements

The five Truth-Supported criteria (`.lovable/report-card-metric-truth-audit.md`
Phase 21 §2; restated Phase 27 §4) mapped to current status for
`tempo_sec`:

| # | Criterion | Status | What is missing to reach **met** |
|---|---|---|---|
| 1 | Deterministic evidence-producing system **with version pin** | Partially met | Non-stub D-POSE model integration so the version pin in `versions.ts` refers to non-stub authority (`gate` Part 1 row D-POSE; `cal §4 D-POSE`). |
| 2 | Calibration evidence | Not met | Active calibration certificate per `cal §3.2` (D-POSE scope **and** D-PLANT frame-residual envelope per `cal §4 D-PLANT` / `cal §5 Heel Plant`). |
| 3 | Validation evidence | Not met | Validation pass per `val §H1` (deterministic), `val §H2` (ground-truth), `val §H4` (deadband legality where applicable), `val §H5` (replay) over a labeled corpus of ≥ `MIN_LABELED_PAIRS_FOR_VALIDATION` (= 30) paired-frame examples (`src/lib/biomech/validation/tempoHarness.ts:46`). |
| 4 | Surfaced confidence + missingness | Partially met (missingness fully met; confidence pending) | Calibrated confidence binding per `conf §Detector D-PLANT` and `conf §Metric` aggregation, which requires the certificate from (2). |
| 5 | Production-gate evidence | Partially met (3/6) | The three blocking gates `validation`, `calibration`, `confidence_calibration` must transition from `block` to `pass`, which is a strict downstream consequence of (1)–(4) being met. |

No additional requirements are introduced; every row above is a
reference to existing doctrine.

---

## §5 D-POSE Dependency Audit

- **Current state.** `src/lib/biomech/versions.ts:24-26` pins
  `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`. The `@0.0.0-stub`
  suffix declares the absence of real pose inference.
- **Doctrinal requirement.** `gate` Part 1 row **D-POSE** requires the
  model to clear `val §2.1 D-POSE` at ≥ T2 on the golden-clip set and
  to maintain an active residual envelope per `cal §4 D-POSE`.
- **Downstream blast radius.** Every D-PLANT, anchor, metric, and gate
  in the `tempo_sec` chain inherits D-POSE eligibility per `gate`
  Part 1 / Part 2 / Part 3 (monotonic non-increasing eligibility,
  `conf §Preamble`). Until D-POSE clears, D-PLANT cannot clear; until
  D-PLANT clears, the peak-leg-lift / front-foot-strike anchors emit
  canonical missingness; until anchors carry frames, the metric engine
  emits `pose_not_detected` / `front_foot_*_missing` per
  `arch §Missingness rules`.
- **Promotion impact.** Criterion 1's "version pin" clause is *not* met
  for non-stub authority while `@0.0.0-stub` is present (Phase 27 §4
  row 1). This is the single largest promotion blocker because it gates
  criteria 2, 3, and 4 in turn.
- **Class.** **EXT-MODEL** (Phase 27 §1 key). Not retirable in code
  alone; requires the model integration enumerated in
  `canonical-build-plan.md §2 D-POSE`.

---

## §6 Labeled Corpus Dependency Audit

- **Current state.** No labeled ground-truth corpus exists in the
  repository for `tempo_sec` (Phase 27 §3 row 26-3; harness refuses
  with `no_corpus`).
- **Doctrinal requirement.** `val §6.2 H2` requires a labeled
  ground-truth set; `src/lib/biomech/validation/tempoHarness.ts:46`
  enforces a minimum of **30 labeled paired-frame examples**
  (`MIN_LABELED_PAIRS_FOR_VALIDATION`).
- **Composition (per existing doctrine, no new requirements).** Each
  labeled example must carry the canonical anchor frames
  (`peak_leg_lift_frame`, `front_foot_strike_frame`) plus the engine /
  reasoning version pins required for `bp §H5` replay equivalence.
  Stratification is governed by `cal §3.2` certificate scope (segment,
  frame-density, device) and `val §2.1 D-POSE` golden-clip set.
- **Promotion impact.** Without this corpus:
  - Criterion 3 (validation) cannot be met (`val §H2`).
  - Criterion 2 (calibration) cannot be met because the calibration
    certificate per `cal §3.2` is derived from harness output
    (`val §H2` → `cal §4/§5/§6`).
  - Criterion 4's confidence half cannot be met because
    `conf §Detector D-PLANT` / `conf §Metric` calibrated confidence is
    bound to the certificate from criterion 2.
- **Class.** **EXT-CORPUS**. The repository's no-fabrication doctrine
  (Phase 22 F-2 / F-5 / F-6 / F-7; Phase 27 §6) explicitly forbids
  synthesising this corpus.

---

## §7 Validation Requirement Audit

`tempo_sec` is a P1→P2 timing metric and therefore inherits the timing
clauses from `val §H1`, `val §H2`, and the deadband-legality clauses of
`val §H4` (mirrored on the timing metrics in `gate` Part 3 rows for
`p2_timing` and `p3_timing`, which share D-PLANT-class anchor residuals).

| Validation clause | Current state for `tempo_sec` | What promotes it |
|---|---|---|
| `val §H1` deterministic replay across pinned `engine_version` + `reasoning_version` | **Met** by `src/lib/biomech/replay/tempoReplay.ts` (bit-identical `evidence_sha256_hex` across two runs) | — |
| `val §H2` ground-truth harness pass over the labeled corpus | **Not met** — harness emits `no_corpus` | Labeled corpus from §6 |
| `val §H4` deadband / slope legality (where applicable per `arch §Part 2`) | **Not met** — cannot evaluate without `val §H2` | Same labeled corpus |
| `val §H5` replay equivalence at the harness boundary | **Met** by `tempoReplay.ts` (Phase 27 §1.2 row F-9 / §2.3 row 2) | — |
| `val §7` trust-class promotion to ≥ T2 | **Not met** — promotion requires `val §H2` + `val §H4` results | Same labeled corpus + D-POSE clearance |

Two of five clauses are already met. The remaining three collapse to a
single dependency: the labeled corpus of §6 (plus D-POSE of §5 so the
harness inputs are non-stub).

---

## §8 Calibration Requirement Audit

| Calibration clause | Current state | What promotes it |
|---|---|---|
| `cal §3.2` active calibration certificate (scope: segment, frame-density, device) | **Not met** — `src/lib/biomech/calibration/tempoCalibration.ts:49-56` returns `uncalibrated/no_corpus` | Corpus of §6 → harness pass §7 → certificate issuance per `cal §3.2` |
| `cal §4 D-POSE` residual envelope active | **Not met** — D-POSE stub | D-POSE clearance from §5 |
| `cal §4 D-PLANT` frame-index residual envelope active | **Not met** — D-PLANT cannot clear while D-POSE is stub | D-POSE from §5 |
| `cal §5 Heel Plant` anchor residual envelope active (analogous frame-residual class to the `tempo_sec` anchors per `gate` Part 2) | **Not met** | Same chain |
| `cal §6` timing residual envelope for the metric | **Not met** | Harness output once §7 is met |
| `cal §7` certificate authority sufficient for promotion | **Not met** | Strict downstream of the above |

No calibration clause can be met without the §5 model and §6 corpus.
Doctrine forbids `in-place re-fit` and `post-hoc certificate reissue`
(`gate` Part 0 Demotion authority hierarchy), so no shortcut exists.

---

## §9 Confidence Requirement Audit

| Confidence clause | Current state | What promotes it |
|---|---|---|
| `conf §Preamble` confidence one-interaction-away surfacing | **Met** structurally — tile adapter surfaces confidence when present and refuses to fabricate it | — |
| `conf §Detector D-POSE` calibration-bound monotonic confidence | **Not met** | §5 D-POSE + §8 certificate |
| `conf §Detector D-PLANT` calibration-bound monotonic confidence | **Not met** | §8 certificate |
| `conf §Anchor Heel Plant` (analogous class) calibration-bound monotonic confidence | **Not met** | §8 certificate |
| `conf §Metric` aggregation per `arch §Confidence model` | **Not met** — emission path live, awaits certificate hash (`src/lib/biomech/metrics/confidence.ts:30-45`) | §8 certificate |
| `conf §Promotion-Demotion` ≥ T2 promotion authority | **Not met** | Strict downstream of the above |

No confidence requirement requires anything beyond the §5 / §6 / §8
inputs already enumerated. The code path is wired; only its inputs are
missing.

---

## §10 Production Gate Requirement Audit

Per `gate` Part 0 Evidence-first release law, the five conjunctive
conditions are: (1) validation sufficient per `val §7`,
(2) calibration sufficient per `cal §7`, (3) confidence sufficient per
`conf §Promotion-Demotion`, (4) replay equivalence per `bp §H5` /
`val §H5`, (5) missingness conformant per `arch §Missingness rules`.

| `gate` condition | `tempoGateMatrix.ts` emission | Pass driver |
|---|---|---|
| Determinism (`gate` Part 0 replay-equivalent) | `pass` | Cache-fingerprint stability across 2 runs |
| Replay equivalence (`bp §H5` / `val §H5`) | `pass` | `tempoReplay.ts` equivalent status |
| Missingness fidelity (`arch §Missingness rules`) | `pass` | Canonical-enum fidelity assertion |
| Validation (`val §7`) | `block` (`no_corpus`) | §6 corpus → §7 harness pass |
| Calibration (`cal §7`) | `block` (`no_certificate`) | §8 certificate |
| Confidence calibration (`conf §Promotion-Demotion`) | `block` (`uncalibrated`) | §9 calibrated confidence |

`all_pass = false` is the structural reason the read-only tile adapter
refuses to emit pass/fail (Phase 27 §2.3 row 4). No new gate, no new
threshold, and no relaxation is required; the three blocking gates flip
to `pass` exactly when their upstream conditions in §§5–9 are satisfied.

Per `gate` Part 4 the Report-Card tile cannot promote independently of
its metric (`presentation-only consumers`), so no Report-Card-side work
can substitute for the metric-side closure.

---

## §11 Smallest Promotion Closure Set

Combining §§5–10 the minimum, non-redundant evidence set whose
acquisition would promote `tempo_sec` to **Truth Supported** is:

1. **Non-stub D-POSE model integration** retiring `@0.0.0-stub` in
   `src/lib/biomech/versions.ts:25`, clearing `val §2.1 D-POSE` on the
   golden-clip set at ≥ T2 and establishing a `cal §4 D-POSE` residual
   envelope. (§5; EXT-MODEL.)
2. **Labeled ground-truth corpus for `tempo_sec`** of at least 30
   paired-frame examples (`MIN_LABELED_PAIRS_FOR_VALIDATION`) carrying
   canonical `peak_leg_lift_frame` and `front_foot_strike_frame`
   labels under pinned `engine_version` + `reasoning_version`. (§6;
   EXT-CORPUS.)
3. **`val §H2` + `val §H4` harness pass** over (2) using (1), promoting
   `tempo_sec` to ≥ T2 per `val §7`. (§7; strict downstream of 1 + 2.)
4. **`cal §3.2` calibration certificate** issued from (3) with the
   appropriate D-POSE / D-PLANT / Heel-Plant-class residual envelopes
   per `cal §4–§6`. (§8; strict downstream of 3.)
5. **`conf §Detector` + `conf §Metric` calibrated confidence binding**
   activated by the certificate hash from (4) along the already-wired
   path in `src/lib/biomech/metrics/confidence.ts`. (§9; strict
   downstream of 4.)

No element of the closure set is removable: removing any of (1)–(4)
leaves at least one criterion of Phase 21 §2 unsatisfied, and (5) is
required to convert the existing live confidence emission path from
`uncalibrated` to ≥ T2 calibrated. Item (1) is the only true external
prerequisite for *all* of (2)–(5); items (2)–(5) form a deterministic
chain once (1) is in place.

Closure set cardinality: **2 external inputs** (D-POSE model integration,
labeled corpus) producing **3 deterministic derivations** (validation
pass, calibration certificate, calibrated confidence) through code
paths that already exist in the repository.

---

## §12 Promotion Feasibility Determination

- **Items (3), (4), (5)** of the closure set are derivable inside the
  repository the moment items (1) and (2) are supplied. All required
  code paths (`tempoPipeline`, `tempoHarness`, `tempoCalibration`,
  `confidence`, `tempoGateMatrix`, `tempoTileAdapter`) exist, are
  test-covered, and are correctly wired per Phase 27 §§2.3–2.4.
- **Items (1) and (2)** are NOT derivable inside the repository. They
  are EXT-MODEL and EXT-CORPUS respectively (Phase 27 §1 key) and the
  no-fabrication doctrine (Phase 22 F-2 / F-5 / F-6 / F-7; Phase 27 §6;
  `mem://` Core) prohibits synthesising either.
- **No doctrinal blocker** prevents promotion in principle: the
  Evidence-first release law (`gate` Part 0) is satisfiable for
  `tempo_sec` with exactly the §11 closure set and no additional
  requirements.
- **No code work** is required *first*; the determinant of promotion is
  external-evidence supply, not further implementation.

Promotion is therefore **feasible-once-external-evidence-supplied**, and
**infeasible under current repository evidence alone**.

---

## §13 Final Determination

**PROMOTION BLOCKED.**

`tempo_sec` is the unique Partially Supported candidate (§2) and is
currently blocked from promotion to Truth Supported by the two external
inputs enumerated in §11 items (1) and (2): a non-stub D-POSE model
integration (§5; EXT-MODEL) and a labeled ground-truth corpus of at
least 30 paired-frame examples (§6; EXT-CORPUS). Items (3)–(5) — the
validation pass, the calibration certificate, and the calibrated
confidence binding — are deterministic downstream derivations through
code paths that already exist in the repository (§§7–9) and require no
new doctrine, no new gate, no new metric, no new detector, no new
anchor, and no new requirement of any kind (§§4, 10, 11).

The determination is **PROMOTION BLOCKED** rather than **PROMOTION
IMPOSSIBLE UNDER CURRENT EVIDENCE** because the closure set is
non-empty, finite, doctrinally permitted, and entirely composed of
inputs whose acquisition is contemplated by existing canonical doctrine
(`canonical-build-plan.md §2 D-POSE`; `val §6.2 H2`). It is not
**PROMOTION READY** because two of the five required inputs are absent
from the repository today and cannot be fabricated under the
no-fabrication doctrine.

Supported exclusively by §§1–12 above and the cited repository and
canonical-document evidence.
