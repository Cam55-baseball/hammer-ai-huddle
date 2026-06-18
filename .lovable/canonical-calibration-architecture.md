# Canonical Calibration Architecture (Phase 7)

Sources (read-only):
- `arch` = `.lovable/canonical-measurement-architecture.md`
- `bp` = `.lovable/canonical-implementation-blueprint.md`
- `gap` = `.lovable/canonical-gap-analysis.md`
- `val` = `.lovable/canonical-validation-framework.md`
- `audit` = `.lovable/analysis-truth-audit.md`
- `extract` = `.lovable/analysis-truth-extraction.md`

Every clause cites one of the six. No new metrics, detectors, anchors,
harnesses, or thresholds are introduced. Calibration architecture only.

---

## 1. Preamble

### 1.1 Calibration philosophy

Calibration converts the unverified output of a detector, anchor, or
metric into a quantity whose error distribution is **known, bounded,
and replay-reconstructable** against canonical evidence. Calibration is
a precondition for any trust class above T1 in the validation framework
(`val §1.3`, `val §7`).

Principles (all inherited; none invented):

1. **Evidence supremacy.** A component is calibrated only when the
   evidence required by `val §1.6` and `bp §H3` exists, is retained,
   and is reconstructable at the pinned engine version (`bp §F1`).
2. **Deterministic-first.** Calibration outputs MUST be byte-identical
   across runs under the same inputs and version pin (`bp §F`, `bp
   §H1`, `val §6.3`). Calibration may not be derived from runs whose
   determinism is unproven.
3. **Additive.** A new calibration certificate is added; it does not
   overwrite the prior one (`val §1.2`).
4. **Demotion on drift.** Observed drift demotes the affected component
   one trust class per the validation framework (`val §1.5`, `val §7`).
   Silent re-fit is forbidden.
5. **Replay-equivalent.** Every calibrated output MUST be reproducible
   by `ReplayHarness` (`bp §H5`, `val §6.2`) against the canonical
   trace fingerprint (`bp §F2`).
6. **Missingness-visible.** When a required calibration prior is
   absent, the metric routes to the canonical missingness enum
   `calibration_unavailable` (`arch §Missingness rules`) and the metric
   surface degrades per `val §4`. Calibration is never imputed.

### 1.2 Calibration authority hierarchy

Authority flows top-down; lower layers may never overwrite higher
layers (consistent with `arch §Calibration framework`, `bp §A`,
`val §1.3`):

```text
1. Ground truth (labeled corpus, instrumented capture, user-entered prior)
2. Calibration certificate (signed, scope-bounded, version-pinned)
3. Detector / anchor / metric output bound to that certificate
4. Confidence curve derived from that certificate
5. Report-card surface consuming (3) and (4)
```

A surface at level N may not author or mutate evidence at level <N.
Coaching presentation (`bp §E4`) is the lowest layer and remains a
presentation-only consumer (`gap §D`).

### 1.3 Calibration evidence requirements

Every certificate's evidence manifest MUST contain (mirroring
`val §1.6` and `bp §H3`):

- Component identifier and version pin (`bp §F1`).
- Canonical trace fingerprint of each evidence sample (`bp §F2`,
  `gap §C`).
- Ground-truth source identifier (labeled corpus id, instrumented
  capture id, or user-entered prior provenance per `arch §Calibration
  framework`).
- Residual distribution (signed error vs ground truth) at the segment
  and frame-density tier on which the certificate is scoped.
- Confidence-curve points used in the calibration plot (linkage to
  `bp §H3`).
- Retention handle (immutable storage reference; see `1.4`).
- Issuance fingerprint binding the manifest hash to the issuing
  validation run (`val §6`).

### 1.4 Calibration certificate concept

A **calibration certificate** is a versioned, scope-bounded, signed
attestation binding a component (detector, anchor, metric, or
confidence curve) to the evidence manifest defined in §1.3. It is the
sole artifact that authorizes a component to claim a calibrated state
under `val §7`. Certificates are immutable; corrections take the form
of supersession (§5.6), never edit-in-place (`val §1.2`).

### 1.5 Calibration drift philosophy

