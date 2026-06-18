# Canonical Production Gate Matrix — BH Metrics

Phase 9 deliverable. This document defines the production-release authority
governing every detector, anchor, metric, confidence surface, and
report-card output. It introduces **no new metrics, detectors, anchors,
thresholds, harnesses, validation rules, calibration rules, or runtime
behaviors**. Every cell below is a reference to existing requirements
defined in:

- `arch` → `.lovable/canonical-measurement-architecture.md`
- `bp`   → `.lovable/canonical-implementation-blueprint.md`
- `gap`  → `.lovable/canonical-gap-analysis.md`
- `val`  → `.lovable/canonical-validation-framework.md`
- `cal`  → `.lovable/canonical-calibration-architecture.md`
- `conf` → `.lovable/canonical-confidence-architecture.md`
- `aud`  → `.lovable/analysis-truth-audit.md`
- `ext`  → `.lovable/analysis-truth-extraction.md`

---

## Part 0 — Preamble

### Production philosophy
- **Evidence-first**: nothing reaches a production surface without a
  binding to validation evidence, an active calibration certificate, and
  a replay-equivalent confidence value.
- **Replay-equivalent**: every production-eligible output is
  deterministically reproducible under the harness chain defined in
  `val §3` and `bp §H5`.
- **Calibration-bound**: production eligibility requires an unexpired,
  unrevoked calibration certificate within scope per `cal §3`–`cal §6`.
- **Confidence-visible**: every production surface exposes its
  confidence one interaction away per `conf §Preamble` and
  `conf §Report-Card Confidence Architecture`.
- **Missingness-visible**: production never collapses missingness into
  numeric scores; missingness is surfaced via the canonical enum in
  `arch §Missingness rules`.
- **Additive-only**: production gates may tighten over time but never
  silently relax; relaxation requires the validation/calibration/
  confidence path defined in `val §7`, `cal §7`, `conf §Promotion-Demotion`.

### Evidence-first release law
A component is production-eligible **iff** it simultaneously satisfies:

1. Validation status sufficient per `val §7` (Trust-Class Promotion
   Matrix).
2. Calibration status sufficient per `cal §7` (Certificate Authority).
3. Confidence status sufficient per `conf §Promotion-Demotion`.
4. Replay equivalence demonstrated by harness `bp §H5` / `val §H5`.
5. Missingness behaviour conformant with `arch §Missingness rules`.

Failure of any single condition makes the component production-ineligible.
Production never substitutes a partially satisfied condition for any
other; the conditions are conjunctive, not compensatory.

### Promotion authority hierarchy
The promotion chain is fixed and non-reorderable:

```
validation framework  →  calibration certificate  →  confidence binding  →  production gate matrix
        (val)                    (cal)                     (conf)                    (this doc)
```

No surface may issue its own promotion. The production gate matrix is a
**consumer** of upstream authority; it never authors validation,
calibration, or confidence state.

### Demotion authority hierarchy
Demotion is unilateral and inverse: **any single upstream invalidation
demotes the downstream component immediately**. The order of evaluation
is:

```
replay divergence  →  certificate invalidation  →  calibration drift breach
                   →  confidence invalidation   →  missingness routing failure
                   →  dependency failure        →  version migration failure
```

Demotion-before-correction is mandatory per `val §1.5`, `val §7`,
`cal §1.5`, `cal §7`, and `conf §Promotion-Demotion`. Silent recovery,
in-place re-fit, and post-hoc certificate reissue without re-running the
canonical chain are forbidden.

### Release eligibility philosophy
Production surfaces are **presentation-only consumers** of pre-certified
evidence. They never:

- author detector outputs, anchor frames, metric values, or confidences;
- compensate for missing or invalidated upstream evidence;
- promote themselves above the lowest trust class in their dependency
  set (monotonic non-increasing per `conf §Preamble`).

---

## Part 1 — Detector Production Gates

Columns:

- **Val.** — validation status required per `val §2` and `val §7`.
- **Cal.** — calibration status required per `cal §3` and `cal §7`.
- **Conf.** — confidence status required per `conf §Detector` and
  `conf §Promotion-Demotion`.
