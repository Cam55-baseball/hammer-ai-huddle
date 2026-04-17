

## Final Hardening Pass — Completion Trigger Precision

### Changes (single new migration)

1. **Narrow `completed_at` wipe condition** — only clear method/completed_at when truly transitioning OUT of completed (i.e. `OLD.completion_state = 'completed' AND NEW.completion_state != 'completed'`). Current code already gates on `OLD.completion_state = 'completed'` but runs in a branch where `NEW.completion_state` was just rewritten to `in_progress`/`not_started`, so behavior is correct — but make the condition **explicit** for clarity and safety against future edits.

2. **Deterministic `completed` mirror** — replace `NEW.completed := FALSE` with `NEW.completed := (NEW.completion_state = 'completed')` so the boolean column is always a pure function of state, never implicit.

3. **Reject `completed + method='none'`** — add guard in `validate_completion_intent()`: any `completed` row must carry `done_button` or `check_all`. Prevents silent state corruption.

4. **DRY helper** — extract `public.has_any_checked(jsonb) RETURNS boolean` and call it from both `derive_completion_state()` and `validate_completion_intent()`.

### Migration sketch

```sql
-- Helper
CREATE OR REPLACE FUNCTION public.has_any_checked(cb JSONB)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN cb IS NULL OR jsonb_typeof(cb) != 'object' OR jsonb_object_length(cb) = 0
      THEN FALSE
    ELSE EXISTS (SELECT 1 FROM jsonb_each_text(cb) kv WHERE kv.value = 'true')
  END
$$;

-- Replace derive function
CREATE OR REPLACE FUNCTION public.derive_completion_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.performance_data IS NOT DISTINCT FROM OLD.performance_data
     AND NEW.completion_state IS NOT DISTINCT FROM OLD.completion_state
     AND NEW.completion_method IS NOT DISTINCT FROM OLD.completion_method THEN
    RETURN NEW;
  END IF;

  IF NEW.completion_state = 'completed' THEN
    NEW.completed := TRUE;
    IF NEW.completed_at IS NULL THEN NEW.completed_at := NOW(); END IF;
    RETURN NEW;
  END IF;

  NEW.completion_state := CASE
    WHEN public.has_any_checked(NEW.performance_data->'checkboxStates')
      THEN 'in_progress' ELSE 'not_started' END;

  -- Explicit transition OUT of completed
  IF TG_OP = 'UPDATE'
     AND OLD.completion_state = 'completed'
     AND NEW.completion_state != 'completed' THEN
    NEW.completion_method := 'none';
    NEW.completed_at := NULL;
  END IF;

  NEW.completed := (NEW.completion_state = 'completed');
  RETURN NEW;
END;
$$;

-- Replace validate function
CREATE OR REPLACE FUNCTION public.validate_completion_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.completion_state = 'completed' THEN
    IF NEW.completion_method = 'none' THEN
      RAISE EXCEPTION 'Completed state requires a valid completion_method (done_button or check_all)';
    END IF;
    IF NEW.completion_method = 'done_button'
       AND NOT public.has_any_checked(NEW.performance_data->'checkboxStates') THEN
      RAISE EXCEPTION 'Cannot mark done_button completion with no checked tasks';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

Triggers stay bound (CREATE OR REPLACE FUNCTION preserves bindings); no DROP/CREATE trigger churn needed.

### Files

| File | Change |
|------|--------|
| `supabase/migrations/<new>.sql` | Add `has_any_checked()` helper; replace `derive_completion_state()` with explicit-transition guard + deterministic `completed` mirror; replace `validate_completion_intent()` to reject `completed + method='none'` and reuse helper |

### Non-negotiables preserved
- ✅ `completed_at` only cleared on explicit `completed → not-completed` transition
- ✅ `completed` boolean is now a pure function of `completion_state`
- ✅ DB rejects `completed` rows with `method='none'`
- ✅ Single source of truth for "any checkbox checked" logic
- ✅ No frontend changes required

