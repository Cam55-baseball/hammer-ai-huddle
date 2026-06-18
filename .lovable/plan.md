## Phase 7 — Canonical Calibration Architecture

Create exactly one new file: `.lovable/canonical-calibration-architecture.md`. No other files touched.

### Source inputs (read-only)
- `.lovable/canonical-measurement-architecture.md`
- `.lovable/canonical-implementation-blueprint.md`
- `.lovable/canonical-gap-analysis.md`
- `.lovable/canonical-validation-framework.md`
- `.lovable/analysis-truth-audit.md`
- `.lovable/analysis-truth-extraction.md`

Every clause in the new document will cite one of these. No invented metrics, detectors, anchors, harnesses, or thresholds.

### Document outline

**Preamble**
- Calibration philosophy: evidence-bound, deterministic-first, additive, demotion-on-drift, replay-equivalent, missingness-visible.
- Calibration authority hierarchy: ground truth → calibration certificate → detector/anchor/metric output → confidence curve → report-card surface. Lower tiers may never overwrite higher.
- Calibration evidence requirements: pinned artifact version, canonical_trace_fingerprint, ground-truth source, residual distribution, retention handle.
- Calibration certificate concept: signed, versioned, scope-bounded attestation binding a component to its evidence set.
- Calibration drift philosophy: drift is observed not assumed; detection deterministic; response is demotion before silent correction.
- Population-segmentation philosophy: segments inherited from extraction/audit (age band, handedness, frame-density tier T-low/mid/high, capture modality phone-only); no new segments invented.

**A. Detector Calibration Architecture**
Rows: D-POSE, D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE. Each row: Calibration inputs · Calibration outputs · Calibration evidence · Calibration certificate requirements · Drift-detection requirements · Recalibration requirements. All citations to blueprint §B and gap-analysis §B.

**B. Anchor Calibration Architecture**
Rows: Launch, Heel Plant, Contact, Release, Finish. Each row: Ground-truth requirements · Calibration evidence · Anchor certificate requirements · Drift monitoring · Recalibration triggers. Cites blueprint §C and validation framework anchor section.

**C. Metric Calibration Architecture**
All 18 canonical BH metrics (as enumerated in measurement architecture / gap-analysis §A). Each row: Required calibration evidence · Required detector dependencies · Required anchor dependencies · Calibration certificate requirements · Confidence-curve linkage · Drift-detection requirements · Recalibration requirements.

**D. Confidence Calibration Architecture**
- Detector confidence calibration (per-detector reliability curve).
- Anchor confidence calibration (per-anchor temporal-tolerance curve).
- Metric confidence calibration (per-metric residual-vs-stated-confidence curve).
- Confidence-curve validation requirements (ties to validation harness H3).
- Confidence certificate requirements.
- Confidence drift detection (calibration-curve deviation thresholds, monotonicity violations).

**E. Calibration Certificate Framework**
- Certificate contents: component id, version pin, scope (segment, frame-density tier), evidence manifest hash, issuance fingerprint, expiry conditions, supersession pointer.
- Certificate authority: who/what issues; subordinate to validation framework promotion law.
- Evidence retention: retention handles, immutability, replay reconstructability.
- Certificate invalidation: triggers (dependency demotion, evidence withdrawal, drift breach).
- Certificate expiration conditions: version migration, dependency version change, segment-population shift.
- Certificate supersession rules: additive chain, no silent overwrite, prior certificates retained.

**F. Calibration Drift Framework**
- Drift detection: deterministic comparators against certificate baselines.
- Drift classification: input-distribution drift, residual drift, confidence-curve drift, dependency-induced drift.
- Drift severity categories: nominal, watch, warn, breach (mapped to existing trust-class demotion ladder from validation framework).
- Drift evidence retention.
- Promotion and demotion implications: ties directly to validation framework Trust-Class Promotion Matrix; drift breach forces demotion one tier; no silent recalibration.

**Closing Constraints** (restated verbatim from request).

### Hard constraints
- Calibration architecture only.
- No code, schema, prompts, UI, roadmap, sequencing, prioritization, owners, or estimates.
- No changes to architecture, blueprint, validation framework, or gap analysis.
- No new metrics, detectors, anchors, harnesses, or thresholds invented.
- Only `.lovable/canonical-calibration-architecture.md` is created.