- **Cert.** — calibration certificate scope required per `cal §3.2`.
- **Replay** — replay-equivalence requirement per `bp §H5` /
  `val §H5`.
- **Miss.** — missingness routing per `arch §Missingness rules`.
- **Prod. eligibility** — minimum trust class required to surface in
  production.
- **Demotion triggers** — events that immediately drop the detector by
  at least one trust class.

| Detector | Val. | Cal. | Conf. | Cert. | Replay | Miss. | Prod. eligibility | Demotion triggers |
|---|---|---|---|---|---|---|---|---|
| **D-POSE**    | `val §2.1 D-POSE` cleared at ≥T2 on golden-clip set | `cal §4 D-POSE` residual envelope active | `conf §Detector D-POSE` monotonic, calibration-bound | scope (segment, frame-density, device) per `cal §3.2` | bit-identical per `bp §H5` | `pose_not_detected` per `arch §Missingness` | ≥T2 per `val §7`, `cal §7`, `conf §Promotion-Demotion` | replay divergence; cert expiry/revocation per `cal §6.4`; landmark visibility drift breach per `cal §Drift §Breach`; confidence monotonicity violation per `conf §Detector` |
| **D-HANDS**   | `val §2.1 D-HANDS` cleared | `cal §4 D-HANDS` residual envelope active | `conf §Detector D-HANDS` | per `cal §3.2` | per `bp §H5` | `hands_not_detected` per `arch §Missingness` | ≥T2 | replay divergence; cert invalidation; drift breach; confidence collapse |
| **D-BAT**     | `val §2.1 D-BAT` cleared | `cal §4 D-BAT` (knob/mid/barrel-tip) residual envelope active | `conf §Detector D-BAT` | per `cal §3.2` incl. pixel-to-inch scaling for `bat_speed_contact` | per `bp §H5` | `bat_not_detected` per `arch §Missingness` | ≥T2 | replay divergence; cert invalidation; pixel-scale drift breach per `cal §Drift`; confidence monotonicity violation |
| **D-BALL**    | `val §2.1 D-BALL` cleared (uplift component) | `cal §4 D-BALL` Kalman residual envelope active | `conf §Detector D-BALL` (uplift) | per `cal §3.2` | per `bp §H5` | `ball_not_detected` per `arch §Missingness` | ≥T2 where used; uplift-only surfaces ungated per `arch §10 bat_path` | replay divergence; cert invalidation; track-quality drift breach |
| **D-CONTACT** | `val §2.1 D-CONTACT` cleared on labeled contacts | `cal §4 D-CONTACT` frame-index residual envelope active | `conf §Detector D-CONTACT` | per `cal §3.2` | per `bp §H5` | `contact_frame_missing` per `arch §Missingness` | ≥T2 | replay divergence; cert invalidation; frame-residual drift breach |
| **D-PLANT**   | `val §2.1 D-PLANT` cleared on labeled plants | `cal §4 D-PLANT` frame-index residual envelope active | `conf §Detector D-PLANT` | per `cal §3.2` | per `bp §H5` | `front_foot_first_contact_missing`, `front_foot_full_plant_missing` per `arch §Missingness` | ≥T2 | replay divergence; cert invalidation; frame-residual drift breach |
| **D-RELEASE** | `val §2.1 D-RELEASE` cleared on labeled releases per `arch §3, §7` | `cal §4 D-RELEASE` frame-index residual envelope active | `conf §Detector D-RELEASE` | per `cal §3.2` | per `bp §H5` | `pitcher_release_frame_missing` per `arch §Missingness` | ≥T2 | replay divergence; cert invalidation; frame-residual drift breach |

---

## Part 2 — Anchor Production Gates

Anchors are derived events. Anchor production eligibility requires the
underlying detector(s) to be production-eligible **and** the anchor's
own validation, calibration, confidence, and replay conditions to hold.

