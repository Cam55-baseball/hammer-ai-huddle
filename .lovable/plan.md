

# Fix DB Trigger + Game Plan Day Completion

## Issue 1: `game_plan_days` table does not exist

The requested `update_game_plan_day_completion` trigger references a `game_plan_days` table that **does not exist** in the database. Game plan completion is computed in-memory by `useGamePlan.ts` from `custom_activity_logs.completed`. There is no persistent day-level completion table.

**Two options:**

**Option A — Create `game_plan_days` table + trigger** (full DB enforcement as requested)
- Create `game_plan_days(id, user_id, date, is_completed)` with a unique constraint on `(user_id, date)`
- The trigger would need `user_id` from `custom_activity_logs` to scope correctly
- Frontend `useGamePlan.ts` would need to read from this table instead of computing in-memory
- Risk: requires seeding rows for every day, or upsert logic in the trigger

**Option B — Skip the day-completion trigger** (pragmatic)
- The DB trigger on `custom_activity_logs` already guarantees `completed` is correct
- `useGamePlan.ts` reads the correct `completed` value on refresh — which is now always accurate
- No new table needed

## What I can do now (fixes 1, 3, 4 — no ambiguity)

Single migration that:

1. **Fix empty checklist**: Replace `derive_activity_completion()` to treat `{}` as incomplete
2. **Add early-exit guard**: Skip recompute when `performance_data` unchanged on UPDATE
3. **Widen trigger scope**: Drop and recreate trigger on `BEFORE INSERT OR UPDATE` (not just `OF performance_data`)

```sql
CREATE OR REPLACE FUNCTION public.derive_activity_completion()
RETURNS TRIGGER AS $$
DECLARE
  checkbox_states JSONB;
  all_complete BOOLEAN;
BEGIN
  -- Guard: skip if performance_data unchanged
  IF TG_OP = 'UPDATE' AND NEW.performance_data IS NOT DISTINCT FROM OLD.performance_data THEN
    RETURN NEW;
  END IF;

  checkbox_states := NEW.performance_data->'checkboxStates';

  IF checkbox_states IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_object_length(checkbox_states) = 0 THEN
    all_complete := FALSE;
  ELSE
    SELECT NOT EXISTS (
      SELECT 1 FROM jsonb_each_text(checkbox_states) kv
      WHERE kv.value != 'true'
    ) INTO all_complete;
  END IF;

  NEW.completed := all_complete;

  IF all_complete THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_derive_activity_completion ON public.custom_activity_logs;

CREATE TRIGGER trigger_derive_activity_completion
BEFORE INSERT OR UPDATE
ON public.custom_activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.derive_activity_completion();
```

## Decision needed on game plan day completion

Do you want me to:
- **A**: Create a `game_plan_days` table and the day-completion trigger (adds schema complexity, requires frontend changes to read from it)
- **B**: Skip it — the activity-level trigger guarantees `completed` is always correct, and `useGamePlan.ts` already reads that on refresh

## Files modified

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Updated function + widened trigger |

No frontend changes needed for fixes 1/3/4.

