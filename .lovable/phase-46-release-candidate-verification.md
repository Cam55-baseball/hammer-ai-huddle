# Phase 46 — Release Candidate Verification

**Objective.** Determine whether the Release-1 metric inventory (Phase 45) is
functioning well enough for controlled athlete deployment.

**Method.** Evidence-only. Runtime queries against Lovable Cloud + repo
inspection. No synthetic data, no projections, no roadmap.

---

## §1 Release-1 Inventory (Scope)

Per `src/lib/reportCard/release1.ts` (`RELEASE1_VISIBLE_METRICS`), Release-1
exposes exactly six athlete-facing metrics. Hitting is suppressed end-to-end
(`RELEASE1_HITTING_SUPPRESSED = true`).

1. `tempo_sec`
2. `energy_angle_deg`
3. `lift_thrust_deg`
4. `premature_shoulder_open_deg`
5. `shoulder_tilt_deg`
6. `head_vertical_movement_pct`

All six are baseball-pitching (BP) metrics defined in
`src/lib/reportCard/contracts/bp.contract.ts`.

---

## §2 Evidence Sources

Runtime tables queried (Lovable Cloud, this session):

| Table | Purpose | Row count |
|---|---|---|
| `videos` | All ingested videos | 547 (160 pitching, 351 hitting, 36 other) |
| `videos` w/ `ai_analysis` populated | LLM analysis present | 469 |
| `videos` w/ `fps_true` populated | Temporal calibration present | 39 |
| `video_analysis_runs` | Phase 0 audit envelope | 49 (30 ok / 9 rejected / 8 failed / 2 cache_hit) |
| `video_landmark_runs` | D-POSE landmark outputs | **0** |
| `video_event_runs` | D-3 / D-4 anchor + detector outputs | **0** |
| `video_metric_runs` | D-5 metric engine outputs (canonical) | **0** |
| `video_coaching_runs` | D-coaching outputs | (not queried — irrelevant; metrics gate) |

Repo files inspected:

- `src/lib/reportCard/release1.ts` — visible/hidden/showcase classification.
- `src/lib/reportCard/contracts/bp.contract.ts` — metric definitions.
- `src/lib/biomech/metrics/tempoSec.ts` — only Release-1 metric with a
  deterministic engine implemented.
- `src/lib/biomech/pipeline/tempoPipeline.ts` — orchestrator for `tempo_sec`.
- `src/lib/biomech/validation/tempoHarness.ts` — D-7 validation harness.
- `src/lib/biomech/replay/tempoReplay.ts` — D-11 replay-equivalence harness.

Sample of the only structured `ai_analysis.metrics` row observed (pitching, 1
of 160): eight of nine Release-1-adjacent keys returned LLM `missing: true`
with `confidence: 0`. The single populated value was
`premature_shoulder_open_deg = 20` at LLM-self-reported `confidence: 0.9`.
This is an LLM emission, not a deterministic-pipeline output: no
`video_metric_runs` row exists for that video.

---

## §3 Per-Metric Inventory

For each Release-1 metric, "deterministic outputs" = rows in
`video_metric_runs` whose `metrics_jsonb` carries that metric key. "LLM
outputs" = the metric key appearing inside `videos.ai_analysis.metrics`
(Phase 43 audit established these are LLM-derived and therefore not eligible
to feed Release-1 athlete surfaces).

