

# DB-Enforced Activity Completion

## Architecture

**Trigger-based derivation**: A `BEFORE INSERT OR UPDATE` trigger on `custom_activity_logs` inspects `performance_data->'checkboxStates'` and automatically sets `completed` and `completed_at`. The frontend never computes or sends these fields when checkboxStates exist.

**No `game_plan_days` table exists** — game plan completion is computed in-memory by `useGamePlan.ts` from `custom_activity_logs.completed`. The DB trigger ensures this column is always correct, so `onRefresh()` remains the propagation mechanism (it re-reads the now-correct DB state). No second trigger needed.

## Changes

### 1. Migration: `derive_activity_completion` trigger

```sql
CREATE OR REPLACE FUNCTION derive_activity_completion()
RETURNS TRIGGER AS $$
DECLARE
  all_complete BOOLEAN;
BEGIN
  IF NEW.performance_data->'checkboxStates' IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM jsonb_each_text(NEW.performance_data->'checkboxStates') kv
    WHERE kv.value != 'true'
  ) INTO all_complete;

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_derive_activity_completion
BEFORE INSERT OR UPDATE OF performance_data
ON custom_activity_logs
FOR EACH ROW
EXECUTE FUNCTION derive_activity_completion();
```

- `completed_at` is only set on first completion (preserved if already set)
- Unchecking any item clears `completed_at`
- Activities with no `checkboxStates` key are untouched (manual toggle preserved)

### 2. Simplify `useCalendarActivityDetail.ts`

**`handleToggleCheckbox`** (line ~306-392):
- Remove `derivedCompleted` / `derivedCompletedAt` computation
- Only send `performance_data` in `.update()` and `.insert()` — remove `completed` and `completed_at` from both
- Optimistic UI: derive locally for instant feedback (read-only, not persisted) — compute from checkboxStates for the `setSelectedTask` call only
- After DB write, `onRefresh()` re-reads the trigger-set values

**`handleComplete`** (line ~177-238):
- When checkable items exist: only send `performance_data` with toggled checkboxStates — remove `completed`/`completed_at` from update/insert
- When NO checkable items: keep manual `completed` toggle (trigger won't fire since no checkboxStates)

**`quickComplete`** (line ~396-485):
- Checklist path (line 434-453): only send `performance_data` — remove `completed`/`completed_at`
- No-checklist path (line 457-476): keep manual `completed` toggle unchanged

### 3. No changes to `CustomActivityDetailDialog.tsx`

Button labels and "Check All / Uncheck All" UX stay exactly as-is. The dialog calls parent handlers which now only send `performance_data`.

### 4. No changes to `GamePlanCard.tsx` checkbox handlers

The folder-item completion paths in `GamePlanCard.tsx` use `folder_item_completions` (separate system) — not affected. The custom activity checkbox paths there also set `completed` manually — these need the same cleanup: only send `performance_data`, let the trigger handle `completed`.

## Files Modified

| File | Changes |
|------|--------|
| `supabase/migrations/[new].sql` | Create `derive_activity_completion()` function + trigger |
| `src/hooks/useCalendarActivityDetail.ts` | Remove all `derivedCompleted`/`derivedCompletedAt` from DB writes; keep optimistic UI derivation |
| `src/components/GamePlanCard.tsx` | Remove `completed`/`completed_at` from custom activity checkbox update paths (~lines 2119-2123) |

## What stays the same
- `getAllCheckableIds` utility — still used for optimistic UI and button labels
- `onRefresh()` calls — still needed for game plan to re-read correct DB state
- Manual completion for activities without checklists
- All folder-item completion logic (separate system)

## Edge cases handled
- No checkboxStates key → trigger skips, manual toggle works
- Empty checkboxStates `{}` → `NOT EXISTS` returns true → completed = true (auto-complete)
- `completed_at` preserved on re-check (only set when previously null)
- Race conditions eliminated — DB is single source of truth