Drift is **observed, never assumed**. Detection is deterministic
against the baseline distribution stored in the certificate. The
required response to a confirmed drift breach is **demotion before
correction**: the affected component returns to the prior trust class
(`val §1.5`, `val §7`) and remains there until a new certificate is
issued through the validation framework. Self-healing recalibration is
forbidden.

### 1.6 Population-segmentation philosophy

Segments are inherited; none are invented in this document. The
permitted segmentation axes are exactly those already declared:

- Frame-density tier T-low / T-mid / T-high (`arch §Frame-density
  tiers`, `bp §G5`).
- Capture modality (phone-only canonical envelope per `arch §Canonical
  capture envelope`, `bp §G1`).
- Handedness and age band where the underlying methodology already
  recognises them (`extract` per-metric notes).
- Device class as enumerated by `CaptureEnvelope` (`bp §G1`).

A certificate is scoped to one (segment × frame-density tier × device
class) cell. A certificate is not transitive across cells.

---

## 2. Detector Calibration Architecture

Rows derive from `arch §Canonical detector stack` and `bp §B`. Each
row's evidence and recalibration requirements derive from `bp §B`,
`bp §H2`, `bp §H3`, `gap §B`, and `val §2`.

### 2.1 D-POSE (`bp §B1`)

- **Calibration inputs.** Labeled per-frame landmark ground truth from
  the golden-clip corpus (`bp §H2`); pinned model artifact version
  (`bp §F1`); canonical capture envelope frames (`bp §G1`).
- **Calibration outputs.** Per-landmark visibility-to-reliability
  curve; per-landmark positional residual distribution at canonical
  resolution; segment-scoped reliability table feeding the confidence
  product in `arch §Confidence model`.
- **Calibration evidence.** Golden-clip residuals; determinism proof
  (`bp §H1`); replay-equivalence proof (`bp §H5`).
- **Calibration certificate requirements.** Scope = (frame-density
  tier × device class); contents per §1.3; binds to artifact version
  pinned in `bp §F1`.
- **Drift-detection requirements.** Population-level shift in
  visibility distribution or positional residual vs the certificate's
  baseline, evaluated deterministically against the segmentation cell.
- **Recalibration requirements.** Triggered by drift breach (§6.3),
  artifact-version change (`bp §F1`), or expansion to a new
  segmentation cell. Recalibration MUST proceed through `val §6.4` and
  produce a new certificate; no edit-in-place.

### 2.2 D-HANDS (`bp §B2`)

- **Calibration inputs.** Hand-landmark ground truth for knob and grip
  refinement on the golden-clip corpus (`bp §H2`).
- **Calibration outputs.** Knob and grip positional residual
  distribution; refinement-vs-pose delta distribution.
- **Calibration evidence.** Golden-clip residuals against labeled knob
  and grip positions; determinism and replay proofs.
- **Calibration certificate requirements.** Scoped per §1.6; binds the
  refinement artifact version (`bp §F1`).
- **Drift-detection requirements.** Drift in knob/grip residual or in
  refinement-delta distribution against certificate baseline.
- **Recalibration requirements.** Identical to §2.1.

### 2.3 D-BAT (`bp §B3`)

- **Calibration inputs.** Labeled bat keypoint sequences (knob, mid,
  barrel-tip) from the golden-clip corpus; user-entered bat-length
  prior (`arch §13`, `arch §Calibration framework`).
- **Calibration outputs.** Per-keypoint positional residual; track
  quality distribution; pixel-to-inch scaler derived from bat-length
  prior (`gap §A`, `arch §13`).
- **Calibration evidence.** Golden-clip residuals; bat-length prior
  provenance; determinism and replay proofs.
- **Calibration certificate requirements.** Scoped per §1.6 and
  additionally per declared bat-length prior class; binds artifact
  version.
- **Drift-detection requirements.** Track-quality distribution shift;
  pixel-to-inch residual shift when ground-truth bat lengths are
  available.
- **Recalibration requirements.** Same as §2.1; additionally triggered
  by any change in the bat-length prior policy (`arch §Calibration
  framework`).

### 2.4 D-BALL (`bp §B4`)

- **Calibration inputs.** Labeled pitched-ball positions and Kalman
  track ground truth from the golden-clip corpus.
- **Calibration outputs.** Track residual distribution; release-window
  detection reliability curve.
