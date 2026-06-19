# Report Card Implementation Authority Package — Phase 24

Status: Reality-only authority extraction. No code. No architecture changes. No doctrine changes. No new metrics, detectors, anchors, validation, calibration, confidence requirements, or production gates are introduced here.

Source inputs (read-only):
- `.lovable/report-card-root-blocker-decomposition-audit.md` (Phase 23) — root blocker F-9 decomposed into D-1…D-11.
- `.lovable/report-card-blocker-collapse-audit.md` (Phase 22) — single root blocker F-9 identified.
- `.lovable/report-card-metric-truth-closure-audit.md` (Phase 21) — F-1…F-9 truth blocker family.
- `.lovable/report-card-metric-truth-audit.md` — metric inventory and current truth state (0/30 supported).
- `.lovable/canonical-execution-authorization.md` — execution authorization preconditions.
- `.lovable/canonical-build-plan.md` — declared build surfaces and obligations.
- `.lovable/canonical-verification-audit.md` — validation harness obligations.
- `.lovable/canonical-production-readiness-audit.md` — calibration, confidence, and production-gate obligations.
- `.lovable/canonical-implementation-execution-audit.md` — implementation execution state.

Read-only repository cross-reference surfaces (no edits in this phase):
- `src/lib/biomech/**` (currently `versions.ts` only; `@0.0.0-stub` triplet per Phase 23 §3).
- `src/lib/reportCard/**` (contracts + types).
- `supabase/functions/analyze-video/**`.
- `src/hooks/useReportCardTrend.ts`, `src/hooks/usePitchingV2Trends.ts`, `src/hooks/useHIESnapshot.ts`.

---

## §1 Authority Scope

This package extracts the implementation work already authorized by the completed canonical stack (Phases 1–23) and by the F-9 dependency decomposition D-1…D-11. It:

- Names exactly what is authorized.
- Names exactly what is not authorized (anything not derivable from the source inputs).
- Introduces no new requirements, no remediation, no estimates, no prioritization beyond the dependency order already established in Phase 23 §4.
- Authority is restated, not re-derived; every entry below is traceable to a section of a source input identified above.

Out of scope: writing code, mutating contracts, adding gates, expanding the metric inventory, changing the canonical doctrine, defining new acceptance criteria, or sequencing/estimating beyond the order Phase 23 already fixed.

---

## §2 Authorized Deterministic Evidence Layer Work

Authority basis: Phase 23 §3 (D-1…D-6), §5; canonical-build-plan deterministic measurement surfaces; canonical-execution-authorization preconditions.

Authorized work units, each restated from existing canonical requirements:

- **D-1 — Deterministic frame layer.** Replace the `@0.0.0-stub` triplet in `src/lib/biomech/versions.ts` with a real, lineage-emitting deterministic frame extraction surface consistent with `src/lib/frameExtraction.ts` and `src/lib/biomech/frameExtractionDeterministic.ts` already present. No new selection algorithm; existing canonical selection stands.
- **D-2 — Deterministic pose stream.** Per-frame pose output bound to D-1 frame indices, emitted as replayable per-frame records. Pose source identity and version are part of lineage per canonical-build-plan.
- **D-3 — Anchor stream.** Per-anchor records derived deterministically from D-2, scoped to the anchors already named in `.lovable/back-elbow-methodology.md`, `.lovable/p3-timing-methodology.md`, `.lovable/finish-and-balance-methodology.md`, `.lovable/bat-path-vs-on-plane-definitions.md`, `.lovable/time-to-contact-vs-power.md`. No new anchors.
- **D-4 — Detector outputs.** Per-detector records bound to D-3, only for detectors already declared in canonical-build-plan.
- **D-5 — Metric engine outputs.** Per-metric records bound to D-4, scoped to the 30 metrics inventoried in `.lovable/report-card-metric-truth-audit.md`.
- **D-6 — Persisted replayable artifacts.** Frame/anchor/detector/metric outputs persisted with lineage handles (engine_version, reasoning_version, replay handle) sufficient for byte-identical reconstruction per canonical-build-plan replay obligation.

Not authorized here: any new evidence type; any non-deterministic estimator; any AI-only substitution path for D-1…D-6.

---

## §3 Authorized Detector Implementation Work

Authority basis: Phase 23 §3 D-4; canonical-build-plan detector surfaces; canonical-verification-audit detector validation obligations.

