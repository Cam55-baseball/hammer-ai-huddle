# Phase 18 — First Implementation Reality Audit

Reality-only audit. No new metrics, detectors, anchors, validation rules,
calibration rules, confidence rules, production gates, governance structures,
remediation plans, or future-state design. Every claim cites either an existing
canonical document or a repository path.

Citation keys:
- `arch` = `.lovable/canonical-measurement-architecture.md`
- `bp`   = `.lovable/canonical-implementation-blueprint.md`
- `trace`= `.lovable/analysis-traceability.md` (per Phase 17 §1)
- `c5e`  = `.lovable/execution-cycle-5-evidence-foundation-audit.md`
- `c6`   = `.lovable/execution-cycle-6-evidence-authority-resolution.md`
- `amd`  = `.lovable/canonical-authority-amendment.md`
- `clo`  = `.lovable/canonical-closure-audit.md`
- `val`  = `.lovable/canonical-validation-framework.md`
- `cal`  = `.lovable/canonical-calibration-architecture.md`
- `conf` = `.lovable/canonical-confidence-architecture.md`
- `gate` = `.lovable/canonical-production-gate-matrix.md`
- `prior`= `.lovable/canonical-implementation-reality-audit.md` (Phase 10)

---

## §1 — Audit Scope

In scope: the six canonical artifacts named in `clo §1` plus the actual
repository implementation surfaces below. Out of scope: any expansion of the
canonical stack (forbidden by `amd §Impact Analysis` and reaffirmed by
`clo §7`).

| Surface | Path |
|---|---|
| Report card framework | `src/lib/reportCard/types.ts`, `src/lib/reportCard/contracts/shared.ts`, `src/lib/reportCard/metricReaders.ts`, `src/lib/reportCard/index.ts` |
| Discipline specs | `src/lib/reportCard/disciplines/bp.ts` (178 lines), `bh.ts` (449 lines), `throwing.ts` (21 lines) |
| AI extractor | `supabase/functions/analyze-video/index.ts` |
| Version pins | `src/lib/biomech/versions.ts` |
| Deterministic biomech surfaces | `src/lib/biomech/{fingerprint,frameExtractionDeterministic,probeVideoMetadata,videoAcceptance,auditTrail}.ts` |
| Athlete entry | `src/pages/AthleteCommand.tsx`, `src/components/hammer/HammerOnboardingChat.tsx` |
| Intelligence | `src/hooks/useMPIScores.ts`, `src/data/baseball/pieV2*`, `src/lib/runtime/modulators/**` |
| Recommendations | `docs/foundations/recommendation-lifecycle.md` |

What exists: an AI-prompted report-card extractor producing per-tile values
with self-declared confidence, three discipline specs (BP/BH/Throwing),
deterministic fingerprint plumbing, athlete command surfaces, MPI/PIE catalogs.

What is partially implemented: per `prior §1.4` and `src/lib/biomech/versions.ts`,
the canonical version triplet exists only as `@0.0.0-stub` strings.

What does not exist: deterministic detectors, anchors, metric engine, calibration
fixtures, certificates, and the production-gate ladder named in
`bp`, `cal`, `gate`, `c5e`, `c6`, `amd`.

---

## §2 — Athlete Journey Audit

| Stage | Status | Evidence |
|---|---|---|
| Athlete Entry | Implemented | `src/pages/AthleteCommand.tsx`, `src/pages/Auth*`, `src/contexts/AuthContext.tsx` |
| Assessment / Intake | Partial | `HammerOnboardingChat` self-hides on zero gaps; no canonical evidence intake form per `bp §H1`–`§H6` |
| Evidence Capture (video) | Implemented | `supabase/functions/analyze-video/index.ts`, `src/lib/biomech/videoAcceptance.ts` |
| Detector Processing | Missing (deterministic) / Partial (AI-substituted) | No deterministic detectors in repo; `analyze-video/index.ts` lines 1891–1894 ask the AI to fill `metrics` directly — disqualifying per `val §1.4` and `prior §1.4` |
| Anchor Processing | Missing | No anchor engine; `cal §6.1` certificate owner exists in doctrine only |
| Metric Production | Partial-AI-only | `analyze-video/index.ts` lines 2237–2265 capture `metrics` from AI tool-call args; not produced by `METRIC_ENGINE_VERSION` (still `metrics@0.0.0-stub`) |
| Confidence Production | Partial-AI-only | Confidence is whatever the model reports (`shared.ts MetricValue.confidence`); not the certified emission required by `conf §87`/`§488`/`§530` |
| Report Card Generation | Implemented (UI) | `src/lib/reportCard/disciplines/{bp,bh,throwing}.ts` render tile states from `metrics` via `metricReaders.ts` |
| Development Guidance | Implemented (static copy) | Per-tile `explainer.{whatWhy,howToImprove,encouragement}` strings in discipline specs |
| Progress Tracking | Partial | `useMPIScores`, foundation traces (`docs/foundations/recommendation-lifecycle.md`); no longitudinal report-card history surface tied to certified metrics |

