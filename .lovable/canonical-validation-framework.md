# Phase 6 — Canonical Validation Framework

Defines how every detector, anchor, metric, confidence score, and
report-card surface defined by the prior phases is validated and
promoted between trust classes. Citations only. No new methodology,
no new components, no roadmap.

**Citation shortcuts**
- `arch P#.§` → `.lovable/canonical-measurement-architecture.md`
- `bp §X` → `.lovable/canonical-implementation-blueprint.md`
- `gap §X` → `.lovable/canonical-gap-analysis.md`
- `audit S#` → `.lovable/analysis-truth-audit.md`
- `extract §#` → `.lovable/analysis-truth-extraction.md`

---

## 1. Preamble

### 1.1 Purpose
Establish the canonical rules under which any component built per
the blueprint (`bp §A–§I`) and listed in the gap inventory
(`gap §F`) progresses from concept (T0) to production-ready (T4).
Validation is the single mechanism by which a component earns the
right to be surfaced to users; nothing else grants that right.

### 1.2 Validation philosophy
1. **Evidence supremacy.** A component's trust class is the class
   whose evidence requirements it actually meets. Intent, design
   completeness, and reviewer opinion do not promote a class.
2. **Deterministic-first.** Determinism gates (`bp §F1–§F6`) precede
   correctness gates. A non-deterministic component cannot reach T2
   regardless of accuracy, because accuracy is unverifiable without
   replay (`bp §H5`).
3. **Missingness-visible.** A component that cannot produce a value
   must emit a canonical missingness reason (`arch P0` enum). Silent
   defaults, umbrella `single_pass_only`, or fabricated values
   (`audit S8`; `gap §D`) cannot reach T1.
4. **Replay-equivalent.** Promotion to T3 or above requires byte-equal
   replay over the canonical trace fingerprint (`bp §F5`, `§H5`).
5. **Additive promotion.** Each class adds requirements; none are
   removed. A T3 component must still satisfy every T1 and T2 gate.
6. **Demotion-on-regression.** Any gate failure observed in production,
   harness, or replay forces immediate demotion to the highest class
   whose gates still hold (§1.5).

### 1.3 Trust-class promotion law
- Classes T0 ≤ T1 ≤ T2 ≤ T3 ≤ T4 are monotone in evidence.
- Promotion from class N to class N+1 requires every gate listed for
  N+1 in §2/§3/§4/§5 to pass and every prior-class gate to remain
  passing.
- A component may not skip classes. A T1 component cannot be promoted
  directly to T3 even if T3 evidence exists; the T2 gates must be
  satisfied first so that the missing evidence is recorded as such.
- Promotion is decided by the harness matrix (§6), not by reviewer
  judgement.

### 1.4 Universal promotion preconditions
Apply to all detectors, anchors, metrics, and report-card surfaces.
- Pinned identity: every component carries an immutable version
  identifier (`bp §F1`); `@0.0.0-stub` placeholders (`audit S3`) are
  disqualifying.
- Deterministic seed: derived inputs use
  `stableSeed(canonical_trace_fingerprint)` (`bp §F3`; `gap §C`),
  never `stableSeed(videoId)` (`audit S5`).
- Cache-key conformance: any cached artefact is keyed by
  `(video_sha256_hex, cache_fingerprint_hex)` (`bp §F2`/`§F4`;
  `gap §C`).
- Canonical missingness routing: any not-produced output emits an
  `arch P0` enum value with human-readable cause (`gap §D`).
- Confidence exposure: every produced output exposes a confidence
  value in `[0,1]` derived per the canonical confidence model
  (`arch P0 confidence model`; `bp §E1`).

### 1.5 Demotion triggers
A component is demoted to the highest class whose gates still hold
when any of the following are observed:
1. Replay divergence on the canonical trace fingerprint
   (`bp §F5`/`§H5`).
2. Version-pin breakage — a dependency's pinned version changes
   without the version-migration harness re-passing (§6.7).
