# Phase 27 — First Truth-Supported Metric Closure

## Objective

Advance the `tempo_sec` slice from Phase 26's IMPLEMENTATION PARTIALLY COMPLETE toward the highest honest truth classification, by retiring **every blocker that is retirable in code today** using existing repository assets. No fabricated evidence, calibration, confidence, or synthetic corpus.

## Deliverables

**One new doc:** `.lovable/phase-27-first-truth-supported-metric-closure.md`

**Code implementation** for every blocker classified as "retirable in code today" after audit of:
- `.lovable/phase-26-implementation-report.md`
- `.lovable/report-card-root-blocker-decomposition-audit.md`
- `.lovable/report-card-metric-truth-closure-audit.md`

## Workflow

1. **Blocker audit pass (read-only).** Enumerate every blocker from the three source docs. Classify each as:
   - Retirable in code today
   - Retirable with repository assets today
   - Requires external evidence
   - Requires labeled corpus
   - Requires non-stub model integration

2. **Code-retirement pass.** Implement every blocker in classes 1–2. Expected areas (final list set by audit):
   - Deterministic lineage hash binding (extend `tempoEvidence.ts` to bind `versions.ts` pins + frame-extraction fingerprint + anchor/detector inputs into a single replay key)
   - Replay artifact persistence shape (canonical JSON shape with stable key ordering)
   - Missingness propagation wiring from `peakLegLift` / `frontFootStrike` / `plantDetector` upward into evidence + gate
   - Confidence status propagation (`uncalibrated` flows end-to-end with reason codes)
   - Gate emitter coverage across the full gate matrix referenced in `canonical-production-gate-matrix.md` for this metric
   - Harness execution path over an empty corpus emitting canonical `no_corpus` outcomes with lineage
   - Report-card integration point: a read-only adapter exposing `tempo_sec` evidence shape to existing report-card readers **without** flipping any truth flag (still gated to `unsupported` / `partial` per real status)
   - Additional unit tests covering every newly wired path

3. **Out of scope (explicitly not retired).**
   - D-POSE `@0.0.0-stub` upgrade (requires model integration)
   - Labeled ground-truth corpus (external data)
   - Calibration certificate emission (requires labeled residuals per `cal §3.2`)
   - Any contract / DB / auto-generated file changes
   - Any new metric, detector, anchor, gate, or doctrine

4. **Truth classification.** Apply canonical criteria to post-implementation `tempo_sec` state. Expected honest outcome given persisting D-POSE stub + absent corpus: **Partially Supported** (Truth Supported not honestly reachable this phase). Final classification driven strictly by audit, not pre-decided.

5. **Write `.lovable/phase-27-first-truth-supported-metric-closure.md`** with:
   - Blocker-by-blocker table (status: retired / partially retired / not retired + repo citations)
   - Evidence section linking each retirement to created/modified files and tests
   - Truth classification with canonical citation
   - "Release 1 Report Card Advancement" section: supported / partially supported / unsupported metric counts from repo evidence
   - Final Determination: `FIRST TRUTH-SUPPORTED METRIC ACHIEVED` or `FIRST TRUTH-SUPPORTED METRIC NOT ACHIEVED`

## Constraints

- No fabricated validation, calibration, confidence, or corpus data
- No doctrine, architecture, or DB changes
- No new metrics, detectors, anchors, gates, validation/calibration/confidence requirements
- No edits to auto-generated files or Supabase client
- Truth classification follows evidence — not a pre-committed outcome

## Risk / honesty note

It is likely the final determination will be **FIRST TRUTH-SUPPORTED METRIC NOT ACHIEVED** with `tempo_sec` reaching **Partially Supported**, because the D-POSE stub and missing labeled corpus are non-code blockers that Phase 27's constraints forbid fabricating around. The plan commits to reporting that honestly rather than forcing a "supported" label.
