## Problem

When a user checks every item in a custom activity's checklist, the activity should automatically be marked as **Completed** (same outcome as pressing **Complete Activity**). Today it stays as "in progress" because checkbox toggles only persist `performance_data.checkboxStates` — they never promote `completion_state` to `completed`. There is a DEMOTE rule (uncheck after `check_all` → `in_progress`) but no PROMOTE rule.

## Fix

Add a single **PROMOTE rule** wherever a checkbox is toggled: after the merged checkbox state is computed, if **all checkable items are now true**, also write `completion_state='completed'`, `completion_method='auto_check_all'`, `completed=true`, `completed_at=now()`. If at least one item is now false and the activity was previously `completed` via either `check_all` or `auto_check_all`, demote to `in_progress` (extends the existing demote rule).

This mirrors what the existing `markAllCheckboxesAndComplete` ("Complete Activity" button) already does — we just trigger it implicitly when the user reaches 100% via individual clicks.

## Where to change

1. **`src/components/GamePlanCard.tsx`** — three `onToggleCheckbox` handlers:
   - Line ~2421 (custom activity detail dialog)
   - Line ~2942 and ~3124 (folder item dialogs)

   After persisting `performance_data`, compute `allCheckableIds` from the template, check whether every id is `true` in the merged states, and:
   - If yes and not already completed → call `setCompletionState(template.id, 'completed', 'auto_check_all', logId)` (or the folder equivalent `setFolderItemCompletionState(itemId, 'completed', 'auto_check_all')`) and update local `selectedCustomTask` / `selectedFolderTask` to reflect `completed=true`, `completionState='completed'`, `completionMethod='auto_check_all'`.
   - Extend the existing demote check to also fire when `currentMethod === 'auto_check_all'`.

2. **`src/hooks/useCalendarActivityDetail.ts`** — `handleToggleCheckbox` (line 302):
   - It already computes `derivedCompleted`. Persist it: include `completion_state`, `completion_method`, `completed`, `completed_at` in the `update({ performance_data: finalPd, ... })` call when `derivedCompleted` flips on, and demote to `in_progress` (clear `completed_at`) when it flips off and prior method was `check_all`/`auto_check_all`.

3. **`src/hooks/useCustomActivities.ts`** — export a small helper `setCompletionStateForLog(logId, state, method)` only if needed; otherwise reuse `setCompletionState(templateId, state, method, logId)` which already routes through `ensureLogExists` and is race-safe.

## Behavior summary

| User action | Result |
|---|---|
| Check every item one-by-one | Auto-promoted to Completed (method `auto_check_all`) |
| Press "Complete Activity" | Completed (method `check_all`) — unchanged |
| Press "Done" with partial checks | Stays in_progress — unchanged |
| Uncheck an item after auto/check_all completion | Demoted to in_progress |
| Activity has no checklist items | No change — Mark Complete button still required |

## Edge cases handled

- Race-safe: promotion piggybacks on the existing serialized `enqueueLogWrite` chain via `setCompletionState` → `ensureLogExists`.
- Optimistic UI: local task state updated synchronously to `completed=true` so the green "Fully completed" pill appears immediately.
- Reopen still works: `reopenActivity` already handles both methods.
- "Complete Activity" button still wins when pressed mid-checklist (it forces all boxes true + `check_all` method).

## Files touched

- `src/components/GamePlanCard.tsx`
- `src/hooks/useCalendarActivityDetail.ts`
- `src/hooks/useCustomActivities.ts` (only if a new helper is needed; likely not)