| Anchor | Required detector eligibility | Validation | Calibration | Confidence | Replay | Prod. eligibility | Demotion triggers |
|---|---|---|---|---|---|---|---|
| **Launch** (`swing_initiation`) | D-POSE ≥T2 **and** D-BAT ≥T2 | `val §2.2 Launch` frame-index harness | `cal §5 Launch` residual envelope active | `conf §Anchor Launch` calibration-bound monotonic | `bp §H5` | ≥T2 | any required detector demotion; anchor frame-residual drift breach per `cal §Drift`; cert invalidation; replay divergence |
| **Heel Plant** (`front_foot_first_contact` / `front_foot_full_plant`) | D-POSE ≥T2 **and** D-PLANT ≥T2 | `val §2.2 Heel Plant` | `cal §5 Heel Plant` | `conf §Anchor Heel Plant` | `bp §H5` | ≥T2 | detector demotion; frame-residual drift breach; cert invalidation; replay divergence |
| **Contact** (`contact_frame`) | D-POSE ≥T2 **and** D-BAT ≥T2 **and** D-CONTACT ≥T2 | `val §2.2 Contact` | `cal §5 Contact` | `conf §Anchor Contact` | `bp §H5` | ≥T2 | detector demotion; frame-residual drift breach; cert invalidation; replay divergence |
| **Release** (`pitcher_release_frame`) | D-RELEASE ≥T2 (and D-POSE ≥T2 where pose-assisted) | `val §2.2 Release` | `cal §5 Release` | `conf §Anchor Release` | `bp §H5` | ≥T2 | D-RELEASE demotion; frame-residual drift breach; cert invalidation; replay divergence |
| **Finish** (`finish_frame`) | D-POSE ≥T2 | `val §2.2 Finish` stillness harness | `cal §5 Finish` | `conf §Anchor Finish` | `bp §H5` | ≥T2 | D-POSE demotion; stillness-window drift breach; cert invalidation; replay divergence |

Anchor missingness must surface using the corresponding
`*_missing` enum per `arch §Missingness rules`. No anchor may
substitute an inferred frame for a missing one.

---

## Part 3 — Metric Production Gates

All 18 canonical BH metrics from `arch §Part 2`. Each metric requires
its dependency set (detectors and anchors) to be production-eligible
**plus** its own validation, calibration, confidence, replay,
missingness, and certificate conditions.

Columns are abbreviated; every cell references existing requirements only.

