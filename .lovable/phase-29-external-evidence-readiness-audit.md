# Phase 29 — External Evidence Readiness Audit

Authority (read-only): `.lovable/phase-28-first-truth-supported-metric-promotion-audit.md`,
`.lovable/phase-27-first-truth-supported-metric-closure.md`,
`.lovable/report-card-implementation-authority-package.md`,
`.lovable/canonical-validation-framework.md` (`val`),
`.lovable/canonical-calibration-architecture.md` (`cal`),
`.lovable/canonical-confidence-architecture.md` (`conf`),
`.lovable/canonical-production-gate-matrix.md` (`gate`).

Repository surfaces inspected read-only: `src/lib/biomech/**`,
`src/lib/reportCard/**`, `supabase/functions/analyze-video/**`,
existing Phase 26–28 evidence and tests.

Evidence-readiness analysis only. No code, doctrine, architecture,
metric, detector, anchor, validation, calibration, confidence, gate,
or new requirement is introduced by this document.

---

## §1 Scope

This phase determines, by reference to existing repository evidence and
existing canonical doctrine only, whether the two external evidence
inputs identified by Phase 28 §11 — **EXT-MODEL** (non-stub D-POSE
evidence source) and **EXT-CORPUS** (labeled validation corpus) — can
be acquired and consumed against the repository as it stands today,
without further code, doctrine, or architecture work.

Out of scope: producing either input; modifying any file other than
this one; introducing or relaxing any requirement; altering any gate,
metric, detector, anchor, harness, certificate, model, contract, or
tile adapter.

---

## §2 EXT-MODEL Audit

**Definition.** EXT-MODEL is the integration of a non-stub D-POSE
evidence source replacing the stub authority currently pinned in
`src/lib/biomech/versions.ts:25`
(`LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"`), per Phase 27
§1 key and Phase 28 §5.

**Doctrinal consumption surface (already present).**

| Requirement | Repository binding |
|---|---|
| `gate` Part 1 row D-POSE — model clears `val §2.1 D-POSE` at ≥ T2 on the golden-clip set | Pin consumed by `src/lib/biomech/versions.ts` → fingerprinted in `supabase/functions/_shared/biomechFingerprint.ts` (per Phase 0 contract documented in `versions.ts:8-18`) |
| `cal §4 D-POSE` residual envelope | Consumed by `src/lib/biomech/calibration/tempoCalibration.ts` (refuses with `uncalibrated/no_corpus` until envelope active) |
| `conf §Detector D-POSE` calibration-bound monotonic confidence | Consumed by `src/lib/biomech/metrics/confidence.ts` (Phase 28 §9) |
| Monotonic non-increasing eligibility propagation `gate` Part 1 → Part 2 → Part 3 | Consumed by `src/lib/biomech/gates/tempoGateMatrix.ts` (Phase 28 §10) |

**Acquisition shape.** Replacement of the three `@0.0.0-stub` version
strings in `src/lib/biomech/versions.ts:24-26` with non-stub identifiers
backed by an actual pose-inference authority, plus the golden-clip
clearance evidence required by `val §2.1 D-POSE`. No new code surface
is required by the audit; the consumption sites already exist.

**Readiness verdict.** The repository is **ready to consume** EXT-MODEL
the moment it is supplied. The model itself is not present.

---

## §3 EXT-CORPUS Audit

**Definition.** EXT-CORPUS is a labeled ground-truth corpus for
`tempo_sec` of at least `MIN_LABELED_PAIRS_FOR_VALIDATION = 30`
paired-frame examples (`src/lib/biomech/validation/tempoHarness.ts:46`),
per Phase 27 §3 row 26-3 and Phase 28 §6.

**Doctrinal consumption surface (already present).**

| Requirement | Repository binding |
|---|---|
| `val §H2` ground-truth pair schema | `TempoValidationPair { clip_id, predicted_sec, ground_truth_sec }` in `tempoHarness.ts:21-28` |
| `val §H5` replay equivalence at harness boundary | Sorted `clip_id` traversal + `sha256OfCanonicalJson(sorted)` `corpus_fingerprint_hex` in `tempoHarness.ts:66-69, 116` |
| Canonical residual record | `TempoResidualRecord` in `tempoHarness.ts:30-37` |
| Honest empty/undersized refusal | `status: "no_corpus" \| "insufficient_corpus" \| "executed"` in `tempoHarness.ts:39-43, 105-109` |
| Canonical anchor inputs per `arch §Missingness rules` | `peak_leg_lift_frame`, `front_foot_strike_frame` consumed via `src/lib/biomech/anchors/peakLegLift.ts`, `anchors/frontFootStrike.ts` |
| Pinned `engine_version` + `reasoning_version` | Fingerprinted via `src/lib/biomech/versions.ts` and `supabase/functions/_shared/biomechFingerprint.ts` |

