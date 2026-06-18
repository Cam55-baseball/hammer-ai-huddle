# Canonical Confidence Architecture (Phase 8)

Sources (read-only):
- `arch` = `.lovable/canonical-measurement-architecture.md`
- `bp` = `.lovable/canonical-implementation-blueprint.md`
- `gap` = `.lovable/canonical-gap-analysis.md`
- `val` = `.lovable/canonical-validation-framework.md`
- `cal` = `.lovable/canonical-calibration-architecture.md`
- `audit` = `.lovable/analysis-truth-audit.md`
- `extract` = `.lovable/analysis-truth-extraction.md`

Every clause cites one of the seven. No new metrics, detectors, anchors,
harnesses, thresholds, or confidence sources are introduced.
Confidence architecture only.

---

## 1. Preamble

### 1.1 Confidence philosophy

Confidence is a **derived, deterministic, calibration-bound, replay-
equivalent, missingness-visible** quantity. It is computed from inputs
that are themselves replay-reconstructable (`bp §H5`, `bp §F2`) and
backed by a calibration certificate (`cal §5`, `cal §6.1`).

Principles (all inherited):

1. **Derived, not authored.** No component may invent, raise, smooth,
   or impute its own confidence (`gap §D`, `cal §1.1`).
2. **Deterministic.** Byte-identical across runs at the pinned engine
   and reasoning versions (`bp §F`, `bp §H1`, `val §6.3`).
3. **Replay-equivalent.** Every confidence value reconstructable by
   `bp §H5`, indexed by canonical trace fingerprint (`bp §F2`).
4. **Calibration-bound.** Every confidence claim binds to a confidence
   certificate (`cal §5`, `cal §5.5`).
5. **Missingness-visible.** When inputs are insufficient, confidence
   is not lowered into a number — the metric routes to the canonical
   missingness enum (`arch §Missingness rules`) and the surface
   degrades per `val §5`.
6. **Additive.** New certificates supersede; confidence history is
   retained (`cal §6.6`).

### 1.2 Confidence authority hierarchy

```text
1. Calibration certificate (cal §6.1)
2. Detector confidence (per bp §B, bound by cal §2)
3. Anchor confidence (per arch §Event anchors, bound by cal §3)
4. Metric confidence (product per arch §Confidence model, bound by cal §4)
5. Report-card surface confidence (bp §E, val §5)
```

A surface at level N may not author or overwrite confidence at any
level <N. AI / coaching presentation is the lowest layer and remains a
presentation-only consumer of engine confidence (`gap §D`, `bp §E4`).

### 1.3 Confidence propagation philosophy

Confidence propagates along the dependency chain declared in `arch
§Confidence model` and `bp §D`. Propagation is **monotonic non-
increasing**: no downstream layer may report higher confidence than
the product of its inputs. Lateral injection of confidence from
sources outside the dependency chain is forbidden (`cal §1.2`,
`gap §D`).

### 1.4 Confidence aggregation philosophy

The only permitted aggregation operators are those already declared:

- The product defined in `arch §Confidence model`:
  `landmark_visibility × anchor_temporal_certainty × calibration_confidence`
  (with metric-specific factors as enumerated per metric in `arch
  §Part 2`).
- Visibility-weighted aggregations exactly where `arch §Part 2` or
  `bp §D` already declare them (e.g., visibility-weighted landmark
  confidence for `hip_load`).

No new operators (max, blended weights, learned aggregators) are
introduced.

### 1.5 Confidence demotion philosophy

Confidence anomalies follow **demotion before correction** (`val
§1.5`, `val §7`, `cal §1.5`, `cal §7`). On a confirmed confidence
failure (§7) the component drops one trust class and remains there
until a new certificate is issued through the full validation path.
Self-healing recalibration of confidence is forbidden (`cal §7.5`).

### 1.6 Confidence visibility philosophy

Every consuming surface MUST expose the underlying confidence within
one interaction (`bp §E`, `val §5`). Confidence fabrication, hidden
smoothing across frames, collapsing missingness into a finite number,
and post-hoc certainty manufacture are forbidden (`gap §D`, `cal
§1.1`, `cal §5.4`). Display rules for `val §5` (tile state, orb
state) consume confidence; they may not redefine it.

