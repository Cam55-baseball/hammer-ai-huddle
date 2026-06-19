# Phase 23 — Report Card Root Blocker Decomposition Audit

Status: **reality-only analysis.** No remediation, no implementation, no architecture, no doctrine, no new requirements, no new metrics / detectors / anchors / validation / calibration / confidence / gates / governance / roadmap / sequencing / prioritization / estimates. Findings derive exclusively from the source inputs and read-only repository surfaces listed in `.lovable/plan.md`.

---

## §1 Scope

This phase decomposes a single object — the root blocker identified by Phase 22 (`.lovable/report-card-blocker-collapse-audit.md` §§6, 8) — into its constituent dependencies, required evidence, repository touchpoints, and canonical obligations as currently documented. It does not evaluate metric truth (Phase 20), enumerate failure classes (Phase 21), or rank blockers (Phase 22). It does not propose sequencing, prioritization, or remediation.

Inputs read for this decomposition: `.lovable/report-card-blocker-collapse-audit.md`, `.lovable/report-card-metric-truth-audit.md`, `.lovable/report-card-metric-truth-closure-audit.md`, `.lovable/live-athlete-workflow-proof-audit.md`, `.lovable/first-implementation-reality-audit.md`, `.lovable/canonical-build-plan.md`, `.lovable/canonical-production-gate-matrix.md`, `.lovable/canonical-production-readiness-audit.md`, `.lovable/canonical-validation-framework.md`, `.lovable/canonical-calibration-architecture.md`, `.lovable/canonical-confidence-architecture.md`. Repository surfaces inspected: `src/lib/reportCard/**`, `src/lib/biomech/**`, `supabase/functions/analyze-video/**`, `src/hooks/useReportCardTrend.ts`, `src/hooks/usePitchingV2Trends.ts`, `src/hooks/useHIESnapshot.ts`.

---

## §2 Root Blocker Definition (verbatim from Phase 22)

**F-9 — Missing Evidence (root antecedent).** Per Phase 22 §2 (which restates Phase 21 §3 verbatim):

> No measurable evidence-producing system exists upstream of the AI call; no pose stream, detector outputs, anchor stream, or metric-engine outputs are persisted, replayable, or version-pinned to non-stub values.

Phase 22 §6 classifies F-9 as **the single root blocker**, upstream of F-1, F-2, F-3, F-4, F-5, F-6, F-7, and F-8, with final determination **SINGLE ROOT BLOCKER IDENTIFIED**. Phase 22 §7 records that retiring F-9 alone is a necessary upstream precondition but is not by itself sufficient to move any metric to Truth Supported under Phase 21 §2 criteria.

F-9 is therefore not a single atomic gap; it is a compound antecedent whose retirement requires the presence of every constituent dependency enumerated in §3.

---

## §3 Dependency Inventory

The following dependencies are extracted directly from the canonical inputs cited inline. Each is a constituent of F-9 — that is, the absence of any one of them is sufficient for F-9 to remain unresolved per Phase 21 §2 and the canonical architecture documents.

| ID | Dependency | Canonical source |
|---|---|---|
| D-1 | Deterministic frame extraction (frames at known `fps_true`, replay-stable) | `canonical-measurement-architecture.md` (chain: Frames → Pose → Anchors → Detectors → Metric Engine); `canonical-build-plan.md` Phase 0 |
| D-2 | Deterministic pose stream at pinned, non-stub `LANDMARK_MODEL_VERSION` | `canonical-implementation-blueprint.md`; `canonical-measurement-architecture.md`; `versions.ts` (currently `blazepose_full@0.0.0-stub`) |
| D-3 | Deterministic anchor stream (per-metric anchor evaluations) | `canonical-measurement-architecture.md`; `canonical-validation-framework.md` (anchor evaluation prerequisite) |
| D-4 | Deterministic detector outputs at pinned, non-stub `DETECTOR_VERSION` | `canonical-measurement-architecture.md`; `versions.ts` (currently `events@0.0.0-stub`) |
| D-5 | Deterministic metric engine at pinned, non-stub `METRIC_ENGINE_VERSION` producing `{value, confidence, missing, missing_reason}` per metric | `canonical-implementation-blueprint.md`; `versions.ts` (currently `metrics@0.0.0-stub`) |
| D-6 | Persisted, replayable per-frame / per-anchor / per-detector / per-metric outputs (event ledger sufficient to replay any metric value) | `canonical-production-gate-matrix.md` (determinism, replay equivalence) |
| D-7 | Labeled-dataset fixtures + validation harness producing per-metric error-rate artifacts | `canonical-validation-framework.md` |
| D-8 | Calibration corpus + reference-rig comparison producing per-metric scale / bias artifacts | `canonical-calibration-architecture.md` |
| D-9 | Calibrated confidence surface (confidence calibrated against observed correctness, not model self-report) | `canonical-confidence-architecture.md` |
| D-10 | Deterministic missingness surface (`missing` / `missing_reason` derived from anchor evaluation, not model declaration) | `canonical-measurement-architecture.md`; `canonical-production-gate-matrix.md` (missingness fidelity) |
| D-11 | Production-gate evidence emitters in code for the six gates: determinism, replay equivalence, calibration, validation, confidence calibration, missingness fidelity | `canonical-production-gate-matrix.md`; `canonical-production-readiness-audit.md` |