---

## §3 — Report Card Readiness Audit

Three discipline specs are surfaced: `bpReportCard` (BP), `bhReportCard` (BH),
`throwingReportCard` (derived from BP via filtered key set,
`disciplines/throwing.ts` lines 8–20).

For each tile category in each spec:

| Category | Data Source | Calculation | Explanation |
|---|---|---|---|
| BP tiles (Energy Angle, HSS, Stride, Glove Control, Head Stability, Head@Release, Shoulder Tilt, Tempo, Lift/Thrust, Finish/Balance, etc.) | Partial — AI-emitted values via `analyze-video` tool schema (`buildMetricsSchema`, line 2158); no deterministic detector output | Partial — threshold logic exists in `bp.ts` `compute(...)`; underlying inputs not certified per `cal §6.2` | Exists — `explainer` strings present on every tile (`bp.ts`, `bh.ts`) |
| BH tiles (P1–P4 phase groups, 449-line spec) | Partial — same AI extraction path | Partial — `compute(...)` per tile reads `metrics` via `readNumber`/`readBool`/`readScore100` | Exists — full `whatWhy`/`howToImprove`/`encouragement` copy |
| Throwing tiles | Partial — filtered subset of BP keys; depends on same AI extraction | Partial — inherits BP `compute` | Exists — inherits BP `explainer` |

Missing across all disciplines: certified data sources (`amd §2.2`),
certified anchor outputs (`cal §6.1`), certified metric engine outputs
(`amd §2.3`), and the MVCS partial-pin discipline implementation
(`amd §2.4`, `c5 §2`).

---

## §4 — Measurement Reality Audit

Every measurement currently producible from athlete input is produced by the
AI tool call defined in `analyze-video/index.ts` (`metricsPromptBlock` line
1893; `buildMetricsSchema` line 2158; capture at lines 2237–2265). The
underlying deterministic pipeline required by `bp §F1` does not exist.

| Class | Measurements | Status | Evidence |
|---|---|---|---|
| Production-ready (certified per `gate Part 1–3`) | none | Not implemented | No certificates issued (`cal §6.1`/`§6.2`); version pins still `@0.0.0-stub` (`src/lib/biomech/versions.ts`) |
| Experimental (AI-derived, no determinism) | All BP, BH, Throwing tile metrics declared in `disciplines/*.ts` | Experimental | `analyze-video/index.ts` 1891–1894, 2237–2265 |
| Placeholder | `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` | Placeholder | `src/lib/biomech/versions.ts` lines 25–28 |
| Not implemented | Deterministic detectors, anchor engine, calibration fixtures, retention store | Not implemented | No files under `src/lib/{detectors,anchors,calibration}` |

Per `prior §1.4`: stub version pins are "disqualifying per `val §1.4` and
`audit S3`." That disqualification persists in the current tree.

---

## §5 — Intelligence Reality Audit

| System | Status | Evidence |
|---|---|---|
| MPI (Master Performance Index) | Operational (UI surface) | `src/hooks/useMPIScores.ts`; consumed by Command Center and remotion `MPIEngineScene` |
| HIE | Partial | Catalog/data files present under `src/data/baseball/`; no certified inputs |
| PIE v2 | Partial | `src/data/baseball/pieV2DrillCatalog.ts`, `pieV2VideoCatalog.ts`, `docs/asb/pie-v2-integration-map.md` |
| Assessment system | Partial | `HammerOnboardingChat` (`src/components/hammer/`); no canonical evidence-intake aligned with `bp §H1`–`§H6` |
| Recommendation system | Operational (heuristic) | `docs/foundations/recommendation-lifecycle.md` end-to-end flow; uses kill-switch + scoring; not bound to certified metrics |
| Adaptive programming | Operational (heuristic) | `src/lib/runtime/modulators/index.ts` applies modulators in canonical order; pure, but inputs are not certified |

None of these systems consume a certified report-card metric, because no
certified metric exists (see §4).

---

## §6 — Blocking Deficiency Audit

**Critical Blockers** (prevent any trustworthy report card today):