3. Determinism harness failure (`bp §H1`).
4. Golden-clip pass-rate falling below the per-component floor
   (`bp §H2`).
5. Confidence calibration drift outside the calibration tolerance
   (`bp §H3`).
6. Missingness audit finding any non-enum reason in production
   (`bp §H4`; `gap §D`).
7. AI residual envelope breach — residual exceeds the ±10 bound or
   the deterministic value (`bp §D20`; `gap §C`).
8. Silent-default fall-through detected (e.g., `efficiency_score=75`,
   `feedback="No feedback available"`, `/\d+\/100/` text scan;
   `audit S8`).

### 1.6 Validation evidence hierarchy
Ranked from highest authority to lowest. Higher-ranked evidence
supersedes lower when in conflict.
1. **Replay-determinism proof** (`bp §H5`) — bit-identical re-run
   over canonical trace fingerprint.
2. **Golden-clip ground truth** (`bp §H2`) — labelled clips with
   per-component pass-rate floors.
3. **Calibration certificate** (`arch P1 calibration framework`) —
   bat-length prior, pixel-to-inch scaler, strike-zone reconstruction,
   swing-plane prior, plate-line reference.
4. **Confidence-calibration curve** (`bp §H3`) — predicted confidence
   tracks observed accuracy within tolerance.
5. **Missingness-routing audit** (`bp §H4`) — every produced missing
   value traces to a canonical enum reason.
6. **Human-labeled spot check** — bounded sample for sanity, never
   substitutable for golden clips.
7. **AI residual envelope check** (`bp §D20`) — bounded ±10, seeded,
   temperature 0; presenter-only role (`bp §E4`; `gap §D`).

---

## 2. Detector Validation Framework

Class semantics are uniform across detectors. The per-detector rows
record the inputs to the gates rather than restating the gates.

**Uniform class definitions**
- **T0** — Absent or stub. Baseline per `audit S3` (`@0.0.0-stub`
  version constants) and `gap §B` (all seven detectors marked
  Missing).
- **T1** — Wired at a real pinned version (`bp §F1`); emits per-frame
  output conforming to the detector's blueprint contract
  (`bp §B1–§B7`); no calibration certificate required; no replay
  evidence required; per-keypoint visibility exposed.
- **T2** — Passes Determinism Harness (`bp §H1`) on the canonical
  fixture; per-keypoint confidence exposed in `[0,1]`
  (`arch P0 confidence model`); missingness routes to enum reasons
  `landmark_occluded`, `out_of_frame`, `low_confidence`, or
  `detector_unavailable` (`arch P0`).
- **T3** — Passes Golden-Clip Suite (`bp §H2`) at the detector's
  pass-rate floor; passes Confidence Calibration Harness (`bp §H3`);
  calibration certificate present where the detector's outputs feed
  a calibrated metric (`arch P1`); passes Replay Harness (`bp §H5`)
  bit-equal across two runs.
- **T4** — Passes all blueprint §I gates applicable to a detector
  (detector, frame-density, confidence, determinism, golden clips,
  replay); gateway/runtime determinism verified end-to-end; Version
  Migration Harness (§6.7) green for the pinned version.

