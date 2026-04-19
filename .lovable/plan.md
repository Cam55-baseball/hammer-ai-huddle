

## Plan — Strict CREATE vs ADAPT separation in RPC

### Root cause
Last migration added archive logic that fires even when `p_replace_existing` is unset/NULL, breaking initial generation. Need defensive defaults, mode logging, and a retry-on-conflict path that only triggers in ADAPT mode.

### Changes

**1. Migration — overwrite `insert_training_block_atomic` (with `p_idempotency_key` + new `p_replace_existing`)**

Add `p_replace_existing boolean DEFAULT false` as final param. At top of function body:

```sql
-- Defensive: never let NULL slip through
IF p_replace_existing IS NULL THEN
  p_replace_existing := FALSE;
END IF;

RAISE NOTICE 'insert_training_block_atomic MODE: %',
  CASE WHEN p_replace_existing THEN 'ADAPT' ELSE 'CREATE' END;

-- Only archive in ADAPT mode
IF p_replace_existing THEN
  UPDATE training_blocks
  SET status = 'archived', updated_at = now()
  WHERE user_id = p_user_id AND status = 'active';
END IF;
```

In the non-idempotency `INSERT ... EXCEPTION WHEN unique_violation` block, add safety retry:

```sql
EXCEPTION WHEN unique_violation THEN
  IF p_replace_existing THEN
    UPDATE training_blocks SET status = 'archived', updated_at = now()
    WHERE user_id = p_user_id AND status = 'active';
    INSERT INTO training_blocks (...same cols...) VALUES (...) RETURNING id INTO v_block_id;
  ELSE
    RAISE EXCEPTION 'active_block_exists';
  END IF;
```

Keep all other logic (idempotency dedup, workouts/exercises insert, pending_goal_block_id reset) unchanged.

**2. `supabase/functions/generate-training-block/index.ts`**
- Pass `p_replace_existing: force_new === true` into `insert_training_block_atomic` RPC call.
- Remove standalone server-side archive block (RPC now handles it atomically).
- Skip pre-RPC active-block guard when `force_new` is true.

**3. `src/hooks/useTrainingBlock.ts`** — verify client contract
- `generateBlock` (initial): does NOT send `force_new` (or sends `false`). Confirm and leave as-is.
- `adaptBlock` regen branch: sends `force_new: true`. Confirm and leave as-is.
- Remove leftover `archive_block_id` param if still being sent.

### Out of scope
- No changes to `adapt-training-block` (volume tuning).
- No UI changes.
- No DB signature breakage — new param has DEFAULT, existing callers unaffected.

### Verification
1. Fresh user, no active block → initial generate succeeds; logs show `MODE: CREATE`.
2. Active block exists, change goal, click Adapt → succeeds; logs show `MODE: ADAPT`; previous block archived; new block active.
3. Rapid double-Adapt → both resolve cleanly via retry path; one active block in DB.
4. Initial generate while active block exists (no `force_new`) → fails cleanly with `active_block_exists` (expected guard).