D-1 through D-6 constitute the "measurable evidence-producing system upstream of the AI call" named in F-9's text. D-7 through D-11 constitute the "persisted, replayable, version-pinned to non-stub values" clauses of F-9's text by binding produced outputs to validation, calibration, calibrated confidence, deterministic missingness, and gate-emission evidence.

---

## §4 Dependency Relationship Map

Relationships are extracted from `canonical-measurement-architecture.md` (linear measurement chain) and `canonical-production-gate-matrix.md` (gate evidence depends on producer existence). Arrows denote "is an upstream precondition of."

```text
D-1 frames
  └─► D-2 pose
        └─► D-3 anchors ─────────────┐
              └─► D-4 detectors      │
                    └─► D-5 metric engine ─► D-6 persisted/replayable outputs
                                              │
                              ┌───────────────┼──────────────────────────────┐
                              ▼               ▼                              ▼
                         D-7 validation   D-8 calibration            D-10 deterministic
                         harness          corpus                          missingness
                                              │                              │
                                              ▼                              │
                                         D-9 calibrated confidence ◄─────────┘
                                              │
                                              ▼
                                         D-11 production-gate
                                              evidence emitters
```

Upstream-only nodes: D-1. Downstream-only nodes (consumers, not producers): D-11. Strictly chained producer nodes: D-1 → D-2 → D-4 → D-5. D-3 is consumed by both D-4 and (via D-5) by D-10. D-6 is the persistence boundary required by D-7, D-8, D-9, D-10, and D-11.

---

## §5 Evidence Requirement Matrix

"Required" lists evidence named by the canonical inputs. "Existing" lists evidence present in the repository today. "Missing" is the residual.

| Dep | Required evidence | Existing evidence | Missing evidence |
|---|---|---|---|
| D-1 | Deterministic frame extraction at known `fps_true` with replay-stable indexing | `src/lib/biomech/frameExtractionDeterministic.ts`, `probeVideoMetadata.ts`, `videoAcceptance.ts`, `fingerprint.ts` and its test, `auditTrail.ts` | Producer is present in code but its outputs are not consumed by any pose/anchor/detector/metric stage (those stages do not exist) |
| D-2 | Pose stream pinned to non-stub `LANDMARK_MODEL_VERSION` | `versions.ts` constant `LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub"` | Non-stub model binding; pose-extraction module; persisted pose frames |
| D-3 | Per-metric anchor evaluation module + persisted anchor stream | None | Anchor module; anchor outputs; per-metric anchor definitions in code |
| D-4 | Detector module pinned to non-stub `DETECTOR_VERSION` + persisted detector events | `versions.ts` constant `DETECTOR_VERSION = "events@0.0.0-stub"` | Non-stub detector implementation; detector outputs |
| D-5 | Metric engine pinned to non-stub `METRIC_ENGINE_VERSION` producing `{value, confidence, missing, missing_reason}` from D-2/D-3/D-4 | `versions.ts` constant `METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"`; contracts `src/lib/reportCard/contracts/**` describe the shape but not the producer | Non-stub engine implementation; deterministic value derivation; engine-emitted confidence/missingness |
| D-6 | Per-frame / per-anchor / per-detector / per-metric persistence sufficient for replay equivalence | None for upstream stages; `supabase/functions/_shared/recordAnalysisRun.ts` persists AI-call results only | Replayable event ledger for D-1…D-5 outputs |
| D-7 | Labeled-dataset fixtures + validation harness emitting per-metric error rates | None | Fixtures; harness; per-metric error-rate artifacts |
| D-8 | Calibration corpus + reference-rig comparison + per-metric scale / bias artifacts | None | Corpus; reference-rig records; calibration tables |
| D-9 | Calibration of `confidence` against observed correctness | `confidence` field present in contracts and on AI output (model self-report) per Phase 21 §3 F-6 | Calibration mapping from raw signal to observed correctness; persisted calibration artifacts |
| D-10 | `missing` / `missing_reason` derived from deterministic anchor evaluation | `missing` / `missing_reason` present in contracts and on AI output (model self-declared) per Phase 21 §3 F-7 | Deterministic derivation from D-3 anchor stream |
| D-11 | Code-emitted evidence for six gates: determinism, replay equivalence, calibration, validation, confidence calibration, missingness fidelity | None per Phase 21 §3 F-8 and `canonical-production-readiness-audit.md` | Per-gate evidence emitters; evidence sinks |

