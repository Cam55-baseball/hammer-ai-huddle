

# Final Hardening Pass: 10-Point Implementation

## 1. Migration (single file)

### 1a. Race condition on `insert_training_block_atomic` — wrap INSERT in BEGIN/EXCEPTION block to catch `unique_violation` on `idx_one_active_block` and raise `active_block_exists` instead of crashing.

### 1b. Idempotency key — `ALTER TABLE training_blocks ADD COLUMN idempotency_key text` + unique partial index on `(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`. Update `insert_training_block_atomic` to accept `p_idempotency_key text DEFAULT NULL`, check for existing block with matching key before insert, return existing block ID if found.

### 1c. Harden atomic insert — add pre-insert validation: `jsonb_array_length(p_workouts) = 0 → RAISE EXCEPTION`. Validate each workout has `week_number` not null and `exercises` array exists before any insert.

### 1d. Batch adaptation RPCs — create two DB functions:
- `batch_decrement_sets(p_workout_ids uuid[])` — `UPDATE block_exercises SET sets = GREATEST(1, sets - 1) WHERE workout_id = ANY(p_workout_ids) AND sets > 1`
- `batch_increment_sets(p_workout_ids uuid[])` — `UPDATE block_exercises SET sets = LEAST(6, sets + 1) WHERE workout_id = ANY(p_workout_ids) AND sets < 6`
- `batch_deload_exercises(p_workout_ids uuid[])` — `UPDATE block_exercises SET sets = GREATEST(1, ROUND(sets * 0.5)::int), reps = GREATEST(3, ROUND(reps * 0.75)::int) WHERE workout_id = ANY(p_workout_ids)`

### 1e. Replace `reps > 0` constraint with `reps >= 3` — `ALTER TABLE block_exercises DROP CONSTRAINT chk_block_exercises_reps; ADD CONSTRAINT chk_block_exercises_reps_min CHECK (reps >= 3)`

### 1f. Missing index — `CREATE INDEX idx_block_workout_metrics_workout_id ON block_workout_metrics(workout_id)`

### 1g. Status consistency — add `updated_at` column to `training_blocks` (defaulting to `now()`). Update both `update_block_status` and `update_block_status_service` to SET `updated_at = now()` on status change.

## 2. Edge Function: `adapt-training-block`

Replace all 3 `Promise.all` per-row update blocks with single RPC calls:
- Rule 1 (high RPE): `supabase.rpc('batch_decrement_sets', { p_workout_ids: futureWorkoutIds })`
- Rule 2 (low RPE): `supabase.rpc('batch_increment_sets', { p_workout_ids: futureWorkoutIds })`
- Rule 3 (deload): `supabase.rpc('batch_deload_exercises', { p_workout_ids: nextWeekIds })`

Remove all `select → Promise.all → update` patterns. Delete placeholder `batch_adjust_exercises` call.

## 3. Edge Function: `generate-training-block`

- Generate `idempotency_key = crypto.randomUUID()` before RPC call
- Pass `p_idempotency_key` to `insert_training_block_atomic`
- If RPC returns error containing `active_block_exists`, return 409 with existing block info
- If RPC returns existing block (idempotency hit), return that block ID

## 4. Edge Function: `training-block-notifications`

- Add `.limit(500)` to the missed-workout update query
- Add `.limit(500)` to active blocks query for weekly adherence
- Add `.limit(500)` to today's workouts query

## 5. Frontend: `useTrainingBlock.ts`

- Add `useRef` guard in `generateBlock` mutation to prevent double-invoke
- The mutation's `isPending` state already provides disable-while-loading via react-query; document usage pattern

## Files Modified

| File | Action |
|------|--------|
| `supabase/migrations/[new].sql` | Create |
| `supabase/functions/adapt-training-block/index.ts` | Rewrite adaptation rules to use RPCs |
| `supabase/functions/generate-training-block/index.ts` | Add idempotency key + race condition handling |
| `supabase/functions/training-block-notifications/index.ts` | Add LIMIT batching |
| `src/hooks/useTrainingBlock.ts` | Add double-invoke guard |