Authorized work: implement the detector set already named in canonical-build-plan as deterministic functions over D-3 anchor streams. Each detector emits a replayable record carrying inputs, outputs, version, and lineage handles. Detector identity, inputs, and output schema are restated from canonical-build-plan; this package adds none.

Not authorized: introducing detectors that do not appear in canonical-build-plan; modifying detector definitions; substituting AI-only outputs for detector outputs.

---

## §4 Authorized Anchor Implementation Work

Authority basis: Phase 23 §3 D-3; methodology docs in `.lovable/` (back-elbow, p3-timing, finish-and-balance, bat-path-vs-on-plane, time-to-contact-vs-power); canonical-build-plan anchor surfaces.

Authorized work: implement deterministic anchor identification over D-2 pose streams for the anchor set already specified in the methodology documents and canonical-build-plan. Each anchor emits a replayable record bound to a D-1 frame index and a D-2 pose record.

Not authorized: new anchor types; redefinition of existing anchors; relaxing determinism on anchor identification.

---

## §5 Authorized Metric Engine Work

Authority basis: Phase 23 §3 D-5; `.lovable/report-card-metric-truth-audit.md` 30-metric inventory; canonical-verification-audit metric obligations; `src/lib/reportCard/contracts/bp.contract.ts` and `src/lib/reportCard/types.ts`.

Authorized work: implement metric computation functions strictly over D-4 detector outputs, producing values consistent with the existing contracts in `src/lib/reportCard/contracts/**` and the 30-metric inventory. Each metric output carries the lineage chain D-1 → D-2 → D-3 → D-4 → D-5 and the engine_version/reasoning_version handles required for replay.

Not authorized: introducing metrics outside the 30-metric inventory; substituting AI estimates for deterministic metric computation; deriving metrics from sources outside D-4.

---

## §6 Authorized Validation Harness Work

Authority basis: Phase 23 §3 D-7, §7; canonical-verification-audit; canonical-validation-framework (referenced by canonical-verification-audit).

Authorized work: implement the validation harness already declared in canonical-verification-audit — a labeled-dataset-driven harness producing per-detector and per-metric agreement records against ground truth, emitting replayable validation artifacts referenced by the production-gate matrix. Dataset surface, agreement metrics, and emission schema are restated from canonical-verification-audit; none are added here.

Not authorized: defining new validation metrics; relaxing harness scope; substituting AI-only self-judgment for labeled-dataset agreement.

---

## §7 Authorized Calibration Infrastructure Work

Authority basis: Phase 23 §3 D-8; canonical-production-readiness-audit calibration obligations; `.lovable/canonical-calibration-architecture.md` (referenced by canonical-production-readiness-audit).

Authorized work: implement the calibration infrastructure already declared — calibration reference set, per-metric calibration emitters, and persisted calibration artifacts consumed by the confidence layer (§8) and the production-gate layer (§9). Calibration reference identity and emission schema are restated; none are added.

Not authorized: introducing alternative calibration methods; expanding calibration surface beyond canonical declarations.

---

## §8 Authorized Confidence Infrastructure Work

Authority basis: Phase 23 §3 D-9 and D-10; canonical-production-readiness-audit confidence and missingness obligations; `.lovable/canonical-confidence-architecture.md`, `.lovable/confidence-source-trace.md`.

Authorized work:
- **D-9 — Calibrated confidence surface.** Implement the calibrated confidence emitter declared in canonical-confidence-architecture, consuming calibration artifacts from §7 and producing per-metric calibrated confidence with lineage.
- **D-10 — Deterministic missingness surface.** Implement the deterministic missingness emitter declared in canonical-production-readiness-audit, exposing missing-evidence states without imputation or smoothing.

Not authorized: heuristic confidence estimates outside the calibration pipeline; missingness suppression; composite confidence scores without lineage decomposition.

---

## §9 Authorized Production Gate Closure Work

Authority basis: Phase 23 §3 D-11; canonical-production-readiness-audit production-gate obligations; `.lovable/canonical-production-gate-matrix.md`; canonical-implementation-execution-audit.

Authorized work: implement the per-gate evidence emitters declared in canonical-production-gate-matrix, such that each gate consumes outputs from D-6 (replayable artifacts), D-7 (validation), D-8 (calibration), D-9 (calibrated confidence), and D-10 (missingness), and produces a per-gate decision record with full lineage. Gate identity, inputs, and decision schema are restated from canonical-production-gate-matrix; none are added.

Not authorized: introducing new gates; relaxing gate thresholds; bypassing any input branch.

---

## §10 Authorized Repository Touchpoints