---

## §6 Repository Touchpoint Matrix

"Surfaces" and "metrics affected" are reproduced from Phase 22 §4 (6 surfaces; 30 unique metrics across BP 9 + BH 21, plus throwing inheritance and softball aliases). Because Phase 22 §3 shows every blocker affects all surfaces and all metrics uniformly, every F-9 constituent inherits the same surface/metric impact set; touchpoint differentiation here is at the repository-location level only.

| Dep | Repository locations involved | Athlete-facing surfaces affected | Report-card metrics affected |
|---|---|---|---|
| D-1 | `src/lib/biomech/frameExtractionDeterministic.ts`, `probeVideoMetadata.ts`, `videoAcceptance.ts`, `fingerprint.ts`, `auditTrail.ts`; `supabase/functions/_shared/biomechFingerprint.ts` | All 6 surfaces | All 30 unique metrics |
| D-2 | `src/lib/biomech/versions.ts` (`LANDMARK_MODEL_VERSION`); `supabase/functions/_shared/biomechFingerprint.ts` | All 6 surfaces | All 30 |
| D-3 | `src/lib/biomech/**` (currently absent); `src/lib/reportCard/contracts/**` (consumers of anchor-derived values) | All 6 surfaces | All 30 |
| D-4 | `src/lib/biomech/versions.ts` (`DETECTOR_VERSION`); `supabase/functions/_shared/biomechFingerprint.ts` | All 6 surfaces | All 30 |
| D-5 | `src/lib/biomech/versions.ts` (`METRIC_ENGINE_VERSION`); `src/lib/reportCard/metricReaders.ts`; `src/lib/reportCard/contracts/{bp,bh,throwing,shared}.contract.ts` | All 6 surfaces | All 30 |
| D-6 | `supabase/functions/analyze-video/index.ts`, `supabase/functions/_shared/recordAnalysisRun.ts` | All 6 surfaces | All 30 |
| D-7 | Repo-wide: no current location | All 6 surfaces | All 30 |
| D-8 | Repo-wide: no current location | All 6 surfaces | All 30 |
| D-9 | `src/lib/reportCard/types.ts` (confidence field shape); consumers in `src/hooks/useReportCardTrend.ts`, `usePitchingV2Trends.ts`, `useHIESnapshot.ts` | All 6 surfaces | All 30 |
| D-10 | `src/lib/reportCard/types.ts`, `metricReaders.ts`; tile display in `src/lib/reportCard/disciplines/{bp,bh,throwing}.ts` | All 6 surfaces | All 30 |
| D-11 | No current location; gate definitions live in `canonical-production-gate-matrix.md` only | All 6 surfaces | All 30 |

The six surfaces are: BP tiles (`disciplines/bp.ts`), BH tiles (`disciplines/bh.ts`), Throwing tiles (`disciplines/throwing.ts`), report-card trend (`useReportCardTrend.ts`), pitching v2 trends (`usePitchingV2Trends.ts`), HIE snapshot (`useHIESnapshot.ts`). The 30 unique metrics are the BP 9 + BH 21 sets enumerated in Phase 21 §2; Throwing inherits 6 from BP and softball aliases share BP/BH sets per `contracts/index.ts:11-12`.