| Detector | Required evidence (per class, additive) | Required replay stability | Required determinism proof | Required confidence thresholds |
|---|---|---|---|---|
| D-POSE (`bp §B1`) | T1: 33-landmark per-frame output at pinned Blazepose Full version. T2: H1 pass on fixture. T3: H2 pass at pose pass-rate floor; H3 pass. T4: §I gates (all rows depending on D-POSE). | T3+: bit-equal landmark coords across two runs over same trace (`bp §H5`). | T2+: H1 over canonical fixture (`bp §H1`). | T2+: per-landmark visibility exposed. T3+: visibility floor enforced before downstream consumption (`arch P0 confidence model`). |
| D-HANDS (`bp §B2`) | T1: 21-keypoint per-hand at pinned version. T2: H1 pass. T3: H2 pass at hand-keypoint pass-rate floor; H3 pass. T4: §I gates for `hand_load`, `p2_timing` chain. | T3+: bit-equal hand keypoints over same trace. | T2+: H1 on fixture. | T2+: per-keypoint confidence exposed. T3+: minimum confidence required for the `hand_load_peak_frame` anchor to bind. |
| D-BAT (`bp §B3`) | T1: barrel knob + tip per frame at pinned CNN version. T2: H1 pass. T3: H2 pass at barrel pass-rate floor; H3 pass; calibration certificate when feeding `bat_speed_contact` (`arch P1`). T4: §I gates for `bat_path`, `on_plane`, `sequencing`, `bat_speed_contact`, `back_elbow_contact`. | T3+: bit-equal barrel coords across two runs. | T2+: H1 on fixture. | T2+: per-keypoint confidence exposed. T3+: floor required for barrel-axis computation. |
| D-BALL (`bp §B4`) | T1: pitched-ball track at pinned version. T2: H1 pass. T3: H2 pass at ball pass-rate floor. T4: §I gates where used (uplift only; not blocking; `gap §B`). | T3+: bit-equal ball track across two runs. | T2+: H1 on fixture. | T2+: per-frame detection confidence. |
| D-CONTACT (`bp §B5`) | T1: contact-frame emission at pinned version. T2: H1 pass. T3: H2 pass at contact-frame pass-rate floor; H3 pass; replay bit-equal. T4: §I gates for `time_to_contact`, `bat_speed_contact`, `back_elbow_contact`. | T3+: bit-equal `contact_frame.frame_index` and `t_ms` across two runs (`bp §H5`). | T2+: H1 on fixture. | T2+: confidence on detected contact; below floor → `anchor_not_detected`. |
| D-PLANT (`bp §B7`) | T1: plant-frame emission at pinned version. T2: H1 pass. T3: H2 pass at plant pass-rate floor; H3 pass. T4: §I gates for `heel_plant`, `p3_timing`. | T3+: bit-equal `front_foot_plant_frame` / `heel_contact_frame` across runs. | T2+: H1 on fixture. | T2+: confidence on detected plant; below floor → `anchor_not_detected`. |
| D-RELEASE (`bp §B6`) | T1: pitcher release-frame emission at pinned version. T2: H1 pass. T3: H2 pass at release pass-rate floor; H3 pass. T4: §I gates for `p2_timing`, `p3_timing`. | T3+: bit-equal `pitcher_release_frame` and `pitcher_knee_lift_frame` across runs. | T2+: H1 on fixture. | T2+: confidence on detected release; below floor → `anchor_not_detected`. |

---

## 3. Anchor Validation Framework

Rows are the canonical anchor names from `bp §C` and `gap §F`. Where
the user-facing label differs (e.g., "Launch", "Heel Plant"), it
maps to the canonical anchor frame as noted.

**Uniform class definitions**
- **T0** — Not produced; AI is asked to locate from ≤7 frames
  (`audit S7`, `S10 #3,#7,#8,#9`).
- **T1** — Source detector(s) at T1+; anchor emits the canonical
  schema `{frame_index, t_ms, confidence, source_detector,
  contributing_signals[]}` (`bp §C`).
- **T2** — Anchor passes Determinism Harness (`bp §H1`) — same trace
  → same `frame_index` and `t_ms`; missingness routes to
  `anchor_not_detected` when source-detector confidence is below
  floor (`arch P0`).
- **T3** — Anchor passes Golden-Clip Suite at the per-anchor frame
  tolerance defined per blueprint §H2 for the active frame-density
  tier (T-low / T-mid / T-high; `arch P1 frame-density tiers`);
  confidence calibration in tolerance (`bp §H3`).
- **T4** — All `bp §I` anchor-row gates pass; replay-equivalent
  end-to-end including downstream metric consumers (`bp §H5`).

