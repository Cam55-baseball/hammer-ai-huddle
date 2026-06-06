## P0-3 — Athlete Context Decision Activation

Scope is **read-path patches only**. No new tables, RPCs, doctrine, UI, or context variables. Every change pulls from the existing `useHammerAthleteContext()` / `get_athlete_context_envelope()` and branches existing logic.

### Phase 0 — Audit (read-only)

Discovery sweep classifying each consumer ACTIVE / PARTIAL / UNUSED per variable:
- Workout: `useWorkoutRecommendations`, `useDrillRecommendations`, `useEliteWorkout`, `useBlockWorkoutGenerator`, `BlockWorkoutGenerator`, `src/lib/pieV2/recommendDrills`, `src/lib/pieV2/recommendVideos`, `src/utils/drillRecommendationEngine`, `src/lib/videoRecommendationEngine`, `src/lib/runtime/prescription`.
- Speed: `useSpeedProgress`, `src/lib/speedScoring`, `SpeedSessionFlow`, speed-lab card consumers, `sprint_analyses` readers, `athlete_load_tracking` readers.
- Roadmap: `useRoadmapProgress`, `RoadmapLadder`, `HittingRoadmapLadder`, `RecruitingRoadmap`, `roadmap_milestones` readers.
- Recommendation: `recommendDrills`, `recommendVideos`, `drillRecommendationEngine`, `videoRecommendationEngine`, `AIWorkoutRecommendations`, `RecommendedRibbon`.

Output: before/after matrix appended to ratification doc.

### Phase A — Workout activation (RFL-029)

Patch read paths to consume envelope:
- `useWorkoutRecommendations` / `useDrillRecommendations`: import `useHammerAthleteContext`, filter/rank by `equipment_effective`, `injury_history`, `development_priorities`, `lifecycle_band`, `season_phase`, `weekly_availability_days`, `lifting_age_years`.
- `useEliteWorkout` + `useBlockWorkoutGenerator`: gate volume by `lifting_age_years`, scope intensity by `season_phase` + `readiness`, suppress contraindicated patterns from `injury_history`, restrict exercises to `equipment_effective`.
- `drillRecommendationEngine` / `videoRecommendationEngine`: accept optional envelope arg; existing call sites in hooks pass it through. Add equipment + injury + lifecycle filters and a priority-weighted reranker.

No architectural rewrite; additive branches around existing scoring.

### Phase B — Speed activation (RFL-030)

- `useSpeedProgress` / `speedScoring`: consume envelope `season_phase`, `development_priorities`, `injury_history`, plus existing live projections (`acceleration`, `top_speed`, `stride`, `asymmetry`, `workload`, `speed_freshness`) already surfaced by `athleteContext.ts`.
- Branch session selection: offseason → volume bias, in-season → freshness bias; asymmetry > threshold → unilateral focus; workload high → deload prescription; injury_history hits → suppress max-effort sprints.
- `SpeedFocusCard` / `SpeedDrillCard`: read the same envelope-driven recommendation rather than static defaults.

### Phase C — Roadmap activation (RFL-031a)

- `useRoadmapProgress` + roadmap ladder components: branch milestone ordering and gating on `goal_summary`, `goal_horizon`, `lifecycle_band`, `season_phase`, `development_priorities`, `injury_history`, workload.
- Suppress milestones inconsistent with lifecycle band; promote milestones aligned with development priorities; defer high-load milestones during high workload or active injury.

### Phase D — Recommendation activation (RFL-031b)

- `recommendDrills`, `recommendVideos`, `AIWorkoutRecommendations`: feed envelope into ranker; hard filter on `equipment_effective` + `injury_history`, soft rerank on `development_priorities` + `lifecycle_band` + `season_phase`.

### Phase E — Differentiation validation

New script `scripts/audits/p0-3-decision-differentiation.ts`. Synthesizes 7 envelopes (novice, advanced, detrained, injured, hotel-equipment, offseason, in-season) and runs each through:
- `buildHammerDailyPlan`
- workout recommendation hook logic (pure-function extraction)
- speed prescription logic
- roadmap ordering
- drill/video rerankers

Asserts pairwise output diffs are non-empty across the matrix. Writes evidence JSON under `scripts/audits/evidence/p0-3-differentiation.json`.

### Phase F — Decision Utilization Score

Compute and record:
- Context availability % (vars present in envelope vs constitution).
- Context consumption % (vars actually read by ≥1 engine).
- Decision differentiation % (engines producing distinct outputs across 7 personas).
- Adaptation capability % (engines responding to live projections — readiness, workload, freshness).
- Overall utilization score.

### Phase G — Intelligence re-estimate

Target ≥60%. Recompute completeness / consumer activation / adaptation / overall. If short, enumerate remaining blockers (likely Elite-tier variables, deeper biomechanical fields, multi-week periodization memory).

### Phase H — Ratification & housekeeping

- Create `docs/asb/p0-3-decision-activation-ratification.md` answering the 7 ratification questions, with consumer matrix, persona evidence, utilization score, blockers, GO/NO-GO for closing the P0 context workstream.
- Update `docs/asb/reality-feedback-ledger.md`: close RFL-029 / RFL-030 / RFL-031 (full or partial per evidence).
- Update `.lovable/plan.md`: mark P0-2 closed, P0-3 done, status of P0 workstream.

### Deliverables

- `docs/asb/p0-3-decision-activation-ratification.md` (new)
- `docs/asb/reality-feedback-ledger.md` (edit)
- `.lovable/plan.md` (edit)
- `scripts/audits/p0-3-decision-differentiation.ts` (new) + evidence JSON
- Additive patches to workout/speed/roadmap/recommendation read paths listed in Phases A–D.

### Out of scope

New schema, RPCs, migrations, UI, context variables, Elite-tier additions, full recommendation-engine rewrite. Anything requiring new architecture is logged as a follow-up blocker, not implemented.
