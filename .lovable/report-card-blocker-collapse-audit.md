# Phase 22 — Report Card Blocker Collapse Audit

Status: **reality-only analysis.** No remediation, no implementation, no architecture changes, no new requirements, no new metrics, detectors, anchors, validation, calibration, confidence, gates, governance, roadmaps, sequencing, prioritization, or estimates. Findings derive exclusively from the source inputs listed in `.lovable/plan.md` and read-only repository cross-checks.

---

## §1 Scope

Blocker-collapse analysis only. The objective is to determine which of the nine truth-closure blockers (F-1…F-9) defined in `.lovable/report-card-metric-truth-closure-audit.md` §3 have the largest downstream impact on report-card truth closure, and whether any blocker structurally sits upstream of the others.

In-scope artifacts (read-only): the eight `.lovable/` source inputs named in the plan, plus the contract / reader / version / producer files cited inline for surface and output counts. Out of scope: doctrine, sequencing, estimates, prioritization rationale beyond measured dependency counts.

---

## §2 Blocker Inventory (verbatim from Phase 21 §3)

- **F-1 — AI-Only Dependency.** Every metric value is produced exclusively by the single multimodal AI call in `supabase/functions/analyze-video/index.ts` (~2256–2470); no deterministic alternative producer exists.
- **F-2 — Placeholder Dependency.** `src/lib/biomech/versions.ts:24-26` pins `LANDMARK_MODEL_VERSION`, `DETECTOR_VERSION`, `METRIC_ENGINE_VERSION` at `@0.0.0-stub`; every metric inherits stub-anchored cache fingerprints.
- **F-3 — Broken Lineage.** The canonical Frames → Pose → Anchors → Detectors → Metric Engine chain is absent; `src/lib/biomech/**` contains only `versions.ts` (no pose / anchors / detectors / engine modules).
- **F-4 — Missing Validation Evidence.** No labeled-dataset validation harness, fixtures, or per-metric error-rate artifacts exist anywhere in the repository.
- **F-5 — Missing Calibration Evidence.** No calibration corpus, reference rig, or known-truth comparison exists; no per-metric calibration tables, scale factors, or bias offsets are committed.
- **F-6 — Missing Confidence Surface (calibrated).** `{value, confidence}` is surfaced, but `confidence` is the model's self-report; no calibration of confidence against observed correctness exists.
- **F-7 — Missing Missingness Surface (deterministic).** `missing` / `missing_reason` is declared by the model itself; no deterministic anchor evaluation produces missingness independently.
- **F-8 — Missing Production Gate Evidence.** No gate from `canonical-production-gate-matrix.md` (determinism, replay equivalence, calibration, validation, confidence calibration, missingness fidelity) currently emits evidence in code.
- **F-9 — Missing Evidence (root antecedent).** No measurable evidence-producing system exists upstream of the AI call; no pose stream, detector outputs, anchor stream, or metric-engine outputs are persisted, replayable, or version-pinned to non-stub values.

---

## §3 Metric Dependency Matrix

Per Phase 21 §3 and §7, every blocker F-1…F-9 applies uniformly to every metric. The dependency matrix is therefore a fully-filled grid; no metric is exempt from any blocker, and no blocker affects a proper subset of metrics. The table below records the matrix in compact form.

| Discipline | Contract | Unique metrics | F-1 | F-2 | F-3 | F-4 | F-5 | F-6 | F-7 | F-8 | F-9 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Baseball Pitching | `bp.contract.ts` (lines 11–91) | 9 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Baseball Hitting | `bh.contract.ts` (lines 13–207) | 21 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Baseball Throwing | `throwing.contract.ts` (inherits BP minus 3 keys) | 6 inherited | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Softball Pitching | `sb-pitching` ≡ BP (`contracts/index.ts:11`) | 9 aliased | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Softball Hitting | `sh` ≡ BH (`contracts/index.ts:12`) | 21 aliased | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Per-metric expansion of the matrix would repeat the same nine ✓ marks for each of the 30 unique metric keys (BP 9 + BH 21) and their softball aliases; the metric-line citations are recorded in Phase 21 §2 and are not duplicated here.

---

