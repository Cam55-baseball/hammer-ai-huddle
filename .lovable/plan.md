

# Derived Activity Completion from Checklist Items

## Current State
- `custom_activity_logs.completed` is toggled manually (independent of checkbox state)
- Checkbox states live in `custom_activity_logs.performance_data.checkboxStates` (JSON)
- `getAllCheckableIds(template)` already extracts all checkable item IDs from a template
- Game plan reads `activity.log?.completed` to show completion status
- Folder items have their own `folder_item_completions.completed` flag (separate system, not changing)

## Architecture Decision
**Option C (Frontend Derived) + DB persistence** — the checklist items are stored as JSON inside `performance_data`, not as separate rows in a `checklist_items` table. A DB trigger cannot inspect JSON checkbox states against the template's checkable IDs (which live in a different JSON column on a different table). Therefore:

1. **Derive completion in the frontend** whenever checkboxes change
2. **Persist the derived `completed` flag** to `custom_activity_logs` so queries/game plan stay simple
3. **No new tables or triggers needed** — the existing schema supports this

## Changes

### 1. Auto-derive completion on checkbox toggle (`useCalendarActivityDetail.ts`)
In `handleToggleCheckbox`, after updating `checkboxStates`:
- Import and call `getAllCheckableIds(template)` to get all checkable IDs
- Compare against the new `checkboxStates` — if every ID is `true`, set `completed = true` + `completed_at = now()`
- If any ID is `false`, set `completed = false` + `completed_at = null`
- Persist both `performance_data` and `completed` in the same `.update()` call
- Update optimistic state to reflect derived completion

### 2. Auto-derive in `CustomActivityDetailDialog.tsx` internal toggle
The dialog's `handleToggleCheckbox` calls the parent's `onToggleCheckbox`. Ensure the parent always derives completion. Also update the `handleComplete` button behavior:
- If there are checkable items, the manual complete button should check/uncheck all items instead of toggling `completed` directly
- If there are NO checkable items, auto-complete (treat as completed — edge case rule)

### 3. Game Plan completion propagation (`useGamePlan.ts`)
- `activity.log?.completed` already drives game plan task completion — no change needed here since we persist the derived flag
- The `completedCount` calculation at line 1402 already counts `t.completed` — this stays correct

### 4. Edge case: No checkable items
- Activities with zero checkable items → `completed = true` when the user taps complete (current behavior preserved)
- Activities WITH checkable items → completion is purely derived, manual toggle disabled

### 5. Undo behavior
- Already handled: unchecking any item recalculates → sets `completed = false` → game plan reverts instantly via optimistic update

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useCalendarActivityDetail.ts` | Derive `completed` from checkbox states in `handleToggleCheckbox`; update `quickComplete` for no-checklist activities |
| `src/components/CustomActivityDetailDialog.tsx` | Complete button toggles all checkboxes when items exist; auto-complete when no items; show derived completion state |
| `src/hooks/useGamePlan.ts` | Minor: ensure `refreshCustomActivities` picks up derived completion (already works, verify only) |

## Test Cases
- Check all items → activity becomes completed on game plan
- Uncheck one item → activity reverts to incomplete
- Activity with no checkable items → manual complete still works
- All activities complete for a day → day completion count reflects correctly
- Bulk checkbox changes → each toggle recalculates correctly

