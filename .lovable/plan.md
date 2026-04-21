

## Plan — 6-Week Recap V2: Full Context Aggregation Engine

Upgrade `generate-vault-recap` from a **wellness/custom-activity recap** into a **context-aware performance analyst** that uses every relevant data source on the platform and adapts its interpretation to the athlete's season, sport, level, and prior cycle.

---

### Phase 1 — Gap Report (already audited)

**Currently used (28 sources)**
Workout notes, focus quizzes, nutrition logs, performance tests, scout grades, profile (name/position/sport), saved drills, wellness goals, free notes, weight entries, custom activity logs, Tex Vision (drills/metrics/progress), video analyses, mindfulness, emotion tracking, mental-health journal, Mind Fuel streaks, stress assessments, hydration logs/settings, viewed tips/lessons, nutrition streak, sub-module progress, weekly + 6-week + long-term goal text, fascia pain mapping.

**Available but IGNORED (the gap)**
| Missing context | Source of truth | Impact |
|---|---|---|
| Season phase (in/pre/post-season) | `athlete_mpi_settings.season_status` + date ranges via `useSeasonStatus` | HUGE — recap interpretation must shift by phase |
| Practice & game session logs | `performance_sessions` (drill_blocks, composite_indexes, effective_grade, season_context, module, opponent fields) | Core practice/game performance data is invisible |
| MPI / developer scores + trend | `mpi_scores` (adjusted_global_score, composite_bqi/fqi/pei, trend_direction, trend_delta_30d, integrity_score, segment_pool) | Headline performance number missing |
| HIE diagnosis & weakness clusters | `hie_snapshots` (weakness_clusters, prescriptive_actions, tool_performance_gaps) | Prescriptive engine output not connected |
| Previous 6-week block | `vault_recaps` (last row) | No block-vs-block comparison |
| Player level / age | `profiles.date_of_birth` + `athlete_mpi_settings.level` | Recommendations not level-appropriate |
| Workload / CNS load | `cns_load_entries` or session-derived load | Overuse/undertraining undetected |
| Throwing / hitting volume from sessions | aggregated from `performance_sessions.drill_blocks[].volume` per module | Sport-specific load missing |
| Game results / opponent context | `performance_sessions` where session_type IN ('game','live_scrimmage') | Game data ignored |
| Speed Lab / 6-week test trend across blocks | `vault_performance_tests` historical (currently only current window) | No longitudinal trend |
| Tool grades from Vault | `vault_tool_grades` (if present) | Physical tool deltas missing |

**Connected but uncorrelated**: Scout grades exist but aren't compared against MPI; pain data exists but isn't correlated with workload spikes.

---

### Phase 2 — Build the Context Aggregation Layer

Add a new helper module **`supabase/functions/generate-vault-recap/contextEngine.ts`** that, before the existing aggregation, builds a `globalContext` object:

```ts
interface GlobalContext {
  player: { firstName, sport, position, level, ageYears, dob }
  season: { phase: 'preseason'|'in_season'|'post_season'|'off_season',
            phaseStartedAt, daysIntoPhase, daysUntilNextPhase }
  performance: {
    mpi: { current, prevBlock, delta, trendDirection, percentile, segmentPool,
           composites: {bqi, fqi, pei, competitive, decision} }
    sessions: { practice: {...counts, avgGrade, byModule}, 
                game:    {...counts, avgGrade, opponentLevels} }
    transferGap: number  // practice avg - game avg
    sixWeekTest: { current, previous, delta, byMetric }
    sixWeekTestHistory: last 4 blocks for longitudinal trend
  }
  physical: { weightStart, weightEnd, weightChange, 
              physicalReadinessAvg, painLoadIndex, fasciaSummary }
  workload: {
    sessionsPerWeek, totalCnsLoad, throwingReps, hittingReps,
    weeklyLoadSeries:[w1..w6], spikeDetected, overuseFlags, undertrainingFlags,
    restDays, longestStreak
  }
  systemIntel: {
    hieSnapshot: { weakness_clusters, prescriptive_actions, tool_performance_gaps },
    videoAnalyses: { count, byModule, recurringIssues, mechanicsTrend },
    movementPatterns: derived from analyses + HIE
  }
  goals: { weekly[], sixWeek, longTerm, alignmentScore }
  previousRecap: { id, generatedAt, headline, focusAreas, recommendations }
}
```

**New queries added** to the parallel `Promise.all`:
- `athlete_mpi_settings` (full row — season dates, level, primary_coach_id)
- `performance_sessions` (in window) → aggregate by session_type/module
- `mpi_scores` (current row + the row from ~42d before for delta)
- `hie_snapshots` (current row)
- `vault_recaps` (the most recent prior recap for previous-block compare)
- `vault_performance_tests` (last 4 blocks, not just current window)
- `profiles` extended select: `date_of_birth, level`
- `cns_load_entries` if table exists (probe; fall back to summing session loads)

All queries run in parallel; missing rows degrade gracefully (engine never throws).

---

### Phase 3 — Season-Aware Recap Logic

A new pure helper **`getInterpretationProfile(season)`** returns weights + emphasis rules consumed by the AI prompt:

