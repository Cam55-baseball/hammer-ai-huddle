## How readiness is calculated today

Readiness shown in the UI (`useReadinessState`) is a confidence-weighted blend of up to three sources:

| Source | Weight | Origin |
|---|---|---|
| HIE Readiness | 0.5 | `hie_snapshots.readiness_score` written by the `hie-analyze` edge function |
| Regulation Index | 0.3 | `physio_daily_reports.regulation_score` |
| Focus Quiz | 0.2 | `vault_focus_quizzes.focus_score` |

Stale rows are dropped (HIE >48h, Physio >36h, Focus >36h). If `confidence < 0.3` the score is suppressed.

### Where HIE Readiness comes from

`supabase/functions/hie-analyze/index.ts` → `computeReadiness(vaultData)`:

```ts
// vaultData = last 7 vault_focus_quizzes rows
const sleep   = latest.sleep_quality ?? 3;
const stress  = latest.stress_level  ?? 3;
const pain    = latest.pain_level    ?? 0;
const sleepScore  = (sleep / 5) * 40;
const stressScore = ((5 - stress) / 5) * 30;
const painPenalty = Math.min(pain * 5, 30);
score = clamp(sleepScore + stressScore + 30 - painPenalty, 0, 100);

if (vaultData.length === 0) return { score: 70, ... }; // hard fallback
```

**Hammers Modality usage (workouts completed, CNS load, adherence, streaks, MPI, missed NN, etc.) is NOT an input to readiness anywhere in the system.** The HIE readiness number depends only on the most recent self-reported sleep/stress/pain quiz — and falls back to a hard-coded **70** when no quiz exists.

## Why everyone sees the same number

Live data confirms it:

- `hie_snapshots`: **63 distinct users, all with `readiness_score = 70`** (the no-data fallback).
- `vault_focus_quizzes`: 167 rows but only **11 distinct users**.
- `physio_daily_reports`: 19 rows from **3 distinct users**.

So for ~52 of the 63 athletes the engine has no signal and defaults to 70. Even users who have submitted a quiz cluster around 66–73 because the defaults plug in 3/3/0. Training behavior never moves the needle.

## Proposed fix

Two parts. Part 1 stops the false uniformity now; Part 2 makes readiness actually reflect Hammers usage.

### Part 1 — Remove the silent `70` fallback (data integrity)

In `hie-analyze/index.ts`:

```ts
if (!vaultData || vaultData.length === 0) {
  return { score: null, recommendation: "Log a focus quiz to calibrate readiness." };
}
```

- Update the snapshot writer to allow `readiness_score = null` (column already nullable per types).
- `useReadinessState` already handles missing HIE: with only Focus Quiz (0.2) confidence < 0.3 → `state = 'unknown'`, UI renders the "set up" empty state instead of a fake 70.

### Part 2 — Make Hammers usage a first-class readiness input

Introduce a fourth source — **Training Load Readiness** — derived from data the engine already pulls (`athlete_daily_log`, `block_workouts`, `user_consistency_snapshots`, `custom_activity_logs`):

```text
loadReadiness =
   adherence14d          * 35   // completed scheduled workouts / scheduled
 + cnsHeadroom           * 25   // 1 - (avg cns_load_actual_7d / cns_target)
 + (consistencyScore/100)* 20   // user_consistency_snapshots latest
 + nnFreshness           * 20   // 1 - clamp(nn_miss_count_7d / 7, 0, 1)
```

Write it to `hie_snapshots.training_readiness_score` (new column) and surface in `useReadinessState` with weight 0.3, rebalancing existing weights:

| Source | New weight |
|---|---|
| HIE Subjective (sleep/stress/pain) | 0.30 |
| Training Load Readiness | 0.30 |
| Regulation Index | 0.25 |
| Focus Quiz | 0.15 |

Each contributing source must be fresh (re-use existing freshness gates). Confidence threshold stays at 0.3.

### Effect

- Two athletes with the same quiz answers but different Hammers adherence will now diverge (e.g. 78 vs 54).
- Users with no signal at all get `unknown` instead of a misleading 70.
- The "Where this comes from" tooltip in `ReadinessChip` / `ReadinessCard` automatically lists the new source because it iterates `sources[]`.

## Out of scope

- No changes to MPI scoring, HIE diagnosis logic, or rest/load engine.
- No UI redesign — same chip + breakdown popover.
- Backfill: forward-only (per `mem://architecture/performance-intelligence/longitudinal-integrity`). Old snapshots stay at 70 until next nightly recompute.

## Files touched

- `supabase/functions/hie-analyze/index.ts` — drop fallback, add `computeTrainingReadiness()`, write new column.
- Migration: `ALTER TABLE hie_snapshots ADD COLUMN training_readiness_score smallint;`
- `src/hooks/useReadinessState.ts` — add 4th source, rebalance weights.
- `src/hooks/useHIESnapshot.ts` and `src/integrations/supabase/types.ts` (auto-regen) — pick up new column.