---

## §7 Canonical Obligation Matrix

Obligations are restated from the canonical-* inputs. None are introduced here.

| Dep | Validation obligation | Calibration obligation | Confidence obligation | Production-gate obligation |
|---|---|---|---|---|
| D-1 | Frame-indexing determinism test | None | None | Determinism gate (`canonical-production-gate-matrix.md`) |
| D-2 | Pose-stream determinism test vs labeled fixture | Pose-model calibration against reference rig | Pose-keypoint confidence calibrated | Determinism gate; replay-equivalence gate |
| D-3 | Anchor evaluation determinism test | Anchor calibration against reference rig | Anchor confidence calibrated | Determinism gate; missingness-fidelity gate |
| D-4 | Detector validation against labeled events | Detector calibration against reference rig | Detector confidence calibrated | Determinism gate; replay-equivalence gate |
| D-5 | Per-metric validation against labeled dataset (`canonical-validation-framework.md`) | Per-metric calibration tables (`canonical-calibration-architecture.md`) | Per-metric calibrated confidence (`canonical-confidence-architecture.md`) | All six gates per `canonical-production-gate-matrix.md` |
| D-6 | Replay-equivalence harness | None | None | Replay-equivalence gate |
| D-7 | Self-obligation: harness presence and per-metric error-rate emission | None | None | Validation gate |
| D-8 | None | Self-obligation: corpus presence and per-metric scale/bias emission | None | Calibration gate |
| D-9 | None | None | Self-obligation: calibrated confidence mapping per `canonical-confidence-architecture.md` | Confidence-calibration gate |
| D-10 | None | None | None | Missingness-fidelity gate |
| D-11 | Emits evidence for validation gate | Emits evidence for calibration gate | Emits evidence for confidence-calibration gate | Self-obligation: per-gate emitter presence per `canonical-production-readiness-audit.md` |

---

## §8 Minimal Closure Set

A "complete dependency set required for F-9 retirement" is the set whose simultaneous presence satisfies every clause of F-9's text in §2 — i.e., (a) a measurable evidence-producing system exists upstream of the AI call, (b) its outputs are persisted, (c) they are replayable, and (d) they are version-pinned to non-stub values.

- Clause (a) requires D-1, D-2, D-3, D-4, D-5.
- Clause (b) and (c) require D-6.
- Clause (d) requires the non-stub bindings under D-2, D-4, and D-5.

Per Phase 22 §7, F-9 retirement is a **necessary** precondition for any metric to become Truth Supported but is **not sufficient** under Phase 21 §2 criteria, because Truth Supported status additionally requires the F-4, F-5, F-6, F-7, F-8 evidence classes — i.e., D-7, D-8, D-9, D-10, D-11. The minimal set strictly required to retire F-9 itself is therefore:

**Minimal F-9 closure set = { D-1, D-2, D-3, D-4, D-5, D-6 }.**

The broader set { D-1 … D-11 } is the minimal set required for any single metric to reach Truth Supported per Phase 21 §2 read against §3 of this audit; it is recorded here as descriptive context, not as a remediation target.

No proper subset of { D-1, D-2, D-3, D-4, D-5, D-6 } satisfies all four clauses of F-9's text: omitting any of D-1…D-5 collapses clause (a); omitting D-6 collapses clauses (b) and (c); leaving any of D-2/D-4/D-5 at stub versions collapses clause (d) per `versions.ts:24-26`.

---

## §9 Final Determination

Per §§2–8: F-9 has been resolved into 11 named constituent dependencies (§3) with a documented upstream/downstream relationship map (§4), an evidence requirement matrix mapping each dependency to required / existing / missing evidence (§5), a repository touchpoint matrix (§6), a canonical obligation matrix (§7), and an identified minimal closure set { D-1, D-2, D-3, D-4, D-5, D-6 } sufficient to satisfy every clause of F-9's text (§8). Every constituent is traceable to a cited canonical source; every "existing" / "missing" entry is traceable to a read-only repository surface or prior-phase finding.

**ROOT BLOCKER FULLY DECOMPOSED.**

Supported exclusively by §§2–8.
