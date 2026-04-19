

## Plan — Stabilize CREATE vs ADAPT (single source of truth = RPC)

### Root cause
RPC and edge function both guard active-block state, with overlapping retry/archive paths. This double control causes nondeterministic failures. Collapse all decision logic into the RPC; edge function becomes a thin caller.

### Changes

**1. Migration — overwrite `insert_training_block_atomic` (10-arg signature with `p_replace_existing`)**

Replace current archive block at top of function:

```sql
-- Strict CREATE vs ADAPT decision
IF EXISTS (SELECT 1 FROM training_blocks WHERE user_id = p_user_id AND status = 'active') THEN
  IF p_replace_existing THEN
    UPDATE training_blocks
    SET status = 'archived', updated_at = now()
    WHERE id = (
      SELECT id FROM training_blocks
      WHERE user_id = p_user_id AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
    );
  ELSE
    RAISE EXCEPTION 'active_block_exists';
  END IF;
END IF;
```

Also remove the safety-retry branch inside `EXCEPTION WHEN unique_violation` (no hidden retries). Keep:
- Defensive `IF p_replace_existing IS NULL THEN p_replace_existing := FALSE`.
- `RAISE NOTICE 'MODE: %'` log.
- Idempotency-key dedup branch unchanged.
- Workouts/exercises insert unchanged.
- `pending_goal_block_id` reset unchanged.

**2. `supabase/functions/generate-training-block/index.ts`**
- Delete the `if (!force_new) { ...active-block check... }` block entirely. RPC owns this.
- Always generate a fresh key right before the RPC call: `const idempotencyKey = crypto.randomUUID();` (no reuse, no derivation).
- Before RPC: `console.log("MODE:", force_new ? "ADAPT" : "CREATE");`
- Continue passing `p_replace_existing: force_new === true`, `p_idempotency_key: idempotencyKey`.
- **Soften validation**: scan the function for hard throws on workout shape (e.g., "fewer than X exercises", "missing week", "invalid distribution") and convert each to `console.error(...)` only. Keep hard throws ONLY for: invalid date parsing and empty payload (`!workouts || workouts.length === 0`).
- Keep existing 409 `active_block_exists` mapping when RPC raises it.

**3. `src/hooks/useTrainingBlock.ts`** — no logic changes
- Confirm `generateBlock` does not send `force_new` (CREATE path).
- Confirm `adaptBlock` regen branch sends `force_new: true` (ADAPT path).
- No client-side archive, no `archive_block_id`. (Already removed previously — verify only.)

### Out of scope
- No UI changes.
- No changes to `adapt-training-block` (volume tuning).
- No new guards anywhere.

### Verification
1. Fresh user → initial generate succeeds; logs show `MODE: CREATE`.
2. Active block exists, click Adapt → succeeds; `MODE: ADAPT`; exactly one prior active block archived (most recent by `updated_at`); new block active.
3. Initial generate while active block exists (no `force_new`) → fails cleanly with `active_block_exists`.
4. Rapid double-Adapt → both succeed deterministically; one active block remains.
5. Workout payload missing optional shape (e.g., low exercise count in one workout) → succeeds with `console.error` warnings, no throw.