```text
in_season    → emphasize: stability, output consistency, fatigue/recovery, transferGap
                de-emphasize: aggressive mechanical changes, max-volume pushes
post_season  → emphasize: recovery trends, pain resolution, physical reset, sleep
                de-emphasize: performance gains
off_season   → emphasize: development gains, mechanical improvements, strength PRs
                de-emphasize: in-game stability metrics
preseason    → emphasize: ramp-up curve, intensity progression, readiness for opener
```

The prompt is split into **three composable blocks**:
1. `CONTEXT_HEADER` (player + season + workload summary — always first)
2. `INTERPRETATION_PROFILE` (the season-specific priorities/de-emphases)
3. `DATA_PAYLOAD` (everything currently in the prompt + new context blocks)

---

### Phase 4 — Trend Intelligence + Multi-System Correlation

**New deterministic computations** (NOT AI-derived) appended to `computedInsights`:

- **Block-vs-block delta**: MPI Δ, top-3 composite Δs, six-week test Δ per metric (using `previousRecap` + `mpi_scores` history).
- **Practice→Game transfer gap**: `avg practice effective_grade − avg game effective_grade` per module, flagged if ≥10 pts.
- **Workload-performance correlation**: weekly CNS load series correlated with weekly avg session grade; emit `overuse_dip` or `optimal_zone` insight.
- **Tool-Performance gap unification**: pull HIE `tool_performance_gaps` and surface top 2 with ≥15-pt deltas.
- **Pain-workload correlation**: chronic pain weeks vs workload-spike weeks → emit `overload_pain_link` insight when overlapping.

These insights become **mandatory truth fields** the AI must explain (not infer/contradict), matching the existing `did_strength` source-of-truth pattern.

---

### Phase 5 — Output Structure (new sections added)

The AI JSON schema gets extended with these new keys (existing keys kept for backward compat):

```text
context_header:        { season_phase, player_summary, workload_summary }
performance_summary:   { headline, gains[], regressions[], stability_rating }
trend_insights:        { improved[], declined[], block_comparison }
transfer_analysis:     { practice_to_game_delta, narrative }
physical_impact:       { body_changes, performance_correlation }
system_correlations:   { movement_x_results, physical_x_performance,
                         workload_x_outcome, key_insight }
elite_suggestions:     [ {priority, action, rationale, season_appropriate:bool} ]
```

`UnifiedRecapView.tsx` (frontend) gets new collapsible sections matching the keys, rendered conditionally so older recaps keep working.

---

### Phase 6 — Owner Override Surface (lightweight)

Add a new owner-only table **`recap_engine_settings`** (single row keyed by owner) with JSON columns:

```text
input_weights jsonb     -- e.g. {"mpi": 1.2, "scout_grades": 0.8, "custom_activities": 1.0}
season_overrides jsonb  -- override interpretation profiles per phase
disabled_sections text[]
```

`getInterpretationProfile` and the prompt builder consult this row. UI lives in **`/admin/engine-settings`** (existing page) under a new "Recap Engine" tab — slider per data source (0–2x), toggle per output section, JSON edit for season profiles. Owner-only via `has_role`.

---

### Files

**New**
- `supabase/functions/generate-vault-recap/contextEngine.ts` — buildGlobalContext()
- `supabase/functions/generate-vault-recap/interpretationProfiles.ts` — season profile lookup
- `supabase/functions/generate-vault-recap/correlationEngine.ts` — deterministic insights
- `supabase/migrations/<ts>_recap_engine_settings.sql` — owner override table + RLS
- `src/components/admin/RecapEngineSettings.tsx` — owner UI tab

**Edited**
- `supabase/functions/generate-vault-recap/index.ts` — wire context engine, expand parallel queries, restructure prompt, add new JSON sections
- `src/components/vault/UnifiedRecapView.tsx` — render new sections (context header, transfer, physical impact, correlations)
- `src/pages/AdminEngineSettings.tsx` — add Recap Engine tab
- `src/integrations/supabase/types.ts` — auto-regen after migration

### Out of scope (future)
- Real-time recap regeneration when settings change (manual only)
- Per-coach recap settings (owner-global only in V1)

### Verification

1. **In-season athlete** with 30 practice sessions + 6 games → recap leads with stability rating, transfer gap, fatigue management; does NOT push mechanical overhauls.
2. **Post-season athlete** with chronic pain → recap leads with recovery trends, pain resolution, foundational rebuild; physical reset emphasized.
3. **Off-season athlete** with strength PRs → recap leads with development gains, mechanical improvements, scout-grade tool growth.
4. **Block-vs-block compare**: athlete with prior recap → "Trend Insights" section explicitly references prior block ("MPI 64 → 71, +7"); athletes with no prior recap render gracefully without that section.
5. **Transfer gap**: practice avg 78 vs game avg 62 → emits "Transfer Gap: -16 pts" insight; recap addresses it.
6. **HIE weakness clusters** appear inside `system_correlations.key_insight`.
7. **Owner override**: setting `mpi: 0` in `/admin/engine-settings` → next regeneration omits MPI from prompt and recap.
8. Existing recaps still display (backward compat preserved on `UnifiedRecapView`).