| Anchor (canonical → label) | Validation requirements | Replay requirements | Tolerance requirements | Confidence requirements | Promotion criteria |
|---|---|---|---|---|---|
| `launch_frame` → Launch | Bound to D-POSE; schema-complete; contributing signals enumerated (`bp §C`). | T2+: bit-equal `frame_index`, `t_ms` across two runs (`bp §H5`). | T3+: within blueprint §H2 tolerance for active frame-density tier. | T2+: emitted confidence ∈ [0,1]; below floor → `anchor_not_detected`. | T0→T4 ladder per §1.3; depends on D-POSE ≥ T2 (T3 for T3+). |
| `heel_contact_frame` → Heel Plant | Bound to D-POSE + D-PLANT; schema-complete. | T2+: bit-equal across runs. | T3+: within §H2 tolerance per tier. | T2+: confidence floor enforced; `anchor_not_detected` on miss. | Requires D-PLANT ≥ T2 (T3 for T3+). |
| `contact_frame` → Contact | Bound to D-CONTACT (primary), D-BAT + D-BALL (contributing); schema-complete. | T2+: bit-equal `frame_index`, `t_ms`. | T3+: per-tier §H2 tolerance; T-high required for T3 on velocity-dependent consumers (`arch P3 frame-rate sensitivity`). | T2+: floor enforced. | Requires D-CONTACT ≥ T2 (T3 for T3+); D-BAT ≥ T2 for contributing-signal credit. |
| `pitcher_release_frame` → Release | Bound to D-RELEASE (primary), D-POSE (pitcher skeleton). | T2+: bit-equal across runs. | T3+: per-tier §H2 tolerance. | T2+: floor enforced; `anchor_not_detected` when pitcher out of frame. | Requires D-RELEASE ≥ T2 (T3 for T3+). |
| `finish_frame` → Finish | Bound to D-POSE; post-contact window per `arch P2 §17`. | T2+: bit-equal across runs. | T3+: per-tier §H2 tolerance. | T2+: floor enforced. | Requires D-POSE ≥ T2 (T3 for T3+). |

Other anchors enumerated in `gap §F` (`swing_start_frame`,
`pitcher_knee_lift_frame`, `front_foot_plant_frame`,
`stride_landing_frame`, `hand_load_peak_frame`, `load_peak_frame`,
plus the four kinetic-chain peak-velocity anchors) follow the same
ladder; their per-anchor frame tolerances are the values recorded
in `bp §H2`, not redefined here.

---

## 4. Metric Validation Framework

**Uniform class definitions** (apply to every BH metric below)
- **T0** — Fabricated / AI-only producer (`audit S2`, `S11`).
- **T1** — Detector dependency wired (per `gap §A`); producer
  replaced from AI-only to deterministic-engine-with-AI-residual
  (`bp §D20`); no calibration evidence yet.
- **T2** — Deterministic engine output passes Determinism Harness
  (`bp §H1`); missingness routes to canonical enum reasons
  applicable to the metric (`arch P0`); confidence value emitted
  in `[0,1]` (`arch P0`).
- **T3** — Calibration certificate present where required by
  `arch P1`; Confidence Calibration Harness pass (`bp §H3`);
  Golden-Clip Suite pass at the per-metric pass-rate floor
  (`bp §H2`); Replay Harness pass (`bp §H5`).
- **T4** — Every `bp §I` row-gate passes for the metric: detector,
  anchor, frame-density, calibration, missingness, confidence,
  determinism, golden clips, tile-state mapper, replay. AI residual
  envelope verified bounded (`bp §D20`).

Dependencies are quoted from `gap §A` columns directly. Calibration
requirements cite `arch P1`. Replay/confidence cite `bp §H5`/`§H3`.