| # | Metric (`arch §`) | Required detectors | Required anchors | Validation | Calibration | Confidence | Replay | Missingness | Certificate | Prod. eligibility | Demotion triggers |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `hip_load` (§1) | D-POSE | — | `val §H1` deterministic + `val §H2` ground-truth | `cal §6 hip_load` scale-free; landmark-visibility prior | `conf §Metric hip_load` product per `arch §Confidence model` | `bp §H5` | `pose_not_detected`, `insufficient_temporal_resolution` | per `cal §3.2` D-POSE scope | ≥T2 | dependency demotion; replay divergence; cert invalidation; confidence breach |
| 2 | `hand_load` (§2) | D-POSE | — | `val §H1` + `val §H2` | `cal §6` scale-free | `conf §Metric hand_load` | `bp §H5` | `pose_not_detected` | D-POSE scope | ≥T2 | as above |
| 3 | `p2_timing` ★ (§3) | D-POSE, D-RELEASE | Release, `hand_load_apex` | `val §H1`+`H2`+`H4` (deadband legality) | `cal §6` timing residual envelope per `cal §5 Release` | `conf §Metric p2_timing` | `bp §H5` | `pitcher_release_frame_missing`, `pose_not_detected` | D-POSE+D-RELEASE scope | ≥T2; ineligible until D-RELEASE ≥T2 per `arch §3 production-readiness` | dependency demotion; deadband/slope drift breach; replay divergence |
| 4 | `eyes_tracking` (§4) | D-POSE; D-BALL (uplift) | — | `val §H1`+`H2`; uplift component per `val §H2 D-BALL` | `cal §6` scale-free; D-BALL uplift bound | `conf §Metric eyes_tracking` | `bp §H5` | `pose_not_detected`; uplift falls back when `ball_not_detected` | per `cal §3.2` | ≥T2; uplift surfaces gated by D-BALL ≥T2 | dependency demotion; replay divergence |
| 5 | `stride_direction` (§5) | D-POSE | Heel Plant | `val §H1`+`H2` | `cal §6` scale-free | `conf §Metric stride_direction` | `bp §H5` | `front_foot_*_missing`, `pose_not_detected` | D-POSE scope | ≥T2 | dependency demotion; replay divergence |
| 6 | `heel_plant` (§6) | D-POSE | Heel Plant | `val §H1`+`H2` | `cal §6` scale-free | `conf §Metric heel_plant` | `bp §H5` | `front_foot_*_missing` | D-POSE scope | ≥T2 | as above |
| 7 | `p3_timing` ★ (§7) | D-POSE, D-RELEASE, D-PLANT | Release, Heel Plant | `val §H1`+`H2`+`H4` | `cal §6` timing residual envelope | `conf §Metric p3_timing` | `bp §H5` | `pitcher_release_frame_missing`, `front_foot_*_missing` | full scope | ≥T2; ineligible until D-RELEASE ≥T2 per `arch §7` | dependency demotion; deadband drift breach; replay divergence |
| 8 | `hands_outside_shoulders_at_landing` ★ (§8) | D-POSE | Heel Plant | `val §H1`+`H2` boolean harness | `cal §6` scale-free | `conf §Metric hands_outside_shoulders_at_landing` | `bp §H5` | `pose_not_detected`, `front_foot_*_missing` | D-POSE scope | ≥T2 | dependency demotion; replay divergence |
| 9 | `sequencing` (§9) | D-POSE, D-BAT | Launch | `val §H1`+`H2`+`H4` | `cal §6` scale-free | `conf §Metric sequencing` | `bp §H5` | `pose_not_detected`, `bat_not_detected` | D-POSE+D-BAT scope | ≥T2; ineligible until D-BAT ≥T2 | dependency demotion; replay divergence |
| 10 | `bat_path` ★ (§10) | D-BAT, D-POSE; D-BALL (uplift) | Launch, Contact | `val §H1`+`H2`+`H4` plane harness | `cal §6` plane prior per `arch §10`; D-BALL uplift bound | `conf §Metric bat_path` | `bp §H5` | `bat_not_detected`, anchor `*_missing` | full scope | ≥T2; ineligible until D-BAT ≥T2 per `arch §10` | D-BAT/D-POSE demotion; plane-prior drift breach; replay divergence |
| 11 | `on_plane` ★ (§11) | D-BAT, D-POSE; D-BALL (uplift) | Launch, Contact | `val §H1`+`H2`+`H4` | `cal §6` plane prior shared with `bat_path` | `conf §Metric on_plane` | `bp §H5` | as `bat_path` | full scope | ≥T2; ineligible until D-BAT ≥T2 | as `bat_path` |
| 12 | `time_to_contact` ★ (§12) | D-POSE, D-BAT | Launch, Contact | `val §H1`+`H2`+`H4` | `cal §6` timing residual envelope | `conf §Metric time_to_contact` | `bp §H5` | `contact_frame_missing`, `swing_initiation_missing` | full scope | ≥T2; ineligible until D-CONTACT ≥T2 | dependency demotion; frame-residual drift breach; replay divergence |
| 13 | `bat_speed_contact` ★ (§13) | D-BAT, D-POSE | Contact | `val §H1`+`H2`+`H4`; **mandatory metric scaling** per `arch §13` | `cal §6 bat_speed_contact` **mandatory pixel-to-inch scaling** vs user-entered bat-length prior per `cal §Detectors D-BAT` | `conf §Metric bat_speed_contact` includes calibration_confidence factor per `arch §Confidence model` | `bp §H5` | `contact_frame_missing`, `bat_not_detected`, `calibration_unavailable` per `arch §Missingness` | D-BAT scope **and** bat-length prior present per `arch §13` | ≥T2; ineligible without active scaling certificate | scaling cert invalidation; D-BAT demotion; pixel-scale drift breach; replay divergence |
| 14 | `back_elbow_contact` ★ (§14) | D-POSE, D-BAT | Contact | `val §H1`+`H2`+`H4` | `cal §6` scale-free | `conf §Metric back_elbow_contact` | `bp §H5` | `contact_frame_missing`, `pose_not_detected`, `bat_not_detected` | full scope | ≥T2 | dependency demotion; replay divergence |
| 15 | `hitters_move` (§15) | inherits from constituents per `arch §15` | inherits | `val §H1`+`H2`+`H4` composite per constituents | `cal §6` composite (no new prior) | `conf §Metric hitters_move` aggregation per `arch §Confidence model` | `bp §H5` | inherits constituent missingness | inherits | ≥T2 only if **all** constituents ≥T2 per `conf §Preamble` monotonic non-increasing | demotion of any constituent; replay divergence |
| 16 | `shoulder_plane_steadiness` (§16) | D-POSE | — | `val §H1`+`H2` | `cal §6` scale-free | `conf §Metric shoulder_plane_steadiness` | `bp §H5` | `pose_not_detected` | D-POSE scope | ≥T2 | dependency demotion; replay divergence |
| 17 | `finish_balance` (§17) | D-POSE | Finish | `val §H1`+`H2` | `cal §6` scale-free | `conf §Metric finish_balance` | `bp §H5` | `finish_frame_missing`, `pose_not_detected` | D-POSE scope | ≥T2 | dependency demotion; stillness drift breach; replay divergence |
| 18 | `shoulder_to_shoulder_hold` (§18) | D-POSE | Finish | `val §H1`+`H2` | `cal §6` scale-free | `conf §Metric shoulder_to_shoulder_hold` | `bp §H5` | `finish_frame_missing`, `pose_not_detected` | D-POSE scope | ≥T2 | dependency demotion; replay divergence |

