

## NOT READY FOR DEPLOY — 2 Critical Gaps Found

Audit results across all 8 invariants:

| # | Invariant | Status |
|---|-----------|--------|
| 1 | Idempotency early-return | ✅ Present in `derive_completion_state` |
| 2 | `completed_at` defensive set | ✅ Present in derive function |
| 3 | `all_checked()` strictness (jsonb_each + boolean typeof + cast) | ✅ Correct |
| 4 | Trigger execution order | ❌ **NO TRIGGERS BOUND** |
| 5 | Partial index `(user_id, entry_date) WHERE in_progress` | ✅ Both tables |
| 6 | Legacy data sanity | ❌ **19 rows** with `completed` + `completed_at IS NULL` |
| 7 | Frontend contract | ✅ UI always sends valid `(state, method)` |
| 8 | GIN index on checkboxStates | ✅ Both tables |

### Critical findings

**A. No triggers exist.** `information_schema.triggers` returns zero rows for both `custom_activity_logs` and `folder_item_completions`. The functions `derive_completion_state` and `validate_completion_intent` are defined but **never bound to any table**. Every invariant we built is currently a no-op in production. Earlier migrations created the functions but the `CREATE TRIGGER` statements were never executed (or were dropped).

**B. 19 legacy rows** in `custom_activity_logs` are `completion_state='completed'` with `completed_at IS NULL`. If we attach `validate_completion_intent` first, these rows survive (validation only fires on writes), but any future UPDATE will not fail since the validator doesn't check `completed_at`. However, these rows violate our invariant and break analytics ordering. Backfill required.

(Note: 0 rows have `method='none' + completed`, and 0 rows have `completed_at` set with non-completed state — those invariants are clean.)

### Fix — single migration

```sql
-- 1. Backfill 19 legacy orphan rows
UPDATE public.custom_activity_logs
SET completed_at = COALESCE(updated_at, created_at, NOW())
WHERE completion_state = 'completed' AND completed_at IS NULL;

-- 2. Bind triggers — validate FIRST, derive SECOND
-- Postgres BEFORE triggers fire in alphabetical order by name; prefix to lock order.
CREATE TRIGGER trg_01_validate_completion_intent
  BEFORE INSERT OR UPDATE ON public.custom_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_completion_intent();

CREATE TRIGGER trg_02_derive_completion_state
  BEFORE INSERT OR UPDATE ON public.custom_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.derive_completion_state();

CREATE TRIGGER trg_01_validate_completion_intent
  BEFORE INSERT OR UPDATE ON public.folder_item_completions
  FOR EACH ROW EXECUTE FUNCTION public.validate_completion_intent();

CREATE TRIGGER trg_02_derive_completion_state
  BEFORE INSERT OR UPDATE ON public.folder_item_completions
  FOR EACH ROW EXECUTE FUNCTION public.derive_completion_state();
```

### Order rationale (item #4)

Validate must run **before** derive so we reject malformed input before any mutation. Both are `BEFORE` triggers; Postgres fires same-timing triggers in **alphabetical name order**. Using `trg_01_*` and `trg_02_*` prefixes guarantees validate→derive ordering deterministically.

The validator only checks user-provided fields (`completion_state`, `completion_method`, `performance_data` shape) — none of which derive mutates. So validate-then-derive is safe and cannot create a "derive then fail validation" path.

### Files

| File | Change |
|------|--------|
| `supabase/migrations/<new>.sql` | Backfill 19 orphan rows; bind 4 triggers (2 per table) with explicit ordering prefixes |

### Post-migration verification queries
- `SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table IN ('custom_activity_logs','folder_item_completions')` → expect 4
- Re-run orphan check → expect all zeros
- Test write: `UPDATE custom_activity_logs SET completion_state='completed', completion_method='none' WHERE id=…` → must raise

After this migration: **READY FOR DEPLOY.**