| # | Metric | Required detectors (`gap §A`) | Required anchors (`gap §A`) | Required calibration (`arch P1`) | Required replay (`bp §H5`) | Required confidence (`bp §H3`) | Required missingness (`arch P0`) |
|---|---|---|---|---|---|---|---|
| 1 | `hip_load` | D-POSE | landing_frame, launch_frame | none | T3+: bit-equal score | T3+: calibration curve in tolerance | `landmark_occluded`, `detector_unavailable`, `low_confidence` |
| 2 | `hand_load` | D-POSE, D-HANDS | hand_load_peak_frame, landing_frame | none | T3+: bit-equal | T3+: curve in tolerance | `anchor_not_detected`, `landmark_occluded`, `detector_unavailable` |
| 3 | `p2_timing` | D-POSE, D-HANDS, D-RELEASE | pitcher_knee_lift_frame, hand_load_peak_frame | none | T3+: bit-equal ms-offset | T3+: curve in tolerance | `anchor_not_detected`, `out_of_frame`, `detector_unavailable` |
| 4 | `eyes_tracking` | D-POSE | swing_start_frame, contact_frame | none | T3+: bit-equal | T3+: curve in tolerance | `landmark_occluded`, `detector_unavailable` |
| 5 | `stride_direction` | D-POSE | stride_landing_frame | plate-line reference | T3+: bit-equal degrees | T3+: curve in tolerance | `anchor_not_detected`, `calibration_unavailable`, `landmark_occluded` |
| 6 | `heel_plant` | D-POSE, D-PLANT | stride_landing_frame, heel_contact_frame | none | T3+: bit-equal | T3+: curve in tolerance | `anchor_not_detected`, `detector_unavailable` |
| 7 | `p3_timing` | D-POSE, D-RELEASE, D-PLANT | pitcher_release_frame, front_foot_plant_frame | none | T3+: bit-equal ms-offset | T3+: curve in tolerance | `anchor_not_detected`, `out_of_frame`, `detector_unavailable` |
| 8 | `hands_outside_shoulders_at_landing` | D-POSE | stride_landing_frame | none | T3+: bit-equal boolean | T3+: curve in tolerance | `anchor_not_detected`, `landmark_occluded` |
| 9 | `sequencing` | D-POSE, D-BAT | swing_start, contact, 4 segment-peak anchors | none | T3+: bit-equal boolean | T3+: curve in tolerance | `anchor_not_detected`, `detector_unavailable` |
| 10 | `bat_path` | D-POSE, D-BAT | swing_start_frame, contact_frame | strike-zone reconstruction | T3+: bit-equal classification | T3+: curve in tolerance | `detector_unavailable`, `calibration_unavailable`, `landmark_occluded` |
| 11 | `on_plane` | D-POSE, D-BAT | swing_start_frame, contact_frame | swing-plane prior | T3+: bit-equal percent | T3+: curve in tolerance | `detector_unavailable`, `calibration_unavailable` |
| 12 | `time_to_contact` | D-POSE, D-BAT, D-CONTACT | swing_start_frame, contact_frame | none beyond `fps_true` validity | T3+: bit-equal ms | T3+: curve in tolerance | `insufficient_temporal_resolution`, `anchor_not_detected`, `detector_unavailable` |
| 13 | `bat_speed_contact` | D-POSE, D-BAT | contact_frame ±k | bat-length prior, pixel-to-inch scaler, `fps_true` | T3+: bit-equal mph (envelope-aware) | T3+: curve in tolerance with calibration uncertainty propagated | `insufficient_temporal_resolution`, `calibration_unavailable`, `detector_unavailable`, `anchor_not_detected` |
| 14 | `back_elbow_contact` | D-POSE, D-BAT | launch_frame, contact_frame | none | T3+: bit-equal score | T3+: curve in tolerance | `anchor_not_detected`, `detector_unavailable`, `landmark_occluded` |
| 15 | `hitters_move` | D-POSE | load_peak_frame, stride_landing_frame | none | T3+: bit-equal | T3+: curve in tolerance | `anchor_not_detected`, `landmark_occluded` |
| 16 | `shoulder_plane_steadiness` | D-POSE | load_peak_frame, contact_frame | none | T3+: bit-equal | T3+: curve in tolerance | `landmark_occluded`, `anchor_not_detected` |
| 17 | `finish_balance` | D-POSE | contact_frame, finish_frame | none | T3+: bit-equal | T3+: curve in tolerance | `anchor_not_detected`, `landmark_occluded` |
| 18 | `shoulder_to_shoulder_hold` | D-POSE | stride_landing_frame, contact_frame | none | T3+: bit-equal pct + booleans | T3+: curve in tolerance | `landmark_occluded`, `anchor_not_detected` |

