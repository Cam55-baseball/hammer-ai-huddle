
Final hardening pass to close the last 4 safety gaps without changing the overall architecture.

## What I’ll change

### 1. Make idempotency truly safe in `insert_training_block_atomic`
- Update the migration with a new version of `insert_training_block_atomic`.
- Keep the existing `INSERT ... ON CONFLICT ... RETURNING id`.
- Immediately lock the returned parent row before checking for children:
  `PERFORM 1 FROM training_blocks WHERE id = v_block_id FOR UPDATE;`
- Then check whether workouts already exist for that block.
- If workouts already exist, return the existing block id.
- If not, proceed with child inserts while holding the row lock.

This removes the remaining race where two concurrent requests could both observe “no workouts yet” and both insert children.

### 2. Replace `shift_workouts_forward` with ordered resequencing
- Rewrite the DB function so it does not apply a flat `+ p_days` update.
- Use a CTE with ordered rows and `row_number()` to resequence future scheduled workouts deterministically.
- Preserve existing chronological order.
- Reassign each future workout to a new date derived from the missed-workout boundary plus its ordered offset.
- Keep this entirely in SQL so the shift stays atomic and collision-free.

Result: no duplicate dates caused by bulk date shifting, and workout order remains stable.

### 3. Fix rolling RPE ordering in `adapt-training-block`
- Change the metrics/workout derivation so completed workouts are sorted by `scheduled_date` ascending before extracting RPE values.
- Build the rolling sample from that ordered list, then take the last 8 entries.
- Keep the existing requirement of at least 4 samples before adaptation rules run.

Result: the rolling window reflects actual training sequence, not arbitrary query order.

### 4. Make cron batching mutation-safe
- Replace the current moving-cursor update pattern in `training-block-notifications` for mutable sets.
- Use snapshot batching:
  1. select up to 500 target IDs in stable order
  2. update exactly those IDs
  3. repeat until zero IDs are returned
- Apply this to the “mark missed workouts” path first.
- Keep read-only counters/scan flows stable, but avoid cursoring over rows being modified in the same loop.

Result: no skipped rows during mutation-heavy batch runs.

## Files to update
- `supabase/migrations/[new]_training_block_final_safety.sql`
  - replace `insert_training_block_atomic`
  - replace `shift_workouts_forward`
- `supabase/functions/adapt-training-block/index.ts`
  - sort completed workouts by date before rolling-window slice
- `supabase/functions/training-block-notifications/index.ts`
  - replace mutation cursor batching with snapshot-ID batching

## Outcome
After this pass, the remaining edge cases are closed:
- idempotent generation is race-safe
- workout shifting preserves order and avoids collisions
- rolling RPE uses correct chronological history
- cron mutation batching cannot skip rows under active updates