1. Version triplet remains stubs (`src/lib/biomech/versions.ts` lines 25–28).
   Disqualifying per `val §1.4`, `prior §1.4`, and `amd §2.1`–`§2.3` first-
   issuance authority unexercised.
2. No deterministic detector layer. `DETECTOR_VERSION` certificate
   (`cal §6.2`) has no implementation to certify; `analyze-video/index.ts`
   substitutes the AI tool call (lines 1893, 2237–2265).
3. No anchor engine. `cal §6.1` certificate has no producer.
4. No metric engine. `bp §F1` composite assembly has no producer; AI emits
   tile values directly.
5. No calibration fixture corpus. `amd §3.1`–`§3.3` creator/approval/
   immutability authorities unexercised; no fixtures present under any
   `src/**/fixtures` path.
6. No certificate issuance occurring. `gate Part 1–3` T1→T2 release
   ladder has nothing to gate.
7. Confidence is self-reported by the model (`shared.ts MetricValue`), not
   the certified emission required by `conf §87`/`§488`/`§530`.

**Major Blockers**:

8. MVCS partial-pin discipline (`amd §2.4`, `c5 §2`) not implemented in
   composite assembly.
9. Throwing discipline is a filtered subset of BP (`disciplines/throwing.ts`
   lines 7–20); no throwing-specific detection.
10. No longitudinal report-card history surface tied to certified metrics
    (UI consumes the most recent `ai_analysis.metrics` only).
11. Onboarding intake does not enforce `bp §H1`–`§H6` evidence intake
    contract.

**Minor Blockers**:

12. Softball pitching/hitting/throwing derive from baseball specs
    (`src/lib/reportCard/index.ts`); sport-specific deltas not ratified.
13. Per-tile `explainer` copy is static text, not lineage-bound to certified
    measurement evidence.

---

## §7 — Launch Readiness Assessment

Evaluated against the criteria implied by `gate Part 1–3` and the §6 findings.

| Tier | Verdict | Justification |
|---|---|---|
| Internal Testing | **Eligible** | UI renders end-to-end with AI-derived tile values; staff can exercise the flow knowing values are uncertified (§2, §3) |
| Alpha | Not eligible | Critical Blockers 1–7 stand; AI-only metrics are not trustworthy for athlete-facing claims |
| Closed Beta | Not eligible | Same as Alpha; certificate issuance has not begun |
| Public Beta | Not eligible | `gate Part 1–3` ladder not entered |
| Production | Not eligible | `prior §1.4` disqualification persists |

---

## §8 — Time-To-Athlete Assessment (implementation distance only)

Architecture is closed (`clo §8`). Remaining distance is implementation only.
Estimates are evidence-derived from repository state; no new work items are
introduced.

- **Internal athlete testing**: reachable now. The current AI-prompted path
  produces tile states the UI can display end-to-end (§2 stages 1, 8, 9 are
  Implemented). The standing constraint is that values are not trustworthy
  (§4 Experimental class).
- **Small beta cohort**: blocked behind Critical Blockers 1–7. The unit of
  distance is "first issuance of the version triplet → first certified
  detector → first certified anchor → first certified metric → first
  fixture creation/approval → first composite emission under
  `gate Part 1–3`." Each authority owner is named in `amd §2`–`§3` but no
  authority has been exercised.
- **Public athlete release**: additionally blocked by Major Blockers 8–11
  and the absence of certified longitudinal tracking.

No timeline figures are asserted; this audit reports only the dependency
chain remaining, per `clo §8` Conditionally Complete framing.

---

## §9 — Final Determination

**LIMITED INTERNAL ATHLETE TESTING READY.**

Supported exclusively by §§2–8:

- §2 shows Entry, Evidence Capture, Report Card Generation, and Development
  Guidance Implemented; Detector/Anchor/Metric/Confidence stages Partial-AI-
  only or Missing.
- §3 shows every report-card tile has data-source and calculation status
  Partial and explanation status Exists.
- §4 shows zero Production-ready measurements and a Placeholder version
  triplet.
- §5 shows no intelligence system consumes a certified metric.
- §6 enumerates seven Critical Blockers that prevent Alpha or higher.
- §7 marks Internal Testing Eligible and Alpha+ Not eligible.
- §8 confirms Internal is reachable now and beta requires exercising the
  authorities named in `amd §2`–`§3`.

No remediation plan is proposed. No new requirements, metrics, detectors,
anchors, validation/calibration/confidence rules, gates, governance, or
architecture are introduced by this audit.