A metric's class is upper-bounded by the **minimum** class of its
required detectors and anchors (transitive closure).

---

## 5. Report Card Validation Framework

| Surface | T0 | T1 | T2 | T3 | T4 | Validation reference |
|---|---|---|---|---|---|---|
| Phase percentages | Current dual-denominator bug present (`audit S1`; `gap §D`). | Formula matches `bp §E2` `passRate = passed / measured`. | Replay-equivalent over same tile set (`bp §H5`). | All consumed tiles ≥ T2; missing excluded from denominator. | All consumed tiles ≥ T3; §I gates pass. | `bp §E2`; `bp §H5`. |
| Phase orbs | Orb central numeric shows total tile count while % uses measured-only (`audit S1`; `gap §D`). | Single-denominator presentation; color thresholds per `bp §E2`. | Replay-equivalent rendering inputs. | Coverage and pass-rate cannot disagree. | §I gates pass. | `bp §E2`; `gap §D`. |
| Tile states | Mapper exists; no confidence input (`audit S1`). | Mapper produces identical state given identical inputs (`bp §E1`). | Determinism harness pass. | Confidence-aware downgrade verified when `confidence < confidence_floor` (`bp §E1`). | §I tile-state-mapper gate passes for every metric ≥ T3. | `bp §E1`. |
| Ribbon generation | Non-negotiable computation does not exclude missing (`audit S1`; `gap §D`). | Computation excludes missing tiles per `gap §D`. | Replay-equivalent ribbon fields (`measured`, `total`, `eliteCount`, `nonNegotiableFailed`). | All ribbon-feeding tiles ≥ T2. | All ribbon-feeding tiles ≥ T3; §I gates pass. | `bp §E3`; `gap §D`. |
| Confidence surfacing | No per-tile confidence surfaced (`audit S2`, `S8`). | Every tile carries `[0,1]` confidence (`arch P0`; `bp §E1`). | Confidence reachable one interaction away from each tile. | Confidence calibration in tolerance (`bp §H3`). | §I confidence gate passes. | `arch P0`; `bp §H3`. |
| Missingness surfacing | All missing coerced to `single_pass_only` (`audit S8`). | Per-cause routing using canonical enum (`arch P0`); no umbrella. | Missingness Audit (`bp §H4`) pass. | Every missing tile traces to a canonical enum value with human-readable cause. | §I missingness gate passes. | `arch P0`; `bp §H4`; `gap §D`. |
| Coaching-layer boundary | AI produces metric values directly (`audit S2`). | Coaching presenter-only; never overwrites engine output (`bp §E4`). | Presenter contract verified: engine output unchanged after coaching pass. | AI residual (where used) bounded ±10, seeded, temperature 0 (`bp §D20`). | §I AI residual envelope gate passes. | `bp §E4`; `bp §D20`. |

---

## 6. Validation Harness Matrix

Harness names match `bp §H` exactly. Per harness: Purpose, Inputs,
Pass criteria, Failure criteria, Evidence retained.

### 6.1 Golden-Clip Validation (`bp §H2`)
- **Purpose.** Verify per-detector / per-anchor / per-metric output
  against labelled ground truth at the per-component pass-rate floor.
- **Inputs.** Fixed golden-clip set; pinned engine version; canonical
  frame-density tier per clip (`arch P1`).
- **Pass criteria.** Per-component pass rate ≥ floor recorded in
  `bp §H2`; no clip emits a non-canonical missingness reason.
