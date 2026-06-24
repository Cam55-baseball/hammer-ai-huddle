# Phase 46 — Release Candidate Verification Plan

Deliverable: create exactly one file — `.lovable/phase-46-release-candidate-verification.md`. No code edits. No new architecture, no roadmap, no synthetic data.

## Evidence already gathered (runtime + repo)

Queried Lovable Cloud directly:

- `video_landmark_runs`: **0 rows**
- `video_event_runs`: **0 rows**
- `video_metric_runs`: **0 rows**
- `video_analysis_runs`: 49 rows total (30 ok, 9 rejected, 8 failed, 2 cache_hit) — but these are audit envelopes, not metric outputs.
- `videos`: 547 total (160 pitching, 351 hitting), 469 with `ai_analysis`, only **39** with `fps_true` populated.
- Pitching videos with structured `ai_analysis.metrics` block: **1** (of 160). That single row shows 8 of 9 Release-1-adjacent metrics emitted as `missing: true` by the LLM, and the one populated value (`premature_shoulder_open_deg = 20`, confidence 0.9) came from the model, not from the deterministic `tempoPipeline`/`computeTempoSec` chain.
- Deterministic Phase 26/27 pipeline (`src/lib/biomech/pipeline/tempoPipeline.ts`, `metrics/tempoSec.ts`, `validation/tempoHarness.ts`) exists but has produced zero rows; `tempoHarness` status is `no_corpus` (min 30 labeled pairs required, 0 present).

## Document structure

Single markdown file with these sections, populated only from the evidence above:

1. **Scope** — restate the six Release-1 visible metrics from `src/lib/reportCard/release1.ts`: `tempo_sec`, `energy_angle_deg`, `lift_thrust_deg`, `premature_shoulder_open_deg`, `shoulder_tilt_deg`, `head_vertical_movement_pct`.
2. **Evidence sources** — list the tables queried and the repo paths inspected (no fabrication).
3. **Per-metric inventory table** — for each of the six metrics: videos processed, successful outputs, missing outputs, confidence distribution, sample values. All six rows resolve to:
   - videos processed via deterministic pipeline: 0
   - successful deterministic outputs: 0
   - missing outputs (LLM-emitted `missing: true`): per the one structured-metrics row
   - confidence distribution: only the LLM self-reported numbers exist; deterministic confidence is `uncalibrated` by contract
   - sample values: only `premature_shoulder_open_deg = 20 (LLM, conf 0.9)`; all others null
4. **Contradiction / unrealistic / excessive-missingness findings**:
   - Contradiction: Release-1 doctrine forbids LLM-derived physics, yet the only populated metric value in production data is LLM-emitted.
   - Unrealistic outputs: none observable — there are no deterministic outputs to evaluate.
   - Excessive missingness: 100% — zero deterministic metric runs across 547 videos.
5. **Readiness classification**: **NOT READY**.
6. **Final determination**: Release-1 cannot be exposed to real athletes in a controlled beta. Justification = the trust lock (Phase 45) hides LLM-derived metrics, and the deterministic replacements have produced zero outputs in production. There is nothing measurement-backed to show an athlete.

## Constraints honored

- No new metrics, detectors, code, doctrine, or roadmap.
- All numbers come from real queries against `video_analysis_runs`, `video_landmark_runs`, `video_event_runs`, `video_metric_runs`, `videos`, and the repo files cited above.
- No synthetic athlete data, no projections.
