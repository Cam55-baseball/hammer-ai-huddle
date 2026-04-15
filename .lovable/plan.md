

# Training Block System: Production Hardening

## Summary of All Changes

14 fixes across 3 edge functions, 1 migration, and 2 frontend files. No new tables — surgical upgrades only.

---

## 1. Migration: DB-Level Constraints + Indexes + Atomic RPC

**New migration file** adds:

- `CHECK (sets > 0)` and `CHECK (reps > 0)` on `block_exercises`
- Unique partial index on `training_blocks` enforcing **one active block per user**: `CREATE UNIQUE INDEX idx_one_active_block ON training_blocks (user_id) WHERE status IN ('active', 'nearing_completion')`
- Missing indexes: `idx_block_workouts_status` on `block_workouts(status)`
- Replace `update_block_status` RPC with hardened version that: (a) explicitly sets `v_user_id := auth.uid()` with null check, (b) counts `remaining` as only `scheduled` status (not total minus completed — missed workouts shouldn't count as remaining)
- New atomic RPC `insert_training_block_atomic(...)` that accepts block metadata + workouts + exercises as JSONB, inserts all three tables in a single transaction, and returns block ID. If any step fails, the entire transaction rolls back automatically (Postgres function = implicit transaction).

---

## 2. Edge Function: `generate-training-block` (Full Rewrite of Scheduling + Validation + Atomicity)

**Fix #3 — Strict AI validation** before any insert:
```
if weeks.length !== 6 → throw
if any week has !== workoutsPerWeek workouts → throw  
if any workout has <3 or >6 exercises → throw
if any exercise missing sets or reps → throw
```

**Fix #5 — Scheduling engine replacement**: Remove index-based `workoutIdx % sortedDays.length`. New algorithm:
1. Generate all valid calendar dates across 6 weeks from user availability
2. Assign workouts sequentially to dates
3. After each assignment, check CNS: if the workout has any HIGH CNS exercise AND the previous workout was also HIGH CNS AND they're on consecutive days → push current workout to next available date
4. Enforce: no more than 2 HIGH CNS workouts in any 3-day sliding window

**Fix #4 — Transaction safety**: Call the new `insert_training_block_atomic` RPC instead of individual inserts. Single call = single transaction = no partial writes.

**Fix #8 — Remove auto-archive**: Delete the `UPDATE training_blocks SET status = 'archived' WHERE status = 'active' AND id != block.id` line. The unique partial index prevents duplicate active blocks at the DB level — the RPC will fail if one already exists. User must explicitly archive or complete their current block first.

**Fix #9 — Goal change completion**: Before generating, check `pending_goal_change` on any existing block. If true, use the goal from `training_preferences` (already fetched), and reset the flag after successful generation.

---

## 3. Edge Function: `adapt-training-block` (Bug Fixes + Batch Operations)

**Fix #1 — Deload filter bug**: Line 159 `futureExercises.filter(e => nextWeekIds.some(() => true))` always returns true. Replace with:
```typescript
const deloadExercises = futureExercises.filter(e => nextWeekIds.includes(e.workout_id));
```
Also add `workout_id` to the select query on line 103/128/148 (currently only selects `id, sets` — missing `workout_id`).

**Fix #2 — Eliminate N+1 queries**: Replace all `for (const ex of ...) { await supabase.update }` loops with batch operations:
- High RPE reduction: single `UPDATE block_exercises SET sets = GREATEST(1, sets - 1) WHERE workout_id IN (...future_ids) AND sets > 1`
- Low RPE increase: single `UPDATE block_exercises SET sets = LEAST(6, sets + 1) WHERE workout_id IN (...future_ids) AND sets < 6`
- Deload: single `UPDATE ... SET sets = GREATEST(1, ROUND(sets * 0.5)), reps = GREATEST(3, ROUND(reps * 0.75)) WHERE workout_id IN (...next_week_ids)`
- Workout date shifting: single bulk update via `Promise.all` (dates differ per row, so batch via parallel promises, not N sequential awaits)

**Fix #13 — Adaptation safety**: All updates already enforce `sets >= 1` and `reps >= 3` via `Math.max` / `GREATEST`, but the DB constraints (`sets > 0`, `reps > 0`) act as final guard.

---

## 4. Edge Function: `training-block-notifications` (Fix #7 — Single Source of Truth)

**Remove duplicated lifecycle logic** (lines 48-72 that manually compute and set block status). Replace with a single call to `update_block_status` RPC for each affected block. Since this is a cron (no auth context), create a new `update_block_status_service(p_block_id uuid, p_service_key text)` variant that validates via service role key instead of `auth.uid()`.

**Fix #2 — Batch missed workout marking**: Replace `for` loop with single `UPDATE block_workouts SET status = 'missed' WHERE status = 'scheduled' AND scheduled_date < today`.

---

## 5. Frontend: `useTrainingBlock.ts` (Fix #14 — Type Safety)

Add `workout_id` to `BlockExercise` interface (already present in schema, but verify it's in the select query). Ensure all interfaces match DB columns exactly.

---

## 6. `update_block_status` RPC Hardening (Fix #6)

Replace current function with:
```sql
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Unauthorized: no authenticated user';
END IF;
-- Use v_user_id throughout
```

Add service-role variant for cron:
```sql
CREATE FUNCTION update_block_status_service(p_block_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
  -- Same logic but without auth.uid() check (service role only)
$$;
```

---

## Execution Order

1. **Migration**: DB constraints, indexes, unique partial index, atomic insert RPC, hardened `update_block_status`, service-role variant
2. **Edge function**: `generate-training-block` — validation, scheduling rewrite, atomic inserts, goal change completion
3. **Edge function**: `adapt-training-block` — bug fixes, batch operations
4. **Edge function**: `training-block-notifications` — deduplicate lifecycle, batch missed marking
5. **Frontend**: Type alignment in `useTrainingBlock.ts`

## Files Modified

| File | Action |
|------|--------|
| `supabase/migrations/[new].sql` | Create |
| `supabase/functions/generate-training-block/index.ts` | Rewrite |
| `supabase/functions/adapt-training-block/index.ts` | Rewrite |
| `supabase/functions/training-block-notifications/index.ts` | Rewrite |
| `src/hooks/useTrainingBlock.ts` | Minor type fixes |

