
# Phase 6 — Canonical Validation Framework

## Deliverable
One new file: `.lovable/canonical-validation-framework.md`. No other file is touched.

## Read-only inputs
- `.lovable/canonical-measurement-architecture.md` (Parts 0–5)
- `.lovable/canonical-implementation-blueprint.md` (Sections A–I)
- `.lovable/canonical-gap-analysis.md` (Sections A–F)
- `.lovable/analysis-truth-audit.md` (S1–S11)
- `.lovable/analysis-truth-extraction.md` (§1–§10)

Every requirement cell cites one of these. No new methodology, no new detectors, no new metrics, no new harnesses — only the validation rules under which the already-defined components progress from T0 → T4.

## Document structure

**1. Preamble**
- Purpose statement.
- Validation philosophy: evidence supremacy, deterministic-first, missingness-visible, replay-equivalent, additive promotion, demotion-on-regression.
- Trust-class promotion law: monotonic by evidence; promotion requires meeting every gate at the target class; any gate failure forces immediate demotion to the highest class whose gates still hold.
- Promotion requirements (universal preconditions across detectors, anchors, metrics, report-card surfaces).
- Demotion requirements (regression triggers, observed-failure triggers, version-pin breakage, replay-divergence triggers).
- Validation evidence hierarchy (ranked, highest authority first): replay-determinism proof → golden-clip ground truth → calibration certificate → confidence-calibration curve → missingness-routing audit → human-labeled spot check → AI residual envelope check.

**2. Detector Validation Framework**
One row per detector (D-POSE, D-HANDS, D-BAT, D-BALL, D-CONTACT, D-PLANT, D-RELEASE). Each row defines T0–T4 plus required evidence, required replay stability, required determinism proof, required confidence thresholds. Class definitions (uniform across detectors):
- T0 — absent/stub (cites `audit S3` baseline).
- T1 — wired at pinned version; emits per-frame output; no calibration; no replay evidence.
- T2 — passes determinism harness (`bp §H1`) on a fixed input; per-keypoint confidence exposed.
- T3 — passes golden-clip suite (`bp §H2`) at per-detector pass-rate floor; calibration-aware where applicable; replay-equivalent across re-runs.
- T4 — passes all blueprint §I gates; gateway/runtime determinism verified; missingness routes to canonical enum (`arch P0`).

**3. Anchor Validation Framework**
Rows: Launch, Heel Plant, Contact, Release, Finish (using the canonical-anchor names from `arch P1` and `bp §C`). Per anchor:
- Validation requirements (source detector binding, contributing signals, `{frame_index, t_ms, confidence, source_detector, contributing_signals[]}` schema completeness).
- Replay requirements (bit-identical `frame_index` and `t_ms` across two engine runs on the same trace; cites `bp §F5`/`§H5`).
- Tolerance requirements (per-anchor frame tolerance vs golden ground truth at T-low/T-mid/T-high — values referenced as "per blueprint §H2" rather than newly invented).
- Confidence requirements (minimum confidence to be considered "detected"; below that emits `anchor_not_detected` per `arch P0 missingness enum`).
- Promotion criteria T0→T4 mirroring detector ladder.

**4. Metric Validation Framework**
All 18 canonical BH metrics (rows reuse the gap-analysis Section A list). Per metric:
- T0–T4 definition using shared class semantics:
  - T0 fabricated / AI-only (audit baseline).
  - T1 detector dependency wired; producer replaced; no calibration evidence.
  - T2 deterministic engine output passes determinism harness; missingness routes correctly.
  - T3 calibration certificate present where required; confidence-calibration curve within tolerance; golden-clip pass-rate floor met.
  - T4 all blueprint §I gates pass; replay-equivalent; AI residual envelope verified bounded.
- Required detector dependencies (cite Gap-Analysis §A "Required Detectors").
- Required anchor dependencies (cite Gap-Analysis §A "Required Anchors").
- Required calibration evidence (cite Gap-Analysis §A + `arch P1 calibration framework`).
- Required replay evidence (`bp §H5`).
- Required confidence evidence (calibration curve binding per `bp §H3`).
- Required missingness behavior (which enum values must be emittable; cite `arch P0`).

Compact row format (markdown table per metric, with T-ladder + dependency cells), so the section stays readable across 18 rows.

**5. Report Card Validation Framework**
Validation requirements for each surface, with T-ladder where promotion makes sense:
- Phase percentages — formula equivalence to `bp §E2`; replay-equivalent over the same tile set.
- Phase orbs — single-denominator presentation; color thresholds match `bp §E2`.
- Tile states — `TileStateMapper` produces identical state given identical inputs; confidence-aware downgrade verified.
- Ribbon generation — non-negotiable computation excludes missing tiles (gap analysis §D).
- Confidence surfacing — every tile carries `[0,1]` confidence; surfaced one interaction away.
- Missingness surfacing — every missing tile carries a canonical enum reason (no `single_pass_only` umbrella).
- Coaching-layer boundaries — AI output never overwrites engine values; presenter-only validation contract.

**6. Validation Harness Matrix**
One block per harness (named exactly as in `bp §H`):
- Golden-clip validation (`bp §H2`).
- Replay validation (`bp §H5`).
- Determinism validation (`bp §H1`).
- Calibration validation (`bp §H3` — confidence calibration; plus `arch P1` calibration framework certificate check).
- Missingness validation (`bp §H4`).
- Confidence validation (`bp §H3`).
- Version migration validation (engine-version pin promotion; cites `bp §F1`).
Per harness: Purpose, Inputs, Pass criteria, Failure criteria, Evidence retained.

**7. Trust-Class Promotion Matrix**
Four promotion-transition tables (T0→T1, T1→T2, T2→T3, T3→T4), each with rows for Detectors, Anchors, Metrics, Report-card outputs. Each cell lists the exact gates that must be satisfied to perform that transition. Demotion column states which observed failure forces a return to the prior class.

**8. Closing Constraints**
Restates: validation framework only; no code, no implementation, no roadmap, no sequencing, no prioritization, no architecture/blueprint/gap-analysis changes; subsequent phases consume this framework.

## Hard constraints
- Only `.lovable/canonical-validation-framework.md` is created.
- No edits anywhere else (no plan.md edit either).
- Every requirement cites architecture, blueprint, gap-analysis, audit, or extraction. No new metrics, detectors, anchors, harnesses, or thresholds invented.
- No code, schema, prompts, UI, roadmap, sequencing, owners, or estimates.