## §4 Blocker Reach Analysis

Counts are derived from §3 plus the read-only repository surfaces named in the plan.

- **Report-card surfaces** counted: (a) BP tile set via `disciplines/bp.ts`, (b) BH tile set via `disciplines/bh.ts`, (c) Throwing tile set via `disciplines/throwing.ts`, (d) report-card trend via `src/hooks/useReportCardTrend.ts`, (e) pitching v2 trends via `src/hooks/usePitchingV2Trends.ts`, (f) HIE snapshot via `src/hooks/useHIESnapshot.ts`. Total surfaces = **6** (softball aliases share the same surfaces).
- **Gates** counted from `canonical-production-gate-matrix.md`: determinism, replay equivalence, calibration, validation, confidence calibration, missingness fidelity. Total gates = **6**.
- **Athlete-facing outputs** counted from `ReportCardTile.tsx` + tile-state contract in `src/lib/reportCard/types.ts` + composite consumers: (i) tile numeric/boolean value, (ii) tile band / pass-elite indicator, (iii) low-confidence warn dot, (iv) missingness label, (v) composite grade (`gradeFromTiles` via `useReportCardTrend`), (vi) trend chart point. Total outputs = **6**.

| Blocker | Affected metrics (unique) | Affected surfaces | Affected gates | Affected athlete-facing outputs |
|---|---|---|---|---|
| F-1 AI-Only Dependency | 30 | 6 | 6 | 6 |
| F-2 Placeholder Dependency | 30 | 6 | 6 | 6 |
| F-3 Broken Lineage | 30 | 6 | 6 | 6 |
| F-4 Missing Validation Evidence | 30 | 6 | 6 | 6 |
| F-5 Missing Calibration Evidence | 30 | 6 | 6 | 6 |
| F-6 Missing Confidence Surface (calibrated) | 30 | 6 | 6 | 6 |
| F-7 Missing Missingness Surface (deterministic) | 30 | 6 | 6 | 6 |
| F-8 Missing Production Gate Evidence | 30 | 6 | 6 | 6 |
| F-9 Missing Evidence (root antecedent) | 30 | 6 | 6 | 6 |

Reach is identical across all nine blockers because the matrix in §3 is uniform.

---

## §5 Blocker Collapse Ranking

Ranking by total downstream impact = (affected metrics) × (affected surfaces) × (affected gates) × (affected athlete-facing outputs). With the uniform reach in §4, every blocker tied at 30 × 6 × 6 × 6 = **6,480**.

| Rank | Blocker | Total reach product |
|---|---|---|
| T-1 | F-1 | 6,480 |
| T-1 | F-2 | 6,480 |
| T-1 | F-3 | 6,480 |
| T-1 | F-4 | 6,480 |
| T-1 | F-5 | 6,480 |
| T-1 | F-6 | 6,480 |
| T-1 | F-7 | 6,480 |
| T-1 | F-8 | 6,480 |
| T-1 | F-9 | 6,480 |

All nine blockers tie on measured dependency counts. No prioritization rationale beyond these counts is asserted.

---

## §6 Root Blocker Identification

Reach counts alone (§4, §5) do not distinguish the blockers. Root identification therefore relies on the **definitional upstream relations already recorded in Phase 21 §3** (no new requirements introduced). Each relation below is a direct citation, not an inference.

- F-9 (Missing Evidence — root antecedent) is **labelled "root antecedent" in its own Phase 21 definition** (closure audit §3 F-9: "There is no measurable evidence-producing system upstream of the AI call").
- F-3 (Broken Lineage) is defined by Phase 21 §3 F-3 as the structural consequence of the absence in F-9: "Canonical chain (Pose → Anchors → Detectors → Metric Engine) is absent."
- F-1 (AI-Only Dependency) is defined by Phase 21 §3 F-1 as the substitution that exists *because* the chain in F-3 is absent: the single AI call "substitutes for the entire engine chain" (Phase 21 §3 F-3).
- F-2 (Placeholder Dependency) is defined by Phase 21 §3 F-2 as the stub-version pinning that exists because no non-stub engine in F-9/F-3 is committed.
- F-4, F-5, F-8 (Missing Validation / Calibration / Production-Gate Evidence) are defined by Phase 21 §3 as absences of evidence about a deterministic engine that itself does not exist (F-9/F-3); each refers to a "per-metric" measurement that has no deterministic producer to validate, calibrate, or gate.
- F-6 (Missing Confidence Surface — calibrated) is defined by Phase 21 §3 F-6 as the absence of calibration of the current self-reported confidence, which exists only because the producer is the AI call (F-1) rather than a deterministic engine (F-9/F-3).
- F-7 (Missing Missingness Surface — deterministic) is defined by Phase 21 §3 F-7 as the absence of deterministic anchor evaluation, which is itself the F-9/F-3 absence.

