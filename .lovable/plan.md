## Plan — Restore Per-Item Checkboxes + Add "Done" Exit Button

### Root cause investigation needed

The console logs and DB state confirm triggers exist now (good), but the user reports two UX failures inside the activity execution dialog:

1. Individual checkboxes don't always persist on click
2. Only "Finish" exists — no "Done" to exit while preserving partial checks

These are **frontend** issues, not trigger issues. The route `/dashboard?folderItemId=...` opens a folder activity execution dialog. I need to find that component and fix the checkbox write path + add the second button.

### Investigation steps (will perform on approval)

1. Find the dialog component that opens from `?folderItemId=` query param (likely in `Dashboard.tsx` or a `FolderItemExecutionDialog` / similar).
2. Locate the checkbox toggle handler — verify it writes `checkboxStates` to `folder_item_completions.performance_data` with **real booleans** (not strings — our new strict `has_any_checked` rejects strings).
3. Locate the bottom action bar that currently shows only "Finish".

### Likely fixes

**A. Checkbox persistence**

- Ensure `performance_data.checkboxStates[itemId] = true` (boolean, not `"true"` string).
- Ensure the upsert sends `completion_state` = `'in_progress'` (or omits it and lets the trigger derive it) and `completion_method` = `'none'` while partial.
- Ensure optimistic state updates immediately on click; debounced/awaited DB write does not block UI.

**B. Two-button bottom bar**
Replace single "Finish" with:

- **Done** (secondary) — closes dialog, persists current `checkboxStates` as-is, leaves `completion_state` as `in_progress` (or `not_started` if zero checked). Never marks `completed`.
- **Finish** (primary) — marks `completion_state = 'completed'`, sets `completion_method`:
  - `'check_all'` if every item is checked
  - `'done_button'` if at least one is checked but not all
  - Disabled if zero checked (DB would reject anyway)

**C. Mirror logic for custom activity dialog** (non-folder path) so both surfaces behave identically — per the existing invariant memory.

### Files to inspect / modify


| File                                                                                   | Purpose                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `src/pages/Dashboard.tsx`                                                              | Find `?folderItemId` handler                       |
| `src/components/folders/*ExecutionDialog*` or similar                                  | Checkbox + button logic for folder items           |
| `src/components/custom-activities/*ExecutionDialog*` or similar                        | Same fix for custom activities                     |
| Hook: `useFolderItemCompletion` / `useCustomActivityLog` (whatever upsert hook exists) | Ensure boolean writes, correct state/method values |


### Non-negotiables preserved

- ✅ Checkbox values written as real `true`/`false` booleans (matches strict `has_any_checked`)
- ✅ "Done" never marks completed — only persists progress + closes
- ✅ "Finish" sets correct `completion_method` based on check ratio
- ✅ Empty state cannot reach `completed` (Finish disabled)
- ✅ Both folder + custom activity flows behave identically
- ✅ No trigger or DB schema changes required

### Out of scope

- DB triggers (already correct)
- Backfill (already done)
- Other tabs/screens