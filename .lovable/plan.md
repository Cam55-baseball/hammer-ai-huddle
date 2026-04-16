

# Game Plan Activity Cards — Progress vs Completion Separation

## Core Problem
A DB trigger (`derive_activity_completion`) currently overwrites `completed` based purely on whether all checkboxes are checked. This conflicts with the new spec: **completion must reflect user intent**, not derived state. Checkbox progress and completion need to become independent.

## Data Model Changes

### Migration on `custom_activity_logs`
Add two columns:
```sql
ALTER TABLE custom_activity_logs
  ADD COLUMN completion_state text NOT NULL DEFAULT 'not_started'
    CHECK (completion_state IN ('not_started','in_progress','completed')),
  ADD COLUMN completion_method text NOT NULL DEFAULT 'none'
    CHECK (completion_method IN ('none','done_button','check_all'));
```

Backfill from existing `completed` flag:
- `completed = true` → `completion_state='completed'`, `completion_method='check_all'` (best guess for legacy)
- `completed = false` + has any checked boxes → `'in_progress'`
- otherwise → `'not_started'`

### Replace the auto-derive trigger
Drop `trigger_derive_activity_completion` and replace with a **progress-only** trigger that updates `completion_state` based on checkboxes WITHOUT forcing completion:

```text
On INSERT/UPDATE of performance_data:
  if completion_state == 'completed': do nothing (preserve user intent)
  else:
    anyChecked = any(checkboxStates) == true
    completion_state = anyChecked ? 'in_progress' : 'not_started'
    completion_method = 'none'
```

Keep `completed` column in sync as a derived mirror: `completed := (completion_state = 'completed')` so existing reads keep working.

### Folder items (`folder_item_completions`)
Same two columns added; same trigger logic. (Folder cards share the checkbox UI in `GamePlanCard`.)

## Frontend Changes

### `CustomActivityDetailDialog.tsx`
Replace single "Check All & Complete / Uncheck All" button with **two buttons**:

| Button | Label | Variant | Logic |
|--------|-------|---------|-------|
| Primary | "Finish for now" | filled | `onDone()` — if any checked → state=`completed`, method=`done_button`. Does NOT auto-check remaining boxes. |
| Secondary | "Mark all complete" | outline | `onCheckAll()` — sets all `checkboxStates[*] = true`, state=`completed`, method=`check_all`. |

When `completion_state === 'completed'`:
- Show pill: `'Fully completed'` (method=`check_all` or all boxes checked) or `'Completed (partial)'` (method=`done_button` and some unchecked).
- Replace primary with **"Reopen"** that flips state back to `in_progress` (or `not_started` if no boxes checked), method=`none`.

Checkbox `onToggleCheckbox` keeps persisting immediately. **Remove the auto-complete and un-complete branches** (lines 2120–2153 in `GamePlanCard.tsx`) — checkbox toggles never change `completion_state` to `completed`. They only flip between `not_started` ↔ `in_progress` (handled server-side by the new trigger).

If user unchecks a box while state is `completed` AND method was `check_all` → frontend explicitly demotes to `in_progress`, method=`none` (the "user previously clicked Check All then unchecks" rule).

### `GamePlanCard.tsx` — wire up new handlers
Add to `CustomActivityDetailDialog` props:
- `onDone(): Promise<void>`
- `onCheckAll(): Promise<void>`
- `onReopen(): Promise<void>`

Each calls a new method on `useCustomActivities`:
- `setCompletionState(templateId, state, method, opts?)` — single point of write.
- `markAllCheckboxesAndComplete(templateId)` — patches `performance_data.checkboxStates` to all true + sets state.

### `useCustomActivities.ts` & `useGamePlan.ts`
- Read & expose `completion_state`, `completion_method` on each log/task.
- Derive `task.completed` from `completion_state === 'completed'` (no behavior change for downstream).
- Add `setCompletionState` and `markAllCheckboxesAndComplete` mutators with optimistic UI.
- Expose `completion_state` on `GamePlanTask` so the card can render the partial/full pill.

### `useGamePlan.ts` — folder tasks
Mirror the same on `toggleFolderItemCompletion` / `saveFolderCheckboxState`: split into `markFolderDone` and `markFolderAllComplete`.

### Card list view (collapsed cards in `GamePlanCard.tsx`)
For activities with `completion_state === 'in_progress'`, show a small progress dot/badge ("In progress · 2/5"). Existing checkmark UI remains for `completed`.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/<new>.sql` | Add `completion_state` / `completion_method` columns to `custom_activity_logs` and `folder_item_completions`; backfill; drop & replace `derive_activity_completion` trigger with progress-only version |
| `src/hooks/useCustomActivities.ts` | Read new columns; add `setCompletionState`, `markAllCheckboxesAndComplete`, `reopenActivity` |
| `src/hooks/useGamePlan.ts` | Surface `completion_state`/`completion_method` on `GamePlanTask` and folder tasks; equivalents for folder items |
| `src/components/CustomActivityDetailDialog.tsx` | Split single button into "Finish for now" + "Mark all complete"; add Reopen state; show partial/full pill; new props |
| `src/components/GamePlanCard.tsx` | Wire `onDone` / `onCheckAll` / `onReopen`; remove auto-complete-on-all-checked logic in `onToggleCheckbox`; demote method to `none` when user unchecks after a check_all; add in-progress badge in card list |

## Non-Negotiables Preserved
- ✅ Checkbox toggles persist immediately and independently of completion buttons.
- ✅ Trigger never sets `completion_state='completed'` on its own.
- ✅ Returning users see prior checkbox state untouched.
- ✅ `completion_method='done_button'` does NOT auto-check remaining boxes.
- ✅ Unchecking a box after `check_all` demotes to `in_progress`.

## Out of Scope
- Section-wide "complete day" UX (already exists via `isDayComplete`).
- Migration of historical records' `completion_method` beyond best-guess backfill.

