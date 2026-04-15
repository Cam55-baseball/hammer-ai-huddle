

# Final Hardening — 3 Fixes

Single migration file with three surgical changes. No edge function or frontend modifications.

## 1. Fix idempotency write amplification

Replace `ON CONFLICT ... DO UPDATE SET updated_at = now()` with `ON CONFLICT ... DO NOTHING`. After the INSERT, if no row was returned (conflict hit), do a fallback `SELECT ... FOR UPDATE` to fetch the existing block ID and lock it. This eliminates unnecessary WAL writes on every retry.

## 2. Enforce transaction isolation

Add `SET LOCAL transaction_isolation = 'repeatable read';` at the top of `insert_training_block_atomic` (after `BEGIN`), before any validation or inserts. This ensures the entire function runs under snapshot isolation, preventing phantom reads during concurrent execution.

## 3. Prevent duplicate scheduled dates

Add a unique partial index:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_block_workouts_date
ON block_workouts(block_id, scheduled_date)
WHERE status = 'scheduled';
```

## File

| File | Action |
|------|--------|
| `supabase/migrations/[new].sql` | Create — contains updated `insert_training_block_atomic` and the new index |