- **Failure criteria.** Any pass rate below floor; any non-canonical
  missingness; any AI-residual breach.
- **Evidence retained.** Per-clip output, ground-truth diff,
  pass/fail label, pinned engine version, harness run id.

### 6.2 Replay Validation (`bp §H5`)
- **Purpose.** Prove byte-equal output across two engine runs over
  the same canonical trace fingerprint.
- **Inputs.** Canonical trace fingerprint set; pinned engine version
  triplet (`bp §F1`).
- **Pass criteria.** Bit-identical detector outputs, anchor
  `{frame_index, t_ms, confidence}`, metric values, tile states,
  ribbon fields, phase orbs.
- **Failure criteria.** Any divergence in any of the above.
- **Evidence retained.** Both run outputs; diff manifest; fingerprint
  inputs; engine version triplet.

### 6.3 Determinism Validation (`bp §H1`)
- **Purpose.** Verify a component is internally deterministic given
  identical inputs.
- **Inputs.** Canonical fixture; pinned component version.
- **Pass criteria.** Identical output bytes across N runs (N per
  `bp §H1`).
- **Failure criteria.** Any divergence; any silent default fall-through.
- **Evidence retained.** Run outputs, fixture hash, component
  version, divergence trace (if any).

### 6.4 Calibration Validation (`arch P1 calibration framework`; `bp §H3`)
- **Purpose.** Verify presence and validity of calibration
  certificates required by `arch P1` (bat-length prior, pixel-to-inch
  scaler, strike-zone reconstruction, swing-plane prior, plate-line
  reference) for metrics that require them (`gap §A`).
- **Inputs.** Component identifier; declared required calibration
  list per `gap §A`; calibration certificate set.
- **Pass criteria.** Every required calibration present, pinned, and
  carrying explicit uncertainty (where required by `arch P3`); none
  defaulted from prompt text (`audit S6`).
- **Failure criteria.** Missing certificate; default-from-prompt;
  uncertainty absent where required.
- **Evidence retained.** Certificate set, uncertainty values,
  binding to component version.

### 6.5 Missingness Validation (`bp §H4`)
- **Purpose.** Verify every missing tile in production and harness
  output traces to a canonical `arch P0` enum value with a
  human-readable cause; no `single_pass_only` umbrella.
- **Inputs.** Engine output corpus over a fixed window; canonical
  missingness enum.
- **Pass criteria.** 100% of missing outputs use enum reasons;
  human-readable cause present.
- **Failure criteria.** Any non-enum reason; any umbrella reason; any
  missing-tile lacking cause.
- **Evidence retained.** Per-tile missingness reason histogram;
  exceptions list.

### 6.6 Confidence Validation (`bp §H3`)
- **Purpose.** Verify predicted confidence values track observed
  accuracy within tolerance per `bp §H3`.
- **Inputs.** Confidence-vs-accuracy bin distribution over the
  golden-clip set.
- **Pass criteria.** Calibration curve within tolerance per `bp §H3`
  for every bin; floor enforcement verified at consumers.
- **Failure criteria.** Any bin outside tolerance; floors not
  enforced.
- **Evidence retained.** Calibration curve; per-bin counts; pinned
  component version.

### 6.7 Version Migration Validation (`bp §F1`)
- **Purpose.** Verify that promoting a new pinned engine-version
  triplet (`LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`,
  `METRIC_ENGINE_VERSION`) preserves required determinism, replay,
  golden-clip, and calibration evidence.
- **Inputs.** Prior pinned version triplet; candidate version
  triplet; full harness suite (§6.1–§6.6).
- **Pass criteria.** All §6.1–§6.6 harnesses green under the
  candidate triplet; cache fingerprint changes are explicit and
  documented (`bp §F2`).
- **Failure criteria.** Any harness regression; any silent fingerprint
  change.
- **Evidence retained.** Prior + candidate triplets; harness deltas;
  cache-fingerprint change log.

---

## 7. Trust-Class Promotion Matrix