- **Calibration evidence.** Golden-clip residuals; determinism and
  replay proofs.
- **Calibration certificate requirements.** Scoped per §1.6.
- **Drift-detection requirements.** Track residual or detection
  reliability deviation vs baseline.
- **Recalibration requirements.** As §2.1.

### 2.5 D-CONTACT (`bp §B5`)

- **Calibration inputs.** Labeled contact-frame ground truth (audio
  transient and barrel-to-ball proximity) from the golden-clip corpus.
- **Calibration outputs.** Frame-index residual distribution per
  frame-density tier; confidence-vs-residual curve.
- **Calibration evidence.** Golden-clip residuals at T-mid and T-high;
  determinism and replay proofs.
- **Calibration certificate requirements.** Scoped per §1.6 with
  mandatory per-tier evidence (contact requires the per-tier tolerance
  declared in `val §3`).
- **Drift-detection requirements.** Per-tier residual shift; audio
  vs visual sub-signal divergence vs baseline.
- **Recalibration requirements.** As §2.1.

### 2.6 D-PLANT (`bp §B7`)

- **Calibration inputs.** Labeled front-foot plant frames from the
  golden-clip corpus.
- **Calibration outputs.** Plant frame-index residual distribution;
  confidence-vs-residual curve.
- **Calibration evidence.** Golden-clip residuals; determinism and
  replay proofs.
- **Calibration certificate requirements.** Scoped per §1.6.
- **Drift-detection requirements.** Frame-index residual shift vs
  baseline.
- **Recalibration requirements.** As §2.1.

### 2.7 D-RELEASE (`bp §B6`)

- **Calibration inputs.** Labeled pitcher-release frames from the
  golden-clip corpus.
- **Calibration outputs.** Release frame-index residual distribution;
  pitcher-in-frame reliability curve.
- **Calibration evidence.** Golden-clip residuals; determinism and
  replay proofs.
- **Calibration certificate requirements.** Scoped per §1.6.
- **Drift-detection requirements.** Frame-index residual shift; in-
  frame reliability shift vs baseline.
- **Recalibration requirements.** As §2.1.

---

## 3. Anchor Calibration Architecture

Rows derive from `arch §Event anchors` and `bp §C`. Requirements
inherit from `val §3` and `bp §H2/H3`.

### 3.1 Launch anchor

- **Ground-truth requirements.** Labeled swing-initiation frames in the
  golden-clip corpus (`bp §H2`).
- **Calibration evidence.** Frame-index residual distribution against
  ground truth at canonical frame-density tier; determinism and replay
  proofs.
- **Anchor certificate requirements.** Scope per §1.6 (frame-density
  tier mandatory); binds dependent detector certificates (D-POSE,
  D-HANDS).
- **Drift monitoring.** Residual distribution shift; anchor confidence
  distribution shift vs baseline.
- **Recalibration triggers.** Drift breach; any dependent detector
  certificate supersession; version pin change (`bp §F1`).

### 3.2 Heel Plant anchor

- **Ground-truth requirements.** Labeled heel-plant frames in golden
  clips.
- **Calibration evidence.** Frame-index residual; ankle/heel y-velocity
  zero-crossing reliability; determinism and replay proofs.
- **Anchor certificate requirements.** Scope per §1.6; binds D-PLANT
  and D-POSE certificates.
- **Drift monitoring.** Residual or reliability shift vs baseline.
- **Recalibration triggers.** As §3.1.

### 3.3 Contact anchor

- **Ground-truth requirements.** Labeled contact frames; per-tier
  ground truth required because tolerance varies with frame-density
  tier (`val §3`).
- **Calibration evidence.** Per-tier frame-index residual; audio-vs-
  visual sub-signal residual; determinism and replay proofs.
- **Anchor certificate requirements.** Scope per §1.6 with per-tier
  evidence mandatory; binds D-CONTACT and D-BAT certificates.
- **Drift monitoring.** Per-tier residual shift; sub-signal divergence.
- **Recalibration triggers.** As §3.1; additionally a change in the
  permitted source set for contact (`arch §Event anchors`).

### 3.4 Release anchor

- **Ground-truth requirements.** Labeled pitcher-release frames in
  golden clips.
