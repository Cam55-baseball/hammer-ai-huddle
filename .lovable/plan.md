

## Plan — Fix 6-week block generation failure

### Root cause
The DB function `insert_training_block_atomic` runs `SET LOCAL transaction_isolation = 'repeatable read'` AFTER validation queries (`jsonb_array_elements` loop) have already executed in the transaction. Postgres rejects this with `25001: SET TRANSACTION ISOLATION LEVEL must be called before any query`. Result: every 6-week block generation fails at the atomic insert step.

Confirmed in edge logs:
```
Atomic insert failed: SET TRANSACTION ISOLATION LEVEL must be called before any query
Error in generate-training-block: Failed to create training block: ...
```

### Fix
Migration to recreate `insert_training_block_atomic` with the `SET LOCAL transaction_isolation` line **removed**. The function's correctness does not depend on repeatable-read isolation — the row-level locking (`FOR UPDATE`) and the unique constraint on `(user_id, idempotency_key)` already prevent the duplicate-insert race it was trying to guard against.

All other logic in the function stays identical:
- Pre-insert workout/exercise validation
- Idempotency key conflict handling with `FOR UPDATE` lock
- Child workout + exercise inserts
- `pending_goal_change` flag reset

### Files touched
| File | Change |
|---|---|
| New migration | `DROP FUNCTION` + `CREATE OR REPLACE` of `insert_training_block_atomic` without `SET LOCAL transaction_isolation` |

### Verification
After migration deploys, generating a 6-week block from `/training-block` should succeed end-to-end: AI generation → atomic DB insert → calendar events → UI shows the block.

### Out of scope
- No edge function code changes needed (the bug is purely in the DB function).
- No client-side changes needed.