Per transition, each cell lists the gates that must be satisfied to
promote a component of that row's kind. Demotion is automatic on the
inverse condition (§1.5).

### 7.1 T0 → T1
| Kind | Required to promote | Demotion trigger |
|---|---|---|
| Detector | Wired at a real pinned version (`bp §F1`); per-frame output conforms to `bp §B1–§B7`. | Version reverts to `@0.0.0-stub` (`audit S3`); contract violation. |
| Anchor | Source detector ≥ T1; canonical schema emitted (`bp §C`). | Source detector demoted; schema field missing. |
| Metric | All required detectors ≥ T1 (`gap §A`); deterministic engine producer replaces AI-only (`bp §D20`; `gap §C`). | AI re-becomes the producer; required detector demoted. |
| Report-card output | Per-surface T1 condition in §5 met. | Per-surface T1 condition violated. |

### 7.2 T1 → T2
| Kind | Required to promote | Demotion trigger |
|---|---|---|
| Detector | §6.3 Determinism Validation pass; per-keypoint confidence exposed; missingness routes to enum reasons (`arch P0`). | §6.3 regression; non-enum missingness. |
| Anchor | §6.3 pass on `frame_index` and `t_ms`; `anchor_not_detected` routing verified below confidence floor. | Replay divergence on anchor; non-enum missingness. |
| Metric | §6.3 pass on engine output; §6.5 Missingness Validation pass for the metric's enum subset; confidence in `[0,1]` emitted. | §6.3 or §6.5 regression. |
| Report-card output | Per-surface T2 condition in §5 met (e.g., single-denominator orb; replay-equivalent inputs). | Per-surface T2 condition violated. |

### 7.3 T2 → T3
| Kind | Required to promote | Demotion trigger |
|---|---|---|
| Detector | §6.1 Golden-Clip pass at floor; §6.2 Replay Validation bit-equal; §6.6 Confidence calibration in tolerance; §6.4 Calibration certificate where the detector feeds a calibrated metric. | Any of §6.1/§6.2/§6.6/§6.4 regression. |
| Anchor | §6.1 within per-tier frame tolerance; §6.2 bit-equal; §6.6 calibration in tolerance. | Any regression. |
| Metric | §6.1 pass at per-metric floor; §6.2 bit-equal; §6.4 certificates present per `arch P1`; §6.6 calibration in tolerance. | Any regression. |
| Report-card output | All consumed tiles ≥ T2; per-surface T3 condition in §5 met (confidence-aware downgrade, exclusion of missing from non-negotiables). | Any consumed tile demoted; per-surface condition violated. |

### 7.4 T3 → T4
| Kind | Required to promote | Demotion trigger |
|---|---|---|
| Detector | All `bp §I` rows depending on the detector green; §6.7 Version Migration green; gateway/runtime determinism verified end-to-end. | Any `bp §I` row regression; §6.7 regression; gateway determinism breach (`audit S5` undetermined → resolved required). |
| Anchor | All `bp §I` rows depending on the anchor green; §6.7 green. | Any `bp §I` row regression; §6.7 regression. |
| Metric | All 10 gates in `bp §I` pass for the metric: detector, anchor, frame-density, calibration, missingness, confidence, determinism, golden clips, tile-state mapper, replay. AI residual envelope verified bounded (`bp §D20`). | Any `bp §I` gate regression; AI residual breach. |
| Report-card output | Per-surface T4 condition in §5 met; all consumed tiles ≥ T3. | Per-surface condition violated; any consumed tile demoted. |

---

## 8. Closing constraints

Validation framework only. This document does not change the
measurement architecture, the implementation blueprint, or the gap
analysis. It does not order, prioritize, sequence, estimate, or
assign work. It does not invent detectors, anchors, metrics, or
harnesses. It defines only how the components already canonicalized
earn promotion between trust classes and when they must be demoted.

No code, schema, prompts, UI, roadmap, sequencing, owners, or
estimates were produced.