| Metric | Det. videos processed | Det. successful | Det. missing | Det. confidence distribution | LLM-emitted samples |
|---|---|---|---|---|---|
| `tempo_sec` | 0 | 0 | n/a (no runs) | n/a — engine emits `uncalibrated` per `metrics/tempoSec.ts` and `validation/tempoHarness.ts` returns `no_corpus` | 1 row, `missing: true` (reason: "Peak leg lift is not visible") |
| `energy_angle_deg` | 0 | 0 | n/a | n/a — no engine implemented | 1 row, `missing: true` |
| `lift_thrust_deg` | 0 | 0 | n/a | n/a — no engine implemented | 1 row, `missing: true` |
| `premature_shoulder_open_deg` | 0 | 0 | n/a | n/a — no engine implemented | 1 row, `value: 20`, LLM `confidence: 0.9` |
| `shoulder_tilt_deg` | 0 | 0 | n/a | n/a — no engine implemented | 1 row, `missing: true` |
| `head_vertical_movement_pct` | 0 | 0 | n/a | n/a — no engine implemented | 1 row, `missing: true` |

**Deterministic-engine implementation status (repo evidence):**

- `tempo_sec` — engine + pipeline + replay harness + validation harness
  exist (`src/lib/biomech/metrics/tempoSec.ts`,
  `pipeline/tempoPipeline.ts`, `replay/tempoReplay.ts`,
  `validation/tempoHarness.ts`). Validation harness status is `no_corpus`
  (requires `MIN_LABELED_PAIRS_FOR_VALIDATION = 30`; 0 labeled pairs in
  repo). Pose model is stubbed — see `tempoPipeline.ts` doc comment:
  "the D-POSE stub blocker … remains visible inside the artifact as a
  `pose_model_is_stub` missingness reason."
- `energy_angle_deg`, `lift_thrust_deg`, `premature_shoulder_open_deg`,
  `shoulder_tilt_deg`, `head_vertical_movement_pct` — **no deterministic
  engine present** under `src/lib/biomech/metrics/`. No anchor, no
  detector, no pipeline.

---

## §4 Contradictions, Unrealistic Outputs, Excessive Missingness

**Contradictions.**

- Phase 45 trust lock forbids LLM-derived physics from reaching athlete
  surfaces, yet the only populated numeric value for any Release-1 metric
  across the entire production corpus (547 videos) is the
  LLM-self-reported `premature_shoulder_open_deg = 20`. Source =
  `videos.ai_analysis.metrics`, not `video_metric_runs`.
- `tempo_sec` is the only metric with a deterministic engine, and that
  engine's pose dependency is a stub (per `tempoPipeline.ts`). Any
  invocation today emits canonical `pose_model_is_stub` missingness, so
  even a wired pipeline would produce zero successful outputs.

**Unrealistic outputs.** None observable. There are no deterministic
outputs against which to evaluate realism.

**Excessive missingness.** 100% across all six Release-1 metrics:
547 videos, 0 deterministic metric rows. `video_landmark_runs` and
`video_event_runs` are also empty, so the missingness originates upstream
of the metric engines (no pose, no anchors, no detectors have ever run in
production).

---

## §5 Readiness Classification

**NOT READY.**

Evidence:

- 0 / 6 Release-1 metrics have produced any deterministic output in
  production (`video_metric_runs` is empty for the entire 547-video corpus).
- 5 / 6 Release-1 metrics have no deterministic engine in the repo at all.
- The 1 / 6 with an engine (`tempo_sec`) depends on a stubbed pose model
  and has `no_corpus` validation status.
- The only numeric value that would reach an athlete today comes from the
  LLM, which Phase 45 explicitly suppresses.

---

## §6 Final Determination

**Can the current Release-1 metric inventory be exposed to real athletes in
a controlled beta environment?**

**No.**

Athlete-facing surfaces governed by Phase 45 will, against today's
production data, render either (a) nothing or (b) canonical missingness
for all six metrics on every video. There is no measurement-backed value
to show. The Release-1 trust lock is correctly preventing LLM values from
leaking through; it is not generating replacement values, because the
deterministic substrate (pose model, anchors, detectors, metric engines
for 5 of 6 metrics) is not in production.

Controlled beta exposure cannot proceed until deterministic
`video_metric_runs` rows exist for the Release-1 keys at meaningful
volume. That is out of scope for Phase 46 (no new implementation, no
roadmap).
