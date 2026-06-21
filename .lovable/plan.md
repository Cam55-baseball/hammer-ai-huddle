## Phase 32 — Report Card Release 1 Implementation Closure Plan

### Deliverable
Create exactly one new file:
- `.lovable/phase-32-report-card-release-1-implementation-closure-plan.md`

No other files created, modified, or deleted. No code, architecture, doctrine, metric, detector, anchor, validation, calibration, confidence, or production-gate changes.

### Method
Read-only synthesis across:
- 10 source-input `.lovable/` documents (authority package, root-blocker decomposition, blocker collapse, metric truth audit + closure audit, Phases 27–31).
- Repository surfaces: `src/lib/reportCard/**`, `src/lib/biomech/**`, `supabase/functions/analyze-video/**`, `src/hooks/useReportCardTrend.ts`, `src/hooks/usePitchingV2Trends.ts`, `src/hooks/useHIESnapshot.ts`.

I will pre-read `src/lib/reportCard/` (types, metricReaders, hook), `src/lib/biomech/versions.ts`, `src/lib/biomech/gates/*`, and the three hooks to anchor every claim at line citations, plus skim the metric-truth audits to harvest the canonical metric inventory.

All claims line-cited to existing repository lines or sealed `.lovable/` documents. No new requirements or fabricated evidence.

### Document Structure (15 sections, exactly as specified)
1. **§1 Scope** — Release-1 Report Card = all athlete-facing metrics classified Truth Supported under existing canonical chain (D-3→D-4→D-5→D-6→D-7→D-8→gate matrix→tile). Synthesis-only.
2. **§2 Current Report Card Truth Status** — Per Phase 27 + metric-truth audits: 1 candidate Partially Supported (`tempo_sec`), remainder distributed across Partially Supported / Unsupported / AI-Heuristic / Out-of-Scope per source audits.
3. **§3 Metric Inventory By Truth Status** — Reproduced from `report-card-metric-truth-audit.md` / `report-card-metric-truth-closure-audit.md`, classified per existing audit categories; no new metrics introduced.
4. **§4 Shared Dependency Inventory** — D-POSE landmark binding (`versions.ts:25`), `DETECTOR_VERSION`/`METRIC_ENGINE_VERSION` (`versions.ts:26–27`), shared fingerprinting (`src/lib/biomech/fingerprint.ts`), tile-state contract (`src/lib/reportCard/types.ts`), reader contract (`src/lib/reportCard/metricReaders.ts`), trend hook (`useReportCardTrend.ts`), pitching-v2 hook, HIE snapshot hook.
5. **§5 Detector Closure Matrix** — Per existing detectors directory; columns: present | stubbed | external dependency | closure source. Mirrors decomposition audit findings.
6. **§6 Anchor Closure Matrix** — Same structure across `src/lib/biomech/anchors/**`.
7. **§7 Metric Engine Closure Matrix** — Across `src/lib/biomech/metrics/**`, mapped to athlete-facing tiles.
8. **§8 Validation Closure Matrix** — Harness coverage per metric; reuses `tempoHarness` precedent as canonical template (`MIN_LABELED_PAIRS_FOR_VALIDATION = 30`). Identifies which metrics have an existing harness vs none.
9. **§9 Calibration Closure Matrix** — Certificate generator coverage per metric (existing only for `tempo_sec` per Phase 26/27).
10. **§10 Confidence Closure Matrix** — Calibrated-confidence binding wired vs not, per tile.
11. **§11 Production Gate Closure Matrix** — Six-gate matrix presence per metric (existing only for `tempo_sec` via `tempoGate`/`tempoGateMatrix`).
12. **§12 Release 1 Truth Closure Map** — Per-metric remaining-work map joining §§5–11 + external dependencies (EXT-MODEL, EXT-CORPUS-class) using Phase 28–31 framework, scaled across all athlete-facing metrics.
13. **§13 Smallest Complete Release 1 Closure Set** — Aggregated closure set: (a) 1 shared EXT-MODEL binding (D-POSE non-stub at `versions.ts:25`); (b) N per-metric EXT-CORPUS-class labeled corpora ≥30 paired examples conforming to per-metric pair schemas; (c) per-metric replicas of the `tempo_sec` D-6→D-7→D-8→gate→tile chain where currently absent; (d) per-metric calibration certificate generators modeled on `tempoCalibration.ts`; (e) per-metric six-gate matrices modeled on `tempoGate`; (f) per-metric tile adapters modeled on `tempoTileAdapter.ts`. Strictly enumerative — no new requirement introduced; replicates existing canonical pattern.
14. **§14 Remaining External Dependencies** — Single shared EXT-MODEL (D-POSE) + per-metric EXT-CORPUS-class labeled corpora. No other external dependency identified by source inputs.
15. **§15 Final Determination** — One of `RELEASE 1 TRUTH CLOSURE IDENTIFIED` | `… PARTIALLY IDENTIFIED` | `… NOT IDENTIFIED`, supported exclusively by repository evidence and existing canonical requirements.

### Expected Determination
**RELEASE 1 TRUTH CLOSURE IDENTIFIED** — the canonical template proven for `tempo_sec` across Phases 25–31 is enumerable for every remaining athlete-facing metric using only existing canonical requirements; no missing pattern, surface, or doctrine is required to describe the full closure set. (If the metric-truth audits expose categories of metrics with no canonical Release-1 path under current doctrine, the determination downgrades to PARTIALLY IDENTIFIED — to be confirmed during file authorship via the audit reads.)

### Constraints Reiterated
Exactly one new file. No code. No implementation. No architecture/doctrine/requirements changes. No fabricated evidence. All citations to existing repository lines or sealed `.lovable/` documents.