Per `arch §Production-readiness gate`, no metric is production-eligible
unless every detector and anchor it depends on independently satisfies
this gate. The `bat_speed_contact` scaling requirement is non-waivable
and resolves audit item S5 per `arch §Production-readiness gate` /
`aud §S5`.

---

## Part 4 — Report Card Production Gates

Report-card outputs are **presentation-only consumers** per
`conf §Report-Card Confidence Architecture`. They never author truth.

| Surface | Eligibility | Dependency requirements | Replay | Production requirements | Demotion triggers |
|---|---|---|---|---|---|
| **Phase percentages** (P1–P4) | all constituent metrics in the phase production-eligible per Part 3 | metric set per `arch §Part 2` and `arch §Part 4 summary` | `bp §H5` deterministic phase rollup | denominator resolution per `gap §D` and `val §5` (dual-denominator bug closed); confidence aggregation per `conf §Report Card / Phase percentages` | any constituent metric demotion; denominator misroute; replay divergence |
| **Phase orbs** | mapped from phase percentage state per `conf §Report Card / Phase orbs` | inherits Phase percentages | `bp §H5` | orb state transitions deterministic; confidence-bound presentation | phase percentage demotion; replay divergence |
| **Tile states** | per-metric tile renderable only if its metric is production-eligible per Part 3 | metric eligibility | `bp §H5` | tile must be `score_meter` with asymmetric deadband where required per `arch §Part 2`; missingness rendered explicitly per `arch §Missingness rules` | metric demotion; missingness routing failure; replay divergence |
| **Ribbon generation** | requires Phase percentages + Tile states production-eligible | inherits | `bp §H5` | deterministic ribbon under pinned engine_version + reasoning_version per `bp §F1` | upstream demotion; replay divergence |
| **Confidence surfacing** | always-on per `conf §Preamble` (confidence one interaction away) | binds to every metric/anchor/detector confidence value | `bp §H5` | no smoothing, no fabrication, no collapse per `conf §Preamble` | confidence monotonicity violation; cert invalidation; replay divergence |
| **Missingness surfacing** | always-on per `arch §Missingness rules` | enum bound to detector/anchor/metric missingness | `bp §H5` | missingness never collapsed into numeric scores per `conf §Report Card` | missingness routing failure; replay divergence |
| **Coaching layer** | **presentation-only** consumer per `cal §Administrative logic`, `conf §Report Card / Coaching` | requires Phase percentages, Tile states, Confidence surfacing, Missingness surfacing all production-eligible | `bp §H5` | may never author detectors, anchors, metrics, confidences, or certificates per `cal §Administrative logic` | any upstream demotion; replay divergence; attempted authorship event |