---

## 2. Detector Confidence Architecture

Rows from `arch §Canonical detector stack` and `bp §B`.

### 2.1 D-POSE (`bp §B1`)

- **Confidence source.** Per-frame landmark visibility scores emitted
  by the pinned MediaPipe Pose Landmarker artifact (`bp §B1`,
  `bp §F1`), bound to the D-POSE confidence certificate (`cal §2.1`,
  `cal §5.1`).
- **Emission contract.** Per-frame, per-landmark scalar in [0,1];
  scope tag = (segment, frame-density tier, device class) per `cal
  §1.6`; version pin per `bp §F1`.
- **Persistence requirements.** Replay-reconstructable via `bp §H5`;
  retention under the certificate's evidence retention handle (`cal
  §6.3`).
- **Propagation requirements.** Consumed by every anchor and metric
  that lists D-POSE in `arch §Part 2`; propagated by §1.3 monotonic-
  non-increasing rule.
- **Demotion triggers.** Reliability-curve drift (`cal §5.6`),
  monotonicity violation (`cal §5.4`), dependency-induced drift (`cal
  §7.2`), version-pin change (`bp §F1`), or any `val §1.5` event.

### 2.2 D-HANDS (`bp §B2`)

- **Confidence source.** Per-frame knob and grip refinement
  confidences emitted by the pinned MediaPipe Hands artifact (`bp §B2`,
  `bp §F1`), bound to `cal §2.2`.
- **Emission contract.** Per-frame, per-keypoint scalar in [0,1];
  scope and pin per `cal §1.6` and `bp §F1`.
- **Persistence requirements.** As §2.1.
- **Propagation requirements.** Consumed by anchors and metrics that
  list D-HANDS in `arch §Part 2`; subject to §1.3.
- **Demotion triggers.** As §2.1.

### 2.3 D-BAT (`bp §B3`)

- **Confidence source.** Per-frame track quality from the bat
  keypoint detector (`bp §B3`), bound to `cal §2.3`. The bat-length
  prior provenance recorded by the certificate (`cal §2.3`) is part of
  the confidence binding.
- **Emission contract.** Per-frame track-quality scalar in [0,1]; pin
  and scope per `bp §F1`, `cal §1.6`.
- **Persistence requirements.** As §2.1.
- **Propagation requirements.** Consumed by every metric or anchor
  listing D-BAT in `arch §Part 2`; subject to §1.3.
- **Demotion triggers.** As §2.1; additionally any change in the bat-
  length prior policy (`cal §2.3`).

### 2.4 D-BALL (`bp §B4`)

- **Confidence source.** Per-frame Kalman-track quality (`bp §B4`),
  bound to `cal §2.4`.
- **Emission contract.** Per-frame scalar in [0,1] with track state;
  pin and scope per `bp §F1`, `cal §1.6`.
- **Persistence requirements.** As §2.1.
- **Propagation requirements.** Consumed by anchors and metrics that
  list D-BALL in `arch §Part 2`.
- **Demotion triggers.** As §2.1.

### 2.5 D-CONTACT (`bp §B5`)

- **Confidence source.** Per-frame contact-likelihood from the
  audio-transient + barrel-to-ball proximity detector (`bp §B5`),
  bound to `cal §2.5`.
- **Emission contract.** Per-frame scalar in [0,1] **per frame-
  density tier** (T-mid, T-high) as required by `cal §2.5` and `val
  §3`; pin and scope per `bp §F1`, `cal §1.6`.
- **Persistence requirements.** As §2.1.
- **Propagation requirements.** Consumed by the Contact anchor and by
  metrics listing D-CONTACT in `arch §Part 2`.
- **Demotion triggers.** As §2.1; additionally per-tier evidence
  failure (`cal §2.5`).

### 2.6 D-PLANT (`bp §B7`)

- **Confidence source.** Per-frame plant-likelihood (ankle/heel
  y-velocity zero-crossing) (`bp §B7`), bound to `cal §2.6`.
- **Emission contract.** Per-frame scalar in [0,1]; pin and scope per
  `bp §F1`, `cal §1.6`.
- **Persistence requirements.** As §2.1.
- **Propagation requirements.** Consumed by the Heel Plant anchor and
  by metrics listing D-PLANT.
- **Demotion triggers.** As §2.1.

### 2.7 D-RELEASE (`bp §B6`)

- **Confidence source.** Per-frame release-likelihood (`bp §B6`),
  bound to `cal §2.7`.
- **Emission contract.** Per-frame scalar in [0,1]; pin and scope per
  `bp §F1`, `cal §1.6`.
- **Persistence requirements.** As §2.1.
- **Propagation requirements.** Consumed by the Release anchor and by
  metrics listing D-RELEASE.
- **Demotion triggers.** As §2.1.

---

## 3. Anchor Confidence Architecture

Rows from `arch §Event anchors` and `cal §3`.

### 3.1 Launch

- **Confidence source.** Anchor temporal-certainty derived from the
  D-POSE and D-HANDS confidences at the launch frame, per the formula
  in `arch §Confidence model` and `cal §5.2`.
- **Emission requirements.** Single scalar in [0,1] bound to the
  Launch anchor certificate (`cal §3.1`); fallback when sources are
  insufficient is `anchor_not_detected` (`arch §Missingness rules`);
  no numeric fabrication.
- **Dependency requirements.** Binds the active D-POSE and D-HANDS
  confidence certificates (`cal §5.5`).
- **Propagation requirements.** Feeds the
  `anchor_temporal_certainty` factor of every metric whose `arch
  §Part 2` row names Launch; subject to §1.3.
- **Demotion requirements.** Temporal-tolerance curve drift (`cal
  §5.6`), dependency-induced drift (`cal §7.2`), version-pin change
  (`bp §F1`), or any `val §1.5` event.

### 3.2 Heel Plant

- **Confidence source.** Temporal-certainty derived from D-POSE and
  D-PLANT (`arch §Event anchors`, `cal §3.2`).
- **Emission requirements.** As §3.1; fallback `anchor_not_detected`.
- **Dependency requirements.** Binds the active D-POSE and D-PLANT
  certificates.
- **Propagation requirements.** Feeds metrics that name Heel Plant in
  `arch §Part 2`.
- **Demotion requirements.** As §3.1.

### 3.3 Contact

- **Confidence source.** Temporal-certainty derived from D-CONTACT
  and D-BAT (`arch §Event anchors`, `cal §3.3`), evaluated **per
  frame-density tier** (`cal §3.3`, `val §3`).
- **Emission requirements.** Per-tier scalar in [0,1]; fallback
  `anchor_not_detected`; binds the Contact anchor certificate.
- **Dependency requirements.** Binds D-CONTACT and D-BAT certificates.
- **Propagation requirements.** Feeds every metric that names Contact
  in `arch §Part 2`.
- **Demotion requirements.** As §3.1; additionally per-tier
  divergence (`cal §3.3`).

### 3.4 Release

- **Confidence source.** Temporal-certainty derived from D-RELEASE
  and D-POSE (`arch §Event anchors`, `cal §3.4`).
- **Emission requirements.** As §3.1; fallback `anchor_not_detected`
  or `out_of_frame` per `arch §Missingness rules` when the pitcher is
  not visible.
- **Dependency requirements.** Binds D-RELEASE and D-POSE
  certificates.
- **Propagation requirements.** Feeds metrics that name Release.
- **Demotion requirements.** As §3.1.

### 3.5 Finish

- **Confidence source.** Temporal-certainty derived from D-POSE over
  the balance window (`arch §17`, `cal §3.5`).
- **Emission requirements.** As §3.1; fallback `anchor_not_detected`.
- **Dependency requirements.** Binds D-POSE certificate.
- **Propagation requirements.** Feeds metrics that name Finish.
- **Demotion requirements.** As §3.1.

---

## 4. Metric Confidence Architecture

All 18 canonical BH metrics. For every metric:

- **Confidence inputs** = exactly the factors enumerated in that
  metric's `arch §Part 2` row, with operators as in `arch §Confidence
  model` and `bp §D`.
- **Aggregation requirements** = product (and visibility weighting
  where the metric row already declares it); §1.4 applies; no new
  operators.
- **Emission requirements** = single scalar in [0,1] per metric per
  swing, with scope and pin per `cal §1.6` and `bp §F1`; bound to the
  metric confidence certificate (`cal §4`, `cal §5.3`, `cal §5.5`).
- **Persistence requirements** = replay-equivalent (`bp §H5`); stored
  under the certificate's retention handle (`cal §6.3`); never
  smoothed across swings.
- **Demotion requirements** = curve drift (`cal §5.6`), dependency-
  induced drift (`cal §7.2`), version-pin change (`bp §F1`), or any
  `val §1.5` event.
- **Display requirements** = tile state mapped by `bp §E1` and `val
  §5`; confidence visible one interaction away (§1.6); missingness
  routed through the canonical enum (`arch §Missingness rules`).

Per-metric input enumeration (inputs read from `arch §Part 2`; no
new inputs introduced):

1. **`hip_load`** — visibility-weighted hip-landmark visibility ×
   anchor certainty for load-apex anchors; D-POSE.
2. **`hand_load`** — hand-landmark visibility × Launch anchor
   certainty; D-POSE, D-HANDS.
3. **`p2_timing`** — D-HANDS anchor certainty × pitcher-window
   anchor certainty × fps-relative resolution factor (`arch §3`);
   D-POSE, D-HANDS, D-RELEASE.
4. **`eyes_tracking`** — head-landmark visibility × Launch and
   Contact anchor certainty; D-POSE.
5. **`stride_direction`** — lower-body landmark visibility × Launch
   and Heel Plant anchor certainty; D-POSE.
6. **`heel_plant`** — foot-landmark visibility × Heel Plant anchor
   certainty; D-POSE, D-PLANT.
7. **`p3_timing`** — Heel Plant anchor certainty × Release anchor
   certainty × fps-relative resolution factor (`arch §7`); D-PLANT,
   D-RELEASE.
8. **`hands_outside_shoulders_at_landing`** — shoulder/hand
   landmark visibility × Heel Plant anchor certainty; D-POSE,
   D-HANDS, D-PLANT.
9. **`sequencing`** — landmark visibility × Launch/Contact anchor
   certainty × peak-detection certainty (as declared in `arch §9`);
   D-POSE.
10. **`bat_path`** — D-BAT track quality × Launch/Contact anchor
    certainty × zone-window completeness (`arch §10`); D-POSE, D-BAT.
11. **`on_plane`** — D-BAT track quality × Launch/Contact anchor
    certainty × plane-fit confidence (`arch §11`); D-POSE, D-BAT.
12. **`time_to_contact`** — Launch and Contact anchor certainty ×
    `(1 - anchor_jitter/fps_period)` (`arch §12`); D-POSE, D-CONTACT.
13. **`bat_speed_contact`** — D-BAT track quality × Contact anchor
    certainty × **calibration_confidence from the bat-length prior
    pixel→inch scaler** (`arch §13`, `cal §4`, `cal §2.3`); D-BAT,
    D-CONTACT.
14. **`back_elbow_contact`** — landmark visibility × D-BAT track
    quality × Contact anchor certainty (`arch §14`); D-POSE, D-BAT.
15. **`hitters_move`** — composite product over constituent-metric
    confidences (`arch §15`); inherits the union of child-metric
    dependencies; no independent calibration factor.
16. **`shoulder_plane_steadiness`** — shoulder-landmark visibility ×
    Launch/Contact anchor certainty (`arch §16`); D-POSE.
17. **`finish_balance`** — lower-body landmark visibility × Finish
    anchor certainty (`arch §17`); D-POSE.
18. **`shoulder_to_shoulder_hold`** — head/shoulder landmark
    visibility × Contact/Finish anchor certainty (`arch §18`); D-POSE.

---

## 5. Report Card Confidence Architecture

Rows from `bp §E` and `val §5`.

### 5.1 Phase percentages (`bp §E2`, `val §5`)

- **Confidence requirements.** Computed only from metrics whose
  current confidence certificate is valid (`cal §6.4`); excluded
  metrics route through missingness (`arch §Missingness rules`).
- **Display requirements.** Percentage and underlying metric
  confidences accessible one interaction away (§1.6).
- **Propagation requirements.** Feeds Phase orbs; never raises orb
  confidence above the minimum metric confidence in the phase.
- **Demotion requirements.** Any constituent metric demoted under §4
  forces the phase percentage to recompute and the report-card surface
  to expose the demotion event (`val §5`).

### 5.2 Phase orbs (`bp §E2`, `gap §D`, `val §5`)

- **Confidence requirements.** Single denominator policy as already
  fixed in `gap §D` and `val §5`: orb central number and percentage
  share the same denominator. No re-definition here.
- **Display requirements.** Orb state derives deterministically from
  the phase percentage and the constituent confidences; missingness
  visible.
- **Propagation requirements.** Cannot raise downstream confidence;
  never authors metric or anchor confidence.
- **Demotion requirements.** Inherits §5.1.

### 5.3 Tile states (`bp §E1`, `val §5`)

- **Confidence requirements.** Tile state mapped from metric
  confidence and missingness enum per `bp §E1`. Confidence is a
  consumer input, not a tile output.
- **Display requirements.** Confidence band visible on the tile
  surface (§1.6); missingness cause visible.
- **Propagation requirements.** None upstream; tiles consume only.
- **Demotion requirements.** Tile re-renders when the underlying
  metric demotes under §4; previous state is not retained as truth.

### 5.4 Ribbon generation (`bp §E3` CoverageRibbon, `val §5`)

- **Confidence requirements.** Ribbon coverage derives from the count
  of metrics with valid certificates over the canonical denominator
  (`gap §D`).
- **Display requirements.** Coverage and missingness both visible;
  no smoothing across swings (§1.4).
- **Propagation requirements.** Cannot author metric confidence.
- **Demotion requirements.** Recomputes on any metric demotion.

### 5.5 Coaching layer (`bp §E4` AICoachingPresenter, `gap §D`)

- **Confidence requirements.** Presentation-only consumer of engine
  confidence; may not produce, raise, smooth, or override confidence
  (`gap §D`, §1.6).
- **Display requirements.** Quotes the underlying metric confidence
  verbatim; the AI residual envelope bound declared in `val §1.5`
  remains the governing tolerance.
- **Propagation requirements.** No upstream propagation permitted.
- **Demotion requirements.** Coaching surface for a metric is
  withdrawn whenever the metric's certificate is invalid (`cal §6.4`).

### 5.6 Missingness layer (`arch §Missingness rules`, `val §5`)

- **Confidence requirements.** No numeric confidence emitted when a
  metric routes to a missingness enum value; confidence is `null` and
  the cause enum is required (`gap §D` — replaces the prior
  `single_pass_only` umbrella).
- **Display requirements.** Cause enum visible on every affected
  surface; no fallback numeric score (§1.1).
- **Propagation requirements.** Missingness propagates upward into
  phase percentages and ribbons (§5.1, §5.4); it never collapses into
  a confidence number.
- **Demotion requirements.** Persistent missingness on a previously-
  certified metric forces demotion under §7.

---

## 6. Confidence Governance Framework

### 6.1 Persistence

Every confidence value emitted by §2–§5 MUST be persisted
deterministically, immutably, and addressable by the canonical trace
fingerprint (`bp §F2`) and the certificate's retention handle (`cal
§6.3`).

### 6.2 Versioning

Every confidence value carries the engine version pin (`bp §F1`) and
the reasoning version pin of the surface that consumed it (`bp §F1`).
Confidence emitted under one version pin may not be reused under
another without re-issuance through `val §6.7`.

### 6.3 Replay equivalence

Every confidence value is reconstructable byte-identically by
`ReplayHarness` (`bp §H5`, `val §6.2`). Non-replay-reconstructable
confidence is constitutionally invalid (§1.1).

### 6.4 Auditability

Confidence lineage — input detector/anchor confidences, aggregation
operator, certificate id, version pin, scope cell — MUST be exposed at
every surface within one interaction (`val §6`, §1.6). Composite
confidence scores without lineage decomposition are forbidden
(`gap §D`).

### 6.5 Certificate linkage

Every confidence value binds a confidence certificate per `cal §5.5`.
A confidence value without a bound certificate is invalid and must not
be displayed (§1.1, `cal §5.5`).

### 6.6 Invalidation rules

A confidence value becomes invalid when any of:

1. Its bound certificate is invalidated, expired, or superseded
   (`cal §6.4`, `cal §6.5`, `cal §6.6`).
2. A dependency certificate (per §2/§3/§4) is invalidated.
3. A drift Breach is recorded (`cal §7.3`, §7).
4. Engine or reasoning version pin changes (`bp §F1`).
5. Evidence retention handle becomes unreachable (`cal §6.3`).
6. The validation framework records a demotion event (`val §1.5`).

Invalid confidence values must not be propagated, displayed, or
consumed by downstream surfaces.

---

## 7. Confidence Promotion and Demotion Matrix

This section maps confidence-specific obligations onto the existing
ladder in `val §7` and `cal §7`. No new gates are introduced.

### 7.1 T0 → T1

- **Detectors / anchors / metrics / report-card outputs.** Confidence
  source declared and version-pinned per §2/§3/§4/§5 (`val §7.1`).
  Emission contract conforms to §1.4. No certificate yet required.

### 7.2 T1 → T2

- Confidence emission proven deterministic via H1 (`val §6.3`,
  `bp §H1`).
- Confidence persistence proven replay-equivalent via H5 (`val §6.2`,
  `bp §H5`).
- A confidence certificate exists per `cal §5.5` (issued or pending
  issuance under `val §6.4`, `val §6.6`).

### 7.3 T2 → T3

- Confidence-curve validation via H3 passes within the tolerance
  declared in `val §6.6` (no new tolerance).
- Monotonicity of the reliability curve verified (`cal §5.4`).
- Calibration certificate is in force (`cal §6.1`).
- Confidence lineage auditable per §6.4.

### 7.4 T3 → T4

- All `val §7.4` gates satisfied with confidence-curve evidence
  retained.
- Drift severity at Nominal across the certificate's full segmentation
  cell (`cal §7.3`).
- No outstanding Warn or Breach against the confidence certificate.

### 7.5 Confidence failure conditions

A confidence value fails when any of:

- Reliability or residual-vs-confidence curve violates monotonicity
  (`cal §5.4`).
- Confidence is emitted without a bound certificate (§6.5).
- Confidence is fabricated, smoothed across frames or swings, or
  raised beyond the §1.3 monotonic-non-increasing bound (`gap §D`,
  §1.3, §1.4).
- Replay reconstruction diverges from the persisted value (`bp §H5`).
- Missing-enum case is collapsed into a numeric score (§5.6).

### 7.6 Confidence downgrade conditions

- **Warn** (per `cal §7.3`) blocks any pending promotion of the
  confidence-bearing component under §7 until cleared. No demotion.
- **Breach** (per `cal §7.3`) forces demotion by exactly one trust
  class per `val §1.5` and `val §7`. Demotion propagates to every
  downstream surface that consumed the affected confidence (§5).

### 7.7 Confidence recovery conditions

Recovery requires a new confidence certificate issued through the
full `val §6` / `val §7` path; the prior certificate is retained per
`cal §6.6`. Silent re-fit is forbidden (`cal §7.5`). Re-promotion may
not bypass any §7.1–§7.4 gate.

---

## 8. Closing constraints (restated)

- Confidence architecture only.
- No code.
- No implementation.
- No roadmap.
- No sequencing.
- No prioritization.
- No architecture modifications.
- No blueprint modifications.
- No validation modifications.
- No calibration modifications.
- No new metrics, detectors, anchors, harnesses, or thresholds.