- **Calibration evidence.** Frame-index residual; pitcher-visibility
  reliability; determinism and replay proofs.
- **Anchor certificate requirements.** Scope per §1.6; binds D-RELEASE
  and D-POSE certificates.
- **Drift monitoring.** Residual or visibility-reliability shift.
- **Recalibration triggers.** As §3.1.

### 3.5 Finish anchor

- **Ground-truth requirements.** Labeled finish frames per finish-and-
  balance methodology surfaced in `arch §17` and `extract`.
- **Calibration evidence.** Frame-index residual; balance-window
  stability evidence; determinism and replay proofs.
- **Anchor certificate requirements.** Scope per §1.6; binds D-POSE
  certificate.
- **Drift monitoring.** Residual or balance-window stability shift.
- **Recalibration triggers.** As §3.1.

---

## 4. Metric Calibration Architecture

All 18 canonical BH metrics (`arch §Part 2`). Each row enumerates the
calibration linkages already declared in the architecture, blueprint,
and gap analysis. No new dependencies, evidence types, or thresholds
are introduced. Where the architecture marks a metric as scale-free
(`arch §Calibration framework`), the metric carries no metric-scaling
certificate; it still carries the confidence-curve certificate of §5.

For every metric:
- **Detector dependencies** = the detectors named in the metric's
  `arch §Part 2` row.
- **Anchor dependencies** = the anchors named in the metric's
  `arch §Part 2` row.
- **Confidence-curve linkage** = §5.3 of this document.
- **Drift-detection requirements** = drift in (a) any dependency
  certificate, (b) the metric's residual distribution vs golden-clip
  ground truth (`bp §H2`), or (c) its confidence-vs-residual curve
  (`bp §H3`).
- **Recalibration requirements** = re-issue under `val §6.4` after any
  drift breach (§6), any dependency certificate supersession (§5.6),
  or any version-pin change (`bp §F1`).
- **Calibration certificate requirements** = scope per §1.6; manifest
  per §1.3; binds every dependency certificate by id and version.

Per-metric required calibration evidence (read directly from `arch
§Part 2` and `bp §D`):

1. **`hip_load` (P1)** — scale-free; evidence = visibility-weighted
   hip-load residuals on golden clips; depends on D-POSE; no metric-
   scaling certificate.
2. **`hand_load` (P2)** — scale-free; evidence = hand-load residuals
   on golden clips; depends on D-POSE, D-HANDS; Launch anchor.
3. **`p2_timing` (P2)** — deterministic anchor pair; evidence = signed
   Δframe residuals at canonical tiers; depends on D-POSE, D-HANDS,
   D-RELEASE; pitcher-window anchor + Launch.
4. **`eyes_tracking` (P2)** — scale-free; evidence = head/eye tracking
   residuals on golden clips; depends on D-POSE; Launch and Contact
   anchors.
5. **`stride_direction` (P3)** — scale-free; evidence = stride-vector
   angle residuals; depends on D-POSE; Launch and Heel Plant anchors.
6. **`heel_plant` (P3)** — scale-free; evidence = plant-quality
   residuals; depends on D-POSE, D-PLANT; Heel Plant anchor.
7. **`p3_timing` (P3)** — deterministic anchor pair; evidence = signed
   Δframe residuals; depends on D-PLANT, D-RELEASE; Heel Plant and
   Release anchors.
8. **`hands_outside_shoulders_at_landing` (P3)** — scale-free;
   evidence = lateral-offset residuals at landing; depends on D-POSE,
   D-HANDS, D-PLANT; Heel Plant anchor.
9. **`sequencing` (P4)** — scale-free; evidence = peak-ordering
   residuals; depends on D-POSE; Launch and Contact anchors.
10. **`bat_path` (P4)** — scale-free; evidence = bat-track residuals
    inside the zone window; depends on D-POSE, D-BAT; Launch and
    Contact anchors.
11. **`on_plane` (P4)** — scale-free; evidence = plane-residual
    distribution; depends on D-POSE, D-BAT; Launch and Contact
    anchors.
12. **`time_to_contact` (P4)** — deterministic anchor pair;
    evidence = signed Δframe residuals; depends on D-POSE, D-CONTACT;
    Launch and Contact anchors.