---

## Part 5 — Promotion Authority Matrix

Each cell references existing `val §7`, `cal §7`, and
`conf §Promotion-Demotion` requirements only. **No new gates are
introduced.** The trust-class ladder is the one already defined in
`val §7` and `cal §7`.

### 5.1 Detectors

| Transition | Required artifacts |
|---|---|
| **T0 → T1** | `val §7 T0→T1` detector entry: harness `val §H1` deterministic pass; `cal §7 T0→T1` provisional residual envelope recorded; `conf §Promotion-Demotion T0→T1` confidence emission contract present |
| **T1 → T2** | `val §7 T1→T2` detector entry: `val §H2` ground-truth pass on golden-clip set; `cal §7 T1→T2` certificate issued in scope per `cal §3.2`; `conf §T1→T2` confidence monotonicity validated via `val §H3` |
| **T2 → T3** | `val §7 T2→T3` detector entry: `val §H5` replay-equivalence pass; `cal §7 T2→T3` certificate stable across drift window per `cal §Drift`; `conf §T2→T3` confidence stable across replay |
| **T3 → T4** | `val §7 T3→T4` detector entry: long-window replay equivalence + drift-watch clear per `cal §7 T3→T4`; `conf §T3→T4` confidence reliability curve certified per `val §H3` |

### 5.2 Anchors

| Transition | Required artifacts |
|---|---|
| **T0 → T1** | underlying detector(s) ≥T1; `val §7 T0→T1` anchor frame-index harness deterministic; `cal §7 T0→T1` provisional residual recorded; `conf §T0→T1` anchor confidence emitted |
| **T1 → T2** | underlying detector(s) ≥T2; `val §7 T1→T2` anchor ground-truth pass; `cal §7 T1→T2` anchor certificate; `conf §T1→T2` monotonicity validated |
| **T2 → T3** | underlying detector(s) ≥T3; anchor `val §H5` replay equivalence; `cal §7 T2→T3` drift-stable; `conf §T2→T3` replay-stable |
| **T3 → T4** | underlying detector(s) ≥T4; long-window replay + drift-watch clear; confidence reliability certified |

### 5.3 Metrics

| Transition | Required artifacts |
|---|---|
| **T0 → T1** | all required detectors and anchors ≥T1; `val §7 T0→T1` metric deterministic harness pass (`val §H1`); `cal §7 T0→T1` provisional metric calibration recorded (incl. mandatory scaling for `bat_speed_contact`); `conf §T0→T1` metric confidence emission contract present |
| **T1 → T2** | all required detectors and anchors ≥T2; `val §7 T1→T2` ground-truth harness (`val §H2`); `cal §7 T1→T2` metric certificate in scope; `conf §T1→T2` aggregation operator validated per `arch §Confidence model` |
| **T2 → T3** | all required detectors and anchors ≥T3; `val §H4` deadband-legality pass where applicable; `cal §7 T2→T3` drift-stable; `conf §T2→T3` replay-stable monotonic non-increasing |
| **T3 → T4** | all required detectors and anchors ≥T4; long-window replay equivalence per `val §H5`; drift-watch clear per `cal §7 T3→T4`; reliability curve certified |

### 5.4 Report-card outputs

| Transition | Required artifacts |
|---|---|
| **T0 → T1** | minimum constituent metric set production-eligible at ≥T1; `gap §D` denominator policy in force; `conf §Report Card` presentation contract present |
| **T1 → T2** | constituent metric set ≥T2; ribbon/tile/orb determinism validated per `bp §H5`; coaching layer confirmed presentation-only per `cal §Administrative logic` |
| **T2 → T3** | constituent metric set ≥T3; replay equivalence across surfaces; confidence and missingness surfaces lineage-complete |
| **T3 → T4** | constituent metric set ≥T4; long-window replay + drift-watch clear; coaching layer authorship-violation watchdog clean over the same window |

