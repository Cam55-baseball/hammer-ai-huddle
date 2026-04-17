

## Final .01% Hardening — Completion System Invariants

### Single migration, no frontend changes

All 6 fixes land in one new migration. Triggers are bound via `CREATE OR REPLACE FUNCTION` (no rebinding needed).

### Changes

**1. Guarantee `completed_at` is set** — already present in current `derive_completion_state()` but reaffirm in the rewritten version.

**2. Immutable `completion_method` while completed** — add to `validate_completion_intent()`:
```sql
IF TG_OP = 'UPDATE'
   AND OLD.completion_state = 'completed'
   AND NEW.completion_state = 'completed'
   AND OLD.completion_method IS DISTINCT FROM NEW.completion_method THEN
  RAISE EXCEPTION 'Cannot change completion_method after completion';
END IF;
```

**3. Reject illegal transitions** — strengthen `validate_completion_intent()`:
```sql
IF NEW.completion_state = 'completed' AND NOT (
  NEW.completion_method = 'check_all'
  OR (NEW.completion_method = 'done_button'
      AND public.has_any_checked(NEW.performance_data->'checkboxStates'))
) THEN
  RAISE EXCEPTION 'Invalid completion transition';
END IF;
```
This subsumes the existing `done_button + no checks` and `method='none'` guards.

**4. Lock `performance_data.checkboxStates` shape** — add early in `validate_completion_intent()`:
```sql
IF NEW.performance_data IS NOT NULL
   AND NEW.performance_data ? 'checkboxStates'
   AND jsonb_typeof(NEW.performance_data->'checkboxStates') != 'object' THEN
  RAISE EXCEPTION 'checkboxStates must be a JSON object';
END IF;
```

**5. Strict boolean check in `has_any_checked()`** — replace string compare with cast:
```sql
CREATE OR REPLACE FUNCTION public.has_any_checked(cb jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN cb IS NULL OR jsonb_typeof(cb) != 'object' THEN FALSE
    ELSE EXISTS (
      SELECT 1 FROM jsonb_each(cb) kv
      WHERE jsonb_typeof(kv.value) = 'boolean' AND (kv.value)::text::boolean IS TRUE
    )
  END
$$;
```
Uses `jsonb_each` (not `_text`) + typeof guard so string `"true"` no longer counts. Frontend already writes real booleans into `checkboxStates`, so no UX regression.

**6. Partial index for active progress** — both tables:
```sql
CREATE INDEX IF NOT EXISTS idx_custom_activity_logs_in_progress
  ON public.custom_activity_logs (user_id, entry_date)
  WHERE completion_state = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_folder_item_completions_in_progress
  ON public.folder_item_completions (user_id, entry_date)
  WHERE completion_state = 'in_progress';
```
(Will verify `folder_item_completions` has `entry_date`; if not, swap to its date column.)

### Skipped

- **Item 7 (optimistic concurrency on `updated_at`)** — frontend already uses `BroadcastChannel` multi-tab sync + optimistic UI; adding a trigger-level `updated_at` guard would reject legitimate stale-but-correct writes from mobile reconnects. Better handled at the app layer per existing memory `architecture/multi-tab-synchronization-strategy`. Leaving out unless explicitly requested.

### Files

| File | Change |
|------|--------|
| `supabase/migrations/<new>.sql` | Rewrite `has_any_checked()` with strict boolean cast; rewrite `validate_completion_intent()` with shape guard + immutable method + unified illegal-transition check; reaffirm `derive_completion_state()` `completed_at` set; add two partial indexes |

### Invariants guaranteed after this migration
- ✅ `completed` is pure function of `completion_state`
- ✅ `completed_at` is non-null for every completed row
- ✅ `completion_method` cannot change once `completed`
- ✅ No illegal jump to `completed` without valid method + (for `done_button`) checked tasks
- ✅ `checkboxStates` shape enforced at DB
- ✅ Only true booleans count as "checked" — no string drift
- ✅ Fast partial-index lookups for in-progress dashboards