13. **`bat_speed_contact` (P4)** — **mandatory metric scaling**
    (`arch §13`, `arch §Calibration framework`); evidence = pixel→inch
    scaler residuals against user-entered bat-length prior, plus
    velocity residuals on golden clips; depends on D-BAT, D-CONTACT;
    Contact anchor; **certificate carries the bat-length prior
    provenance**.
14. **`back_elbow_contact` (P4)** — scale-free; evidence = elbow-angle
    residuals at contact; depends on D-POSE, D-BAT; Contact anchor.
15. **`hitters_move` (P4)** — composite; evidence = constituent-metric
    residuals (inherited from each child metric's certificate); depends
    on the union of child-metric dependencies; no independent metric-
    scaling certificate.
16. **`shoulder_plane_steadiness` (P4)** — scale-free; evidence =
    shoulder-plane-angle residuals across the swing window; depends on
    D-POSE; Launch and Contact anchors.
17. **`finish_balance` (P4)** — scale-free; evidence = balance-window
    residuals; depends on D-POSE; Finish anchor.
18. **`shoulder_to_shoulder_hold` (P4)** — scale-free; evidence =
    chin-to-shoulder hold residuals; depends on D-POSE; Contact and
    Finish anchors.

---

## 5. Confidence Calibration Architecture

Anchored to `arch §Confidence model`, `bp §H3`, and `val §6.6`.

### 5.1 Detector confidence calibration

Per detector (§2.1–§2.7), the certificate stores a reliability curve
mapping reported detector confidence to observed correctness on the
golden-clip corpus. Curve must be monotonic non-decreasing within the
certificate's segmentation cell. The reliability curve is itself part
of the certificate manifest (§1.3) and is replay-reconstructable.

### 5.2 Anchor confidence calibration

Per anchor (§3.1–§3.5), the certificate stores a temporal-tolerance
curve mapping reported anchor confidence to observed frame-index
residual at the relevant frame-density tier (`val §3`). Anchors with
per-tier evidence requirements (e.g., Contact) carry one curve per
tier within the same certificate.

### 5.3 Metric confidence calibration

Per metric (§4), the certificate stores a residual-vs-stated-confidence
curve derived from the metric's golden-clip residuals (`bp §H2`,
`bp §H3`). The metric's stated confidence is the product defined in
`arch §Confidence model`; the certificate documents the empirically
observed residual at each band of that product within the segmentation
cell.

### 5.4 Confidence-curve validation requirements

Every confidence curve in §5.1–§5.3 is validated through Harness H3
(`bp §H3`, `val §6.6`). The harness output is part of the certificate
evidence manifest (§1.3). Curves that fail monotonicity or exceed the
calibration tolerance declared in `val §6.6` MUST NOT receive a
certificate.

### 5.5 Confidence certificate requirements

Confidence certificates are issued alongside the corresponding
detector, anchor, or metric certificate and share its scope (§1.6) and
version pin (`bp §F1`). A component cannot hold a calibration
certificate without the matching confidence certificate, and vice
versa.

### 5.6 Confidence drift detection

Drift is declared when the live reliability or residual curve deviates
from the certificate baseline beyond the tolerance recorded in `val
§6.6`, or when monotonicity is violated. Detection is deterministic
against the baseline stored in the certificate. Drift response follows
§6 (demotion before correction).

---

## 6. Calibration Certificate Framework

### 6.1 Certificate contents

A certificate MUST contain:

- Component identifier and type (detector / anchor / metric /
  confidence).
- Version pin of the underlying artifact (`bp §F1`).
- Scope tuple (segment, frame-density tier, device class) per §1.6.
- Evidence manifest hash covering the full §1.3 contents.
- Issuance fingerprint binding to the validation run (`val §6`).
- Dependency-binding table listing every upstream certificate by id
  and version (per §2/§3/§4/§5).
- Expiry conditions (§6.5).
- Supersession pointer (null at issuance; populated on supersession).

### 6.2 Certificate authority

Certificates are issued only by the validation framework
(`val §6`, `val §7`). No runtime component may self-issue,
self-renew, or modify a certificate. Coaching, presentation, and AI
surfaces are consumers only (`gap §D`, `bp §E4`).

### 6.3 Evidence retention