**Acquisition shape.** ≥ 30 labeled paired-frame examples conforming
to the existing `TempoValidationPair` schema, gathered under the pinned
versions required for `bp §H5` / `val §H5`. No new schema, no new
minimum, no new refusal rule. The no-fabrication doctrine
(Phase 22 F-2 / F-5 / F-6 / F-7; Phase 27 §6; `mem://` Core) forbids
synthesising the corpus.

**Readiness verdict.** The repository is **ready to consume**
EXT-CORPUS the moment it is supplied. The corpus itself is not present.

---

## §4 Existing Repository Readiness

The following surfaces are already shipped and test-covered (Phase 27
§2.3–§2.4; 39 tests passing as of Phase 28 §3) and will consume the §2
and §3 inputs deterministically:

| Surface | File | Role |
|---|---|---|
| D-1 deterministic frame extraction | `src/lib/biomech/frameExtractionDeterministic.ts` | Replay-safe |
| D-3 anchors | `src/lib/biomech/anchors/peakLegLift.ts`, `anchors/frontFootStrike.ts` | Stub-missingness-propagating |
| D-4 detector | `src/lib/biomech/detectors/plantDetector.ts` | Canonical missingness shape |
| D-5 metric engine | `src/lib/biomech/metrics/tempoSec.ts` | Pure, deterministic |
| D-6 evidence artifact | `src/lib/biomech/evidence/tempoEvidence.ts` | Bit-identical `evidence_sha256_hex` |
| Deterministic pipeline | `src/lib/biomech/pipeline/tempoPipeline.ts` | D-3 → D-5 → D-6 wiring |
| Replay-equivalence harness | `src/lib/biomech/replay/tempoReplay.ts` | `val §H5` / `bp §H5` |
| Six-gate matrix | `src/lib/biomech/gates/tempoGateMatrix.ts` | `gate` Part 0 emitter |
| Read-only tile adapter | `src/lib/biomech/reportCard/tempoTileAdapter.ts` | No-fabrication tile mapping |
| Fingerprint binding | `supabase/functions/_shared/biomechFingerprint.ts`, `src/lib/biomech/versions.ts` | Version-pin authority |
| Edge function | `supabase/functions/analyze-video/**` | Intentionally untouched per Phase 27 §1.1 |

No additional code surface is required to consume EXT-MODEL or
EXT-CORPUS.

---

## §5 Existing Validation Readiness

Per Phase 28 §7, `val §H1` and `val §H5` are already met by
`tempoReplay.ts` and the deterministic pipeline. `val §H2` and
`val §H4` are gated solely on EXT-CORPUS (and EXT-MODEL so harness
inputs are non-stub). The harness honestly refuses below 30 pairs
(`tempoHarness.ts:46, 105-109`). No new validation requirement, no new
clause, and no relaxation is needed. **Ready to consume.**

---

## §6 Existing Calibration Readiness

Per Phase 28 §8, `src/lib/biomech/calibration/tempoCalibration.ts`
returns `uncalibrated/no_corpus` until both EXT-MODEL (for the
`cal §4 D-POSE` envelope) and EXT-CORPUS (for the `cal §4 D-PLANT` /
`cal §5` / `cal §6` envelopes) are supplied. The certificate issuance
path per `cal §3.2` is wired but inert. No new calibration clause and
no `in-place re-fit` shortcut is permitted (`gate` Part 0 Demotion
authority hierarchy). **Ready to consume.**

---

## §7 Existing Confidence Readiness

Per Phase 28 §9, `conf §Preamble` one-interaction-away surfacing is
structurally met by the tile adapter. `conf §Detector` and
`conf §Metric` calibrated confidence are wired in
`src/lib/biomech/metrics/confidence.ts:30-45` and await the certificate
hash from §6. No new confidence clause, no fabrication path. **Ready
to consume.**

---

## §8 Existing Gate Readiness

Per Phase 27 §1.2 / §2.3 and Phase 28 §10, `tempoGateMatrix.ts` emits:

| Gate | Status | Driver |
|---|---|---|
| `determinism` | `pass` | Cache-fingerprint stability across 2 runs |
| `replay_equivalence` | `pass` | `tempoReplay.ts` equivalent status |
| `missingness_fidelity` | `pass` | Canonical-enum fidelity assertion |
| `validation` | `block` (`no_corpus`) | Flips on §5 closure |
| `calibration` | `block` (`no_certificate`) | Flips on §6 closure |
| `confidence_calibration` | `block` (`uncalibrated`) | Flips on §7 closure |

`all_pass = false` is the structural reason the tile adapter refuses
pass/fail emission. The three blocking gates are pre-wired to flip
deterministically the moment their upstream inputs (§§5–7, all rooted
in EXT-MODEL and EXT-CORPUS) are present. **Ready to consume.**

---

## §9 Earliest Achievable Truth-Supported Metric

Per Phase 28 §§2, 11, 13, `tempo_sec` (Baseball Pitching, `bp.contract.ts`)
is the unique candidate and the only metric in the Release-1 inventory
with a complete deterministic D-3 → D-5 → D-6 → replay → gate-matrix
→ tile chain in the repository. No other metric (the remaining 29 of
30) carries any of: pipeline, replay harness, gate matrix, or tile
adapter. **Earliest achievable Truth-Supported metric = `tempo_sec`.**

---

## §10 Earliest Achievable Release-1 Report Card

The Release-1 inventory is 30 metric keys (9 `bp` + 21 `bh`,
Phase 27 §5; Phase 28 §2). Only `tempo_sec` has the per-metric
infrastructure of §4 in place. The remaining 29 metrics lack the
deterministic chain, replay harness, gate matrix, and tile adapter
that `tempo_sec` carries, and Phase 29 does not authorise creating
them. Consequently the earliest achievable Release-1 Report Card,
under current repository evidence and current external inputs, is
**1 / 30 Truth Supported metric** (i.e. `tempo_sec` only), conditional
on EXT-MODEL and EXT-CORPUS acquisition. The remaining 29 metrics
remain Unsupported (Phase 28 §2) and lie outside Phase 29's scope.

---

## §11 Remaining External Dependencies

Per Phase 28 §11 closure set, restricted to inputs not derivable inside
the repository:

| Key | Description | Acquisition shape |
|---|---|---|
| **EXT-MODEL** | Non-stub D-POSE evidence source clearing `val §2.1 D-POSE` at ≥ T2 on the golden-clip set, retiring `@0.0.0-stub` in `src/lib/biomech/versions.ts:24-26`, and supplying the `cal §4 D-POSE` residual envelope | External model integration; no fabrication permitted |
| **EXT-CORPUS** | ≥ 30 labeled paired-frame examples conforming to `TempoValidationPair` (`tempoHarness.ts:21-28`) under pinned `engine_version` + `reasoning_version` | External labeling; no fabrication permitted |

Closure-set items 3, 4, 5 of Phase 28 §11 (validation pass,
calibration certificate, calibrated confidence binding) are **not**
external dependencies: they are deterministic derivations through code
paths that already exist (§§4–8) and trigger automatically once
EXT-MODEL and EXT-CORPUS are supplied. There are no other external
dependencies.

---

## §12 Final Determination

**READY FOR EVIDENCE ACQUISITION.**

- The repository's consumption surfaces for EXT-MODEL (§2) and
  EXT-CORPUS (§3) are fully present, test-covered, and wired into the
  deterministic pipeline (§4), validation harness (§5), calibration
  certificate generator (§6), calibrated confidence path (§7), and
  six-gate matrix / tile adapter (§8).
- The two external inputs are finite, well-shaped, and doctrinally
  permitted (Phase 28 §11; `val §H2`; `cal §3.2`; `gate` Part 0).
- No code, doctrine, architecture, metric, detector, anchor,
  validation, calibration, confidence, or gate work stands between the
  arrival of EXT-MODEL + EXT-CORPUS and the deterministic promotion of
  `tempo_sec` to Truth Supported per Phase 21 §2 (§9).
- Earliest achievable Release-1 Report Card under current repository
  evidence is 1 / 30 (§10); the remaining 29 metrics are out of Phase
  29 scope.

The determination is **READY FOR EVIDENCE ACQUISITION** rather than
**PARTIALLY READY** because every Phase 28 §11 closure-set item that
sits inside the repository is already shipped, and the only remaining
work is the supply of the two external inputs whose consumption
surfaces are already in place. The determination is not **NOT READY**
because no missing repository surface, no missing schema, and no
missing doctrinal binding has been identified by this audit.