Per `conf §Preamble` monotonic non-increasing, **no aggregate may
exceed the minimum trust class of its dependency set**.

---

## Part 6 — Production Demotion Matrix

Each row is an existing failure class. Each cell references existing
trust-class behaviour. **No new failure types, thresholds, or
recovery paths are introduced.**

| Failure class | Source | Detectors | Anchors | Metrics | Report-card outputs |
|---|---|---|---|---|---|
| **Dependency failure** | `conf §Preamble` monotonic non-increasing | demoted to minimum class of failed dependency | demoted to minimum class of failed detector(s) | demoted to minimum class of failed detector/anchor | demoted to minimum class of failed constituent |
| **Certificate invalidation** | `cal §6.4` revocation/expiry/scope mismatch | drop by ≥1 class; ineligible until reissue per `cal §7` | inherit detector demotion; anchor cert reissue per `cal §5` | inherit; `bat_speed_contact` immediately ineligible if scaling cert lost | inherit; ribbon/tile/coaching ineligible while any constituent cert invalid |
| **Replay divergence** | `bp §H5` / `val §H5` | drop by ≥1 class; quarantine until replay-equivalent | inherit detector; re-validate frame indices | inherit; re-run `val §H1`+`H5` | inherit; all surfaces drop to lowest constituent class |
| **Calibration drift breach** | `cal §Drift §Severity / §Breach` | automatic demotion by one trust class; current certificate invalidated per `cal §Drift` | inherit detector; re-validate anchor residual envelope | inherit; metric ineligible while drift breached | inherit; surfaces drop accordingly |
| **Confidence invalidation** | `conf §Promotion-Demotion / Failure conditions` | demoted on monotonicity violation, fabrication, or reliability-curve breach | inherit detector; anchor confidence re-validated via `val §H3` | inherit; aggregation re-validated per `arch §Confidence model` | inherit; surfaces lose confidence-surfacing eligibility |
| **Missingness routing failure** | `arch §Missingness rules` / `conf §Report Card / Missingness` | demoted if detector emits numeric value where enum required | inherit detector; anchor `*_missing` enum required | inherit; metric ineligible if missingness collapsed into score | inherit; missingness surface mandatory — failure demotes all dependent surfaces |
| **Version migration failure** | `bp §F1` engine_version + reasoning_version pin / `val §H6` Version migration | demoted until re-validated under new pin | inherit detector; re-validate under new pin | inherit; re-validate `val §H1`+`H2`+`H5` under new pin | inherit; surfaces ineligible until all constituents re-pinned |

Demotion is **immediate** on detection, **propagates** monotonically
through dependents per `conf §Preamble`, and **recovers only** by
re-traversing the full promotion chain in Part 5. Silent re-fit,
in-place certificate reissue without re-running `val §H5`, and
coaching-layer override of demotion are all forbidden per
`cal §1.5`, `val §1.5`, `conf §Promotion-Demotion`.

---

## Closing Constraints

- This document defines **production-gate architecture only**.
- No code, schema, prompts, UI, runtime behavior, roadmap, sequencing,
  prioritization, owners, or estimates are introduced.
- No changes are made to `arch`, `bp`, `gap`, `val`, `cal`, or `conf`.
- No new metrics, detectors, anchors, thresholds, harnesses, validation
  rules, calibration rules, or confidence rules are invented.
- Every gate is a reference to existing canonical requirements; every
  promotion and demotion path is fully traceable upstream to `val §7`,
  `cal §7`, and `conf §Promotion-Demotion`.
- The 18 BH metric set, the 7 detectors (`D-POSE`, `D-HANDS`, `D-BAT`,
  `D-BALL`, `D-CONTACT`, `D-PLANT`, `D-RELEASE`), and the 5 anchors
  (Launch, Heel Plant, Contact, Release, Finish) are reproduced verbatim
  from `arch §Canonical detector stack`, `arch §Event anchors`, and
  `arch §Part 2`; no membership change is introduced.