Every artifact named in the evidence manifest (§1.3) MUST be retained
under an immutable retention handle, addressable by the manifest hash,
for the life of every certificate that references it and for every
downstream certificate that transitively depends on it. Retention
duration is governed by the validation framework's evidence-retention
rule (`val §1.6`, `val §6`).

### 6.4 Certificate invalidation

A certificate becomes invalid when any of the following occurs:

1. A dependency certificate is invalidated, demoted, or superseded.
2. Evidence in the manifest is withdrawn or its retention handle
   becomes unreachable.
3. A drift breach is recorded against it (§7).
4. The component's pinned version (`bp §F1`) changes.
5. The validation framework records a demotion event against the
   component (`val §1.5`).

An invalid certificate may not be consumed by any downstream component.

### 6.5 Certificate expiration conditions

Certificates expire on:

- Version migration of the underlying artifact (`bp §F1`,
  `val §6.7`).
- Version migration of any dependency certificate.
- Documented shift in the segment population that defines the scope
  cell (e.g., a new device class added to `CaptureEnvelope`, `bp §G1`).
- Any condition listed in `val §6.7` (Version Migration Validation).

Expiration is not silent: the expired certificate is retained, its
expiration is recorded, and the downstream component demotes per `val
§7`.

### 6.6 Certificate supersession rules

A superseding certificate is appended; the prior certificate is
retained and its supersession pointer is updated. Supersession MUST
preserve the dependency-binding chain back to ground truth. No
edit-in-place. No silent overwrite. Supersession is replay-visible by
construction (`val §6.2`).

---

## 7. Calibration Drift Framework

### 7.1 Drift detection

Drift detection runs deterministically against the baselines stored in
each certificate (§1.3, §5). Detection inputs are golden-clip
residuals, production residuals routed through the missingness audit
(`bp §H4`), and confidence-curve observations produced by H3
(`bp §H3`). Detection MAY NOT use any data path that is not
replay-reconstructable (`bp §H5`).

### 7.2 Drift classification

Drift is classified into one of four categories — no other categories
are introduced:

1. **Input-distribution drift.** The distribution of inputs to the
   component diverges from the segmentation cell baseline.
2. **Residual drift.** The component's residual distribution against
   ground truth diverges from baseline.
3. **Confidence-curve drift.** The reliability or residual-vs-
   confidence curve (§5) diverges from baseline or violates
   monotonicity.
4. **Dependency-induced drift.** A bound dependency certificate has
   drifted, expired, been invalidated, or been superseded.

### 7.3 Drift severity categories

Severities are mapped onto the existing trust-class ladder defined in
`val §7`; no new ladder is introduced.

- **Nominal.** Within certificate tolerance. No action.
- **Watch.** Tolerance approached but not breached. Logged into the
  certificate's drift evidence record (§7.4). No demotion.
- **Warn.** Tolerance breach on a non-promotion-gating metric of the
  certificate. Logged. Triggers re-evaluation under `val §7`.
- **Breach.** Tolerance breach on a promotion-gating metric, or a
  Dependency-induced drift event. Forces demotion of the affected
  component by one trust class per `val §1.5` and `val §7`.

### 7.4 Drift evidence retention

Every drift observation — at any severity — is recorded against the
certificate it concerns and retained under the same immutability and
addressability rules as evidence in §6.3. Drift evidence is part of
the certificate's permanent history and is preserved through
supersession (§6.6).

### 7.5 Promotion and demotion implications

- Drift Breach (§7.3) → demotion by exactly one trust class per `val
  §7`. No silent re-fit. No skipping the validation framework on
  re-promotion.
- Drift Warn → no demotion, but blocks any pending promotion of the
  component under `val §7` until cleared.
- Drift Watch and Nominal → no promotion or demotion impact.
- Re-promotion after demotion requires a new certificate issued
  through the full `val §6`/`val §7` path; the prior certificate is
  retained per §6.6.

---

## 8. Closing constraints (restated)

- Calibration architecture only.
- No code.
- No implementation.
- No roadmap.
- No sequencing.
- No prioritization.
- No architecture changes.
- No blueprint changes.
- No validation-framework changes.
- No new metrics, detectors, anchors, harnesses, or thresholds.