Structural relation graph (all edges restate Phase 21 §3; no new claims):

```text
            F-9 (Missing Evidence — root antecedent)
                          |
                          v
            F-3 (Broken Lineage)
              |        |        |        |        |
              v        v        v        v        v
            F-1      F-2      F-4      F-5      F-8
              |                                    
              v                                    
            F-6                                    
                          
            F-7  <— (deterministic anchor absence ≡ F-9/F-3)
```

F-9 is, by its own Phase 21 definition, upstream of every other blocker; F-3 is the immediate structural expression of F-9 in the codebase (`src/lib/biomech/**` contains only `versions.ts`). F-1, F-2, F-4, F-5, F-6, F-7, F-8 are downstream consequences whose existence Phase 21 §3 ties back to the F-9/F-3 absence.

Classification: **ROOT BLOCKER** = F-9 (Missing Evidence — root antecedent), with F-3 (Broken Lineage) as its immediate codebase manifestation.

---

## §7 Report Card Truth Leverage Analysis

Reality-only leverage assessment (no implementation recommendations).

- Per Phase 20 §7 and Phase 21 §§7–8, **0 of 30** unique metrics are Truth Supported and **0 of 30** are Partially Supported under the current state.
- A metric reaches "Truth Supported" only when every applicable blocker is retired (Phase 21 §2 classification key). Therefore, retiring any proper subset of F-1…F-9 that omits a blocker the metric depends on cannot move that metric out of "Unsupported."
- The dependency matrix in §3 shows every metric depends on all nine blockers. The smallest blocker set whose retirement could move any metric to "Truth Supported" is therefore **the full set {F-1, F-2, F-3, F-4, F-5, F-6, F-7, F-8, F-9}**. The corresponding count of newly Truth-Supported metrics is 30 (BP 9 + BH 21) plus their softball aliases.
- Any proper subset retirement yields **0** newly Truth-Supported metrics under the Phase 21 §2 classification. By §6, F-9 is upstream of the others by definition, so retiring only F-9 would, by Phase 21 §3, structurally remove the antecedent absence behind F-1, F-2, F-3, F-4, F-5, F-6, F-7, F-8; however, retiring F-9 does not *by itself* produce validation, calibration, gate, or calibrated-confidence evidence required by the Phase 21 §2 "Truth Supported" criteria. Leverage of F-9 retirement is therefore upstream-structural (necessary precondition) rather than direct (sufficient to flip metrics to Truth Supported).

Net leverage statement: under the Phase 21 §2 criteria, the **minimum sufficient set is the full set**; the **minimum necessary upstream blocker is F-9** per §6.

---

## §8 Final Determination

**SINGLE ROOT BLOCKER IDENTIFIED.**

Supported exclusively by §§2–7: the blocker inventory (§2) restates Phase 21 §3 verbatim; the dependency matrix (§3) is uniform across all 30 unique metrics and all nine blockers; reach analysis (§4) produces identical counts of 30 metrics, 6 surfaces, 6 gates, and 6 athlete-facing outputs per blocker; ranking (§5) ties all nine blockers on measured dependency counts; root identification (§6) shows by Phase 21's own definitions that F-9 (Missing Evidence — root antecedent) sits upstream of every other blocker, with F-3 as its immediate codebase manifestation; and leverage analysis (§7) confirms F-9 is the minimum necessary upstream blocker while the full set is the minimum sufficient set under the Phase 21 §2 Truth-Supported criteria.
