# Phase 47 — Measurement Engine Existence Audit Plan

Deliverable: create exactly one file — `.lovable/phase-47-measurement-engine-existence-audit.md`. Evidence-only. No code edits, no fixes, no architecture, no recommendations.

## Evidence already gathered

**Six Release-1 metrics** (from `src/lib/reportCard/release1.ts`):
`tempo_sec`, `energy_angle_deg`, `lift_thrust_deg`, `premature_shoulder_open_deg`, `shoulder_tilt_deg`, `head_vertical_movement_pct`.

**`src/lib/biomech/` inventory:**
- `metrics/`: only `tempoSec.ts` (plus shared `confidence.ts`, `missingness.ts`).
- `anchors/`: `peakLegLift.ts`, `frontFootStrike.ts`.
- `detectors/`: only `plantDetector.ts`.
- `pipeline/`: only `tempoPipeline.ts`.
- `reportCard/`: only `tempoTileAdapter.ts`.
- `evidence/`: only `tempoEvidence.ts`.
- `replay/`: only `tempoReplay.ts`. `validation/`: only `tempoHarness.ts`.
- Grep for `energy_angle|lift_thrust|premature_shoulder_open|shoulder_tilt|head_vertical_movement` inside `src/lib/biomech/` returns only `anchors/peakLegLift.ts` (incidental). No engines for the other five.

**Runtime invocation** (`src/pages/AnalyzeVideo.tsx`):
- Line 32: imports `runTempoPipeline`.
- Lines 394–423: real `runPoseInference` → `runTempoPipeline` executes on every uploaded video when analysis enabled.
- Lines 513–546: persists a `video_landmark_runs` row carrying `tempo_sec` value/missingness inside `diagnostics` JSON — but never inserts into `public.video_metric_runs`. Grep `from("video_metric_runs"`/`from('video_metric_runs'` in `src/` = 0 matches.

**Database (Phase 46 queries, still authoritative):**
- `video_landmark_runs` = 0 rows; `video_event_runs` = 0; `video_metric_runs` = 0.
- `videos` = 547 (160 pitching). Only structured `ai_analysis.metrics` row is LLM-derived.

**Report-card integration:**
- `src/lib/reportCard/disciplines/bp.ts` reads `tempo_sec` from `ai_analysis` (LLM keyspace), not from `video_metric_runs`.
- `tempoTileAdapter.ts` exists in `src/lib/biomech/reportCard/` but no grep hit shows it being consumed by report-card builders.

## Document structure (single markdown file)

1. **§1 Inventory** — list the six metrics with file references.
2. **§2 Existence Audit** — per-metric Y/N matrix across nine axes (tile, contract, explanation, detector, anchor, metric function, pipeline integration, persistence, report-card integration). Filled strictly from grep evidence.
3. **§3 Production Path Audit** — for each metric, walk `video → landmarks → anchors → detectors → metric calc → persistence → report card` and mark the exact break point (e.g. for `tempo_sec`: break at persistence — pipeline runs but never writes `video_metric_runs`; for the other five: break at "metric function does not exist").
4. **§4 Runtime Invocation Audit** — `tempo_sec`: invoked at `AnalyzeVideo.tsx:411`; other five: zero call sites in `src/`.
5. **§5 Persistence Audit** — `video_metric_runs` insert call sites in `src/` = 0; `tempo_sec` value is smuggled into `video_landmark_runs.diagnostics`, but as of Phase 46 the table is empty (0 rows). Report-card reads `tempo_sec` from `videos.ai_analysis` (LLM), not from any deterministic table.
6. **§6 Missing Implementation Inventory** — per-metric component list.
7. **§7 Wiring Inventory** — per-metric "exists but disconnected" assessment. `tempo_sec` = implemented but not persisted to its canonical table and not consumed by report card. Other five = nothing to disconnect.
8. **§8 Readiness Classification** — `tempo_sec` = IMPLEMENTED_NOT_WIRED (persistence to `video_metric_runs` missing + report-card binding to deterministic source missing). `energy_angle_deg`, `lift_thrust_deg`, `premature_shoulder_open_deg`, `shoulder_tilt_deg`, `head_vertical_movement_pct` = NOT_IMPLEMENTED.
9. **§9 Earliest Shippable Metric** — `tempo_sec` (only metric with engine + anchors + pipeline + replay + validation harness all present). Remaining gaps: `video_metric_runs` persistence, report-card binding swap, and corpus to lift `tempoHarness` out of `no_corpus`.
10. **§10 Final Determination** — only `tempo_sec` exists as a measurement engine today.

## Constraints honored

- No new code, no fixes, no recommendations.
- Every claim cites a file:line or a runtime query result already collected.