Authority basis: Phase 23 §6 repository touchpoint matrix.

Authorized surfaces (all already named in Phase 23 §6):
- `src/lib/biomech/**` — deterministic evidence layer (D-1…D-6), detectors (§3), anchors (§4), metric engine (§5), versions and lineage handles.
- `src/lib/reportCard/**` — contracts and types consumed by metric engine and gate emitters; no contract redefinition authorized here.
- `supabase/functions/analyze-video/**` — server-side invocation of the deterministic evidence layer and persistence of D-6 artifacts.
- `src/hooks/useReportCardTrend.ts`, `src/hooks/usePitchingV2Trends.ts`, `src/hooks/useHIESnapshot.ts` — consumers of D-5/D-6/D-9/D-10/D-11 outputs.

No other surfaces are authorized for change under this package.

---

## §11 Implementation Dependency Order

Authority basis: Phase 23 §4 dependency relationship map.

Linear measurement spine (must precede branches):

```text
D-1 → D-2 → D-3 → D-4 → D-5 → D-6
```

Branches (each requires D-6 in addition to its declared input):

```text
D-6 → D-7 (validation harness)
D-6 → D-8 (calibration infrastructure)
D-8 → D-9 (calibrated confidence)
D-6 → D-10 (deterministic missingness)
{D-6, D-7, D-8, D-9, D-10} → D-11 (per-gate emitters)
```

This order is restated, not introduced. No alternative ordering is authorized.

---

## §12 First Executable Report Card Slice

Authority basis: Phase 21 §2 Truth Supported criteria; Phase 23 §8 minimal closure set { D-1…D-6 } extended to { D-1…D-11 } for a single Truth Supported metric; canonical-build-plan single-surface scope; `src/lib/reportCard/contracts/bp.contract.ts` (sole concrete contract present today).

The smallest authorized slice that exercises D-1…D-11 end-to-end is:

- **Surface:** one report-card surface bound to `src/lib/reportCard/contracts/bp.contract.ts` (Batter's Profile tile).
- **Metric:** one metric from the 30-metric inventory whose definition, anchors, and detectors are fully specified in the existing methodology docs (e.g., a metric grounded in `.lovable/back-elbow-methodology.md` or `.lovable/p3-timing-methodology.md`). Selection of the specific metric is made at implementation time from within that already-specified set; no metric outside the inventory is authorized.
- **Pipeline coverage:** D-1 frames → D-2 pose → D-3 anchors → D-4 detectors → D-5 metric → D-6 persisted artifacts → D-7 validation → D-8 calibration → D-9 calibrated confidence → D-10 deterministic missingness → D-11 per-gate emitters.
- **Closure test:** the chosen metric satisfies all clauses of Phase 21 §2 Truth Supported (evidence present, lineage intact, no placeholder dependency, no AI-only dependency, confidence surface present, calibration present, validation present, production gate emitting).

No additional surfaces, metrics, or pipeline alternatives are authorized for the first slice.

---

## §13 Report Card Release 1 Completion Definition

Authority basis: canonical-production-readiness-audit Release 1 criteria; Phase 21 §2 Truth Supported criteria; canonical-implementation-execution-audit completion semantics.

Release 1 is complete when **every metric in the 30-metric inventory** (`.lovable/report-card-metric-truth-audit.md`) is Truth Supported per Phase 21 §2:

1. Backed by deterministic D-1…D-6 evidence with intact lineage.
2. No placeholder dependency (F-2).
3. No AI-only dependency (F-4).
4. Validation harness (§6) produces a passing record for the metric.
5. Calibration artifact (§7) exists for the metric.
6. Calibrated confidence surface (§8) emits for the metric.
7. Deterministic missingness surface (§8) emits for the metric.
8. Production-gate emitter (§9) issues a decision record for every gate that consumes the metric, per canonical-production-gate-matrix.

Anything short of all 30 metrics satisfying all 8 clauses is, by canonical definition, not Release 1.

---

## §14 Final Authorization

All sections §2–§13 above are direct restatements of obligations and dependencies established in the source inputs. No new requirements have been introduced. The dependency order in §11 and the first-slice scope in §12 are fully derivable from Phase 23 and the canonical stack.

**Determination: AUTHORIZED FOR IMPLEMENTATION.**

Scope of authorization: the work units named in §2–§9, confined to the touchpoints in §10, executed in the order in §11, beginning with the slice in §12, and complete only when §13 is satisfied. No work outside this scope is authorized by this package.
