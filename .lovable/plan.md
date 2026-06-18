# Phase 9 — Canonical Production Gate Matrix

## Deliverable

Create exactly one new file:

- `.lovable/canonical-production-gate-matrix.md`

No other files are created, modified, or deleted in this phase. `.lovable/plan.md` is intentionally left untouched per the explicit "No other files touched" constraint in the request.

## Source Inputs (Read-Only)

- `.lovable/canonical-measurement-architecture.md`
- `.lovable/canonical-implementation-blueprint.md`
- `.lovable/canonical-gap-analysis.md`
- `.lovable/canonical-validation-framework.md`
- `.lovable/canonical-calibration-architecture.md`
- `.lovable/canonical-confidence-architecture.md`
- `.lovable/analysis-truth-audit.md`
- `.lovable/analysis-truth-extraction.md`

## Document Structure

The new file will contain the following sections, in order:

1. **Preamble**
   - Production philosophy (evidence-first, replay-equivalent, calibration-bound, confidence-visible, missingness-visible, additive-only).
   - Evidence-first release law: nothing reaches production users without validation evidence (`val §*`), calibration certificate (`cal §*`), and confidence binding (`conf §*`).
   - Promotion authority hierarchy: validation framework → calibration certificate → confidence binding → production gate matrix.
   - Demotion authority hierarchy: any one upstream invalidation auto-demotes; demotion-before-correction.
   - Release eligibility philosophy: components are presentation-only consumers of pre-certified evidence; no surface authors organism truth.

2. **Detector Production Gates** — rows: `D-POSE`, `D-HANDS`, `D-BAT`, `D-BALL`, `D-CONTACT`, `D-PLANT`, `D-RELEASE`. Columns: validation status, calibration status, confidence status, certificate, replay, missingness, production eligibility, demotion triggers. All cells reference existing requirements from validation, calibration, and confidence documents.

3. **Anchor Production Gates** — rows: `Launch`, `Heel Plant`, `Contact`, `Release`, `Finish`. Columns: required detector eligibility, validation, calibration, confidence, replay, production eligibility, demotion triggers.

4. **Metric Production Gates** — all 18 canonical BH metrics. Columns: required detector eligibility, required anchor eligibility, validation, calibration, confidence, replay, missingness, certificate, production eligibility, demotion triggers.

5. **Report Card Production Gates** — rows: Phase percentages, Phase orbs, Tile states, Ribbon generation, Confidence surfacing, Missingness surfacing, Coaching layer. Columns: eligibility, dependency, replay, production, demotion triggers.

6. **Promotion Authority Matrix** — T0→T1, T1→T2, T2→T3, T3→T4 for detectors, anchors, metrics, report-card outputs. Each cell references existing `val §7` and `cal §7` and `conf §promotion-demotion` requirements only.

7. **Production Demotion Matrix** — dependency failure, certificate invalidation, replay divergence, calibration drift breach, confidence invalidation, missingness routing failure, version migration failure. Each mapped onto existing T0–T4 ladder.

8. **Closing Constraints** — restate scope: production-gate architecture only; no code, implementation, roadmap, sequencing, prioritization, architecture/validation/calibration/confidence changes; no new metrics, detectors, anchors, thresholds, or harnesses.

## Constraints

- No code, schema, prompts, UI, or runtime behavior.
- No new metrics, detectors, anchors, harnesses, thresholds, validation rules, calibration rules, or confidence rules invented.
- Pure references to existing Phase 1–8 canonical documents.
- Only `.lovable/canonical-production-gate-matrix.md` is created.
