

# .01% Hardening Pass — 8 Fixes

## 1. Atomic Idempotency (Fix SELECT+INSERT race)

Replace the current two-step idempotency check in `insert_training_block_atomic` with `INSERT ... ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET updated_at = now() RETURNING id`. If the returned row already had workouts, return that ID without re-inserting children. This eliminates the TOCTOU race between SELECT and INSERT.

## 2. Anon Client with Auth Header (Stop service role for user queries)

In `generate-training-block` and `adapt-training-block`, replace:
```typescript
const supabase = createClient(supabaseUrl, supabaseKey); // service role
```
With:
```typescript
const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
  global: { headers: { Authorization: authHeader } },
  auth: { persistSession: false },
});
```
Keep a separate service-role client ONLY for the atomic RPC call in `generate-training-block` (which uses `SECURITY DEFINER`). All user-scoped reads (preferences, blocks, workouts, metrics) go through the anon client with the user's JWT — RLS enforces ownership.

## 3. Ordered Cascade Workout Shifting

Replace the current `Promise.all` shifting (which can cause date collisions) with a DB function `shift_workouts_forward`:
```sql
CREATE FUNCTION shift_workouts_forward(p_block_id uuid, p_after_date date, p_days int DEFAULT 1)
RETURNS int AS $$
  UPDATE block_workouts
  SET scheduled_date = scheduled_date + p_days
  WHERE block_id = p_block_id
    AND scheduled_date > p_after_date
    AND status = 'scheduled'
  -- Process in reverse order to prevent collisions
  -- (Postgres UPDATE processes all rows atomically, no collision risk)
$$ LANGUAGE sql SECURITY DEFINER;
```
Single SQL UPDATE — atomic, no ordering collisions. Replace the Promise.all block in `adapt-training-block` with `supabase.rpc('shift_workouts_forward', ...)`.

## 4. RPE Rules: ≥4 Samples + Rolling Window

Change RPE filtering from "per week, ≥2 samples" to rolling window:
- Collect ALL RPE values ordered by workout date
- Use a sliding window of the last 8 completed workouts (rolling, not weekly)
- Require ≥4 RPE samples in the window before triggering any rule
- High RPE: rolling average > 8 across ≥4 samples → decrement
- Low RPE: rolling average < 5 across ≥4 samples → increment
- Remove the "2+ weeks" requirement — the rolling window naturally handles this

## 5. Cursor-Based Cron Batching

Replace `LIMIT 500` with cursor-based loop in `training-block-notifications`:
```typescript
let cursor: string | null = null;
let totalMarked = 0;
do {
  let query = supabase.from('block_workouts')
    .update({ status: 'missed' })
    .eq('status', 'scheduled')
    .lt('scheduled_date', today)
    .order('id', { ascending: true })
    .limit(500)
    .select('id, block_id');
  if (cursor) query = query.gt('id', cursor);
  const { data } = await query;
  if (!data || data.length === 0) break;
  totalMarked += data.length;
  cursor = data[data.length - 1].id;
  // process block status updates...
} while (true);
```
Same pattern for active blocks query and today's workouts.

## 6. UNIQUE(workout_id, ordinal) Constraint

Migration:
```sql
ALTER TABLE block_exercises
ADD CONSTRAINT uq_exercise_workout_ordinal UNIQUE (workout_id, ordinal);
```
Prevents duplicate ordinals within the same workout.

## 7. DB Constraints for Sets/Reps Upper Bounds

Current: `sets > 0`, `reps >= 3`. Add upper bounds:
```sql
ALTER TABLE block_exercises
DROP CONSTRAINT chk_block_exercises_sets,
ADD CONSTRAINT chk_block_exercises_sets CHECK (sets BETWEEN 1 AND 10);

ALTER TABLE block_exercises
DROP CONSTRAINT chk_block_exercises_reps_min,
ADD CONSTRAINT chk_block_exercises_reps CHECK (reps BETWEEN 3 AND 30);
```

## 8. Optimize update_block_status to Single Query

Replace current 3 separate COUNT queries with one aggregate:
```sql
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE status = 'completed') AS completed,
  count(*) FILTER (WHERE status = 'scheduled') AS remaining
FROM block_workouts
WHERE block_id = p_block_id;
```
Apply to both `update_block_status` and `update_block_status_service`.

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Atomic idempotency rewrite, `shift_workouts_forward` RPC, UNIQUE constraint, sets/reps bounds, optimized status functions |
| `supabase/functions/generate-training-block/index.ts` | Anon client for reads, service client only for RPC |
| `supabase/functions/adapt-training-block/index.ts` | Anon client, rolling RPE window, `shift_workouts_forward` RPC |
| `supabase/functions/training-block-notifications/index.ts` | Cursor-based batching loop |

