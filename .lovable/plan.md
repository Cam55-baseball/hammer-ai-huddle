

## Production Hardening — Game Plan Completion System

### Issues to fix

1. **Trigger destroys user intent** — current `derive_activity_completion` and `derive_folder_item_completion` reset `completion_method` to `'none'` and null `completed_at` on every checkbox change, even when state is already `completed`. Must early-return when state is `completed`, and only touch `completion_method` when explicitly demoting.

2. **Refetch spam in `useCustomActivities`** — `setCompletionState`, `markAllCheckboxesAndComplete`, `reopenActivity` all call `fetchTodayLogs()` after the mutation. Replace with pure optimistic updates.

3. **Duplicate trigger functions** — collapse `derive_activity_completion` and `derive_folder_item_completion` into one shared `derive_completion_state()` function bound to both tables.

4. **Folder parity gap** — folder dialog instances in `GamePlanCard.tsx` (~lines 2580 / 2735) still use legacy auto-complete branches. Wire `onDone` / `onCheckAll` / `onReopen` and remove auto-complete logic in `onToggleCheckbox` for folder items.

5. **Missing guard** — add validation trigger preventing `completion_state='completed' + completion_method='done_button'` when no checkboxes are checked.

6. **Optional GIN index** — add for `checkboxStates` lookups.

### Migration plan (single migration file)

```sql
-- 1. Unified derive function
CREATE OR REPLACE FUNCTION public.derive_completion_state()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  checkbox_states JSONB;
  any_checked BOOLEAN;
BEGIN
  -- Skip if nothing relevant changed
  IF TG_OP = 'UPDATE'
     AND NEW.performance_data IS NOT DISTINCT FROM OLD.performance_data
     AND NEW.completion_state IS NOT DISTINCT FROM OLD.completion_state
     AND NEW.completion_method IS NOT DISTINCT FROM OLD.completion_method THEN
    RETURN NEW;
  END IF;

  -- HONOR USER INTENT: if state is completed, don't touch anything
  IF NEW.completion_state = 'completed' THEN
    NEW.completed := TRUE;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- Only reach here if state is not completed → derive from checkboxes
  checkbox_states := NEW.performance_data->'checkboxStates';
  IF checkbox_states IS NULL OR jsonb_typeof(checkbox_states) != 'object'
     OR jsonb_object_length(checkbox_states) = 0 THEN
    any_checked := FALSE;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM jsonb_each_text(checkbox_states) kv WHERE kv.value = 'true'
    ) INTO any_checked;
  END IF;

  NEW.completion_state := CASE WHEN any_checked THEN 'in_progress' ELSE 'not_started' END;
  -- Only reset method/completed_at when transitioning OUT of completed
  IF TG_OP = 'UPDATE' AND OLD.completion_state = 'completed' THEN
    NEW.completion_method := 'none';
    NEW.completed_at := NULL;
  END IF;
  NEW.completed := FALSE;
  RETURN NEW;
END;
$$;

-- 2. Validation trigger: reject done_button with no checks
CREATE OR REPLACE FUNCTION public.validate_completion_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  any_checked BOOLEAN;
  cb JSONB;
BEGIN
  IF NEW.completion_state = 'completed' AND NEW.completion_method = 'done_button' THEN
    cb := NEW.performance_data->'checkboxStates';
    IF cb IS NULL OR jsonb_object_length(cb) = 0 THEN
      any_checked := FALSE;
    ELSE
      SELECT EXISTS (SELECT 1 FROM jsonb_each_text(cb) kv WHERE kv.value='true') INTO any_checked;
    END IF;
    IF NOT any_checked THEN
      RAISE EXCEPTION 'Cannot mark done_button completion with no checked tasks';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Drop old per-table functions, rebind triggers to unified function
DROP TRIGGER IF EXISTS derive_activity_completion_trigger ON custom_activity_logs;
DROP TRIGGER IF EXISTS derive_folder_item_completion_trigger ON folder_item_completions;
DROP FUNCTION IF EXISTS public.derive_activity_completion();
DROP FUNCTION IF EXISTS public.derive_folder_item_completion();

CREATE TRIGGER derive_completion_state_trigger
  BEFORE INSERT OR UPDATE ON custom_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.derive_completion_state();

CREATE TRIGGER derive_completion_state_trigger
  BEFORE INSERT OR UPDATE ON folder_item_completions
  FOR EACH ROW EXECUTE FUNCTION public.derive_completion_state();

CREATE TRIGGER validate_completion_intent_trigger
  BEFORE INSERT OR UPDATE ON custom_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_completion_intent();

CREATE TRIGGER validate_completion_intent_trigger
  BEFORE INSERT OR UPDATE ON folder_item_completions
  FOR EACH ROW EXECUTE FUNCTION public.validate_completion_intent();

-- 4. GIN index
CREATE INDEX IF NOT EXISTS idx_custom_activity_logs_checkbox_states
  ON custom_activity_logs USING GIN ((performance_data->'checkboxStates'));
CREATE INDEX IF NOT EXISTS idx_folder_item_completions_checkbox_states
  ON folder_item_completions USING GIN ((performance_data->'checkboxStates'));
```

### Frontend changes

**`src/hooks/useCustomActivities.ts`**
- Remove `await fetchTodayLogs()` calls from `setCompletionState`, `markAllCheckboxesAndComplete`, `reopenActivity`. Keep optimistic `setTodayLogs(...)` updates only.

**`src/hooks/useGamePlan.ts`**
- Same: remove post-mutation refetches in `setFolderItemCompletionState` / `markFolderAllComplete` / `reopenFolderItem`.

**`src/components/GamePlanCard.tsx`**
- Folder-item dialog instances at ~lines 2580 and 2735: pass `onDone`, `onCheckAll`, `onReopen` props pointing to the folder-equivalent hook methods.
- Folder `onToggleCheckbox` handler: remove any auto-complete branch; add the same demote rule (`completed + check_all` → `in_progress + none` on uncheck).

### Files

| File | Change |
|------|--------|
| `supabase/migrations/<new>.sql` | Unified `derive_completion_state()`, `validate_completion_intent()`, drop old funcs, rebind triggers, add GIN indexes |
| `src/hooks/useCustomActivities.ts` | Strip `fetchTodayLogs()` from completion mutators |
| `src/hooks/useGamePlan.ts` | Strip refetches from folder completion mutators |
| `src/components/GamePlanCard.tsx` | Wire folder dialogs to new handlers; remove auto-complete + add demote rule for folder checkboxes |

### Non-negotiables preserved
- ✅ Trigger never wipes `completion_method` or `completed_at` while state is `completed`
- ✅ Single shared trigger function across both tables
- ✅ No auto-complete from checkbox toggles anywhere
- ✅ DB rejects `done_button` completion with zero checked tasks
- ✅ Folder items behave identically to custom activities
- ✅ No post-mutation refetches → race-free optimistic UI

