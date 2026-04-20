

## Plan — Exhaustive Running Aggregation Engine

### Problem
`RunningProgressSummary` only reads completed `custom_activity_logs` whose template has `activity_type='running'`, ignoring 90% of the places users actually log running. Worse, it adds the raw `template.distance_value` without unit conversion, so a user logging **"100 yards"** silently becomes **"100 miles"** — and short distances in feet/yards round to ~0 contribution. Result: short-distance runners "never get credit."

### New aggregation engine — `src/lib/runningAggregator.ts` (new file)

A single `aggregateAllRunning(userId, sport, range)` function that gathers running from **every** source the app stores it in, normalizes to miles, and returns a unified `RunningStats`. Sources scanned:

| # | Source | What it captures |
|---|--------|------------------|
| 1 | `custom_activity_logs` + `custom_activity_templates` (`activity_type='running'`) — **main `distance_value` with unit conversion** (currently broken) | Standard runs |
| 2 | Same templates' `embedded_running_sessions[]` (already partially handled, fix unit edge cases) | Multi-leg runs |
| 3 | Same templates' `intervals[]` jsonb (currently ignored) | Interval workouts |
| 4 | `custom_activity_templates` (`activity_type='workout' OR 'practice' OR 'warmup'`) with non-empty `embedded_running_sessions` | Runs embedded inside lift/practice cards |
| 5 | `custom_activity_templates.exercises[]` where `type='cardio'` OR name matches `/run|sprint|jog|dash|hill|interval|tempo|mile|fartlek/i` — convert `sets × reps` as yards when name ends in "(30m)", "(yd)", etc., else use `duration` to estimate via 6 mph default | Cardio inside any custom activity |
| 6 | `running_sessions` table (`completed=true`) with its own `distance_value` + `distance_unit` + `intervals[]` jsonb | Dedicated running log |
| 7 | `speed_sessions.distances` jsonb `{"10y":[1.41,1.58], "30y":[3.63], "60y":[6.3]}` — sum reps × yards per key | Speed Lab / Explosive Conditioning sprints |
| 8 | `block_exercises` (joined via `block_workouts` → `training_blocks.user_id`) where name matches sprint/run regex AND parent `block_workouts.status='completed'`. Parse distance from name (`(30m)`, `(40yd)`, `Hill Sprints`) × sets × reps; fall back to default 30 yd if unknown sprint distance | Strength program sprints |

### Unit normalization (single source of truth)

Helper `toMiles(value, unit)` handles: `miles`, `kilometers`, `meters`, `yards`, `feet`. All accumulators store **miles** internally; UI converts back for display.

```text
yards → /1760 | meters → /1609.34 | feet → /5280 | km → /1.609 | miles → 1:1
```

Apply unit conversion to **every** source — fixes the `template.distance_value` bug.

### Confidence-aware totals

Return shape:
```ts
{
  totalDistanceMiles: number,
  totalDistanceYards: number,    // also expose for short-distance users
  totalDuration: number,
  totalSessions: number,
  avgPace: string,
  bySource: {                    // transparency: where credit came from
    customActivities, embedded, intervals, runningSessions,
    speedSessions, blockSprints, cardioExercises
  },
  shortDistanceTotal: number     // sum of <1 mile efforts so users see them
}
```

### UI updates — `RunningProgressSummary.tsx`

1. Replace inline fetch with `useQuery(['running-aggregate', userId, sport, range], aggregateAllRunning)`.
2. **Smart unit display**: if `totalDistanceMiles < 1` AND `totalDistanceYards > 0`, show **yards** instead of miles so short runs are visible (no more rounding to 0).
3. Add a **"Sources counted"** collapsible row listing each contributing source with its session count + distance, so users immediately see they're being credited (e.g., `Speed Lab: 14 sprints • 420 yd`).
4. Drop sport filter to a soft filter — include sessions where sport is null or doesn't match (with a small "all sports" count badge) so runs logged before sport selection still count.
5. Pace calculation: only compute when `totalDistanceMiles ≥ 0.5` AND `totalDuration > 0`; otherwise display `—:—` instead of bogus `0:00`.

### Caching & sync

- `staleTime: 60_000`, `refetchOnWindowFocus: true`.
- Subscribe to `BroadcastChannel('data-sync')` so logging a run anywhere in the app instantly invalidates `['running-aggregate']`.

### Out of scope
- No schema changes (all sources already exist).
- No changes to how runs are *logged* — only how they're aggregated/displayed.
- No changes to MPI / CNS load engines (they already credit these sources separately).

### Files
- **New**: `src/lib/runningAggregator.ts`
- **Edit**: `src/components/custom-activities/RunningProgressSummary.tsx`
- **Edit**: `src/i18n/locales/*/customActivity.json` (add `runningProgress.sourcesLabel`, short-distance copy)

### Verification
1. User with only Speed Lab sessions (no custom run cards): now sees sprint yardage credited.
2. User who logged "200 yards" via custom activity card: sees **200 yd** (not 200 miles, not 0).
3. User with embedded run inside a strength workout card: sees it counted under "Embedded".
4. User with `running_sessions` entries (Production Lab Speed Lab): sees them listed as "Running Sessions".
5. Existing user with mile-based runs: totals match prior numbers (no regression).
6. "Sources counted" panel shows non-zero entries matching DB rows.

