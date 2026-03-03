

# Send to Coach for Edit: Not Functional (Orphaned Component)

## Finding

The "Send to Coach for Edit" feature is **not working** because the `CustomActivityCard.tsx` component (which contains the graduation cap button and `SendCardToCoachDialog`) is **never imported or used anywhere** in the application.

The Game Plan section renders custom activities through `GamePlanCard.tsx`, which has no send-to-coach functionality at all. `CustomActivityCard.tsx` is orphaned/dead code.

## Fix

Integrate the send-to-coach capability into the actual Game Plan card rendering in `GamePlanCard.tsx`:

### `src/components/GamePlanCard.tsx`
- Import `SendCardToCoachDialog` and `GraduationCap` icon
- Add a graduation cap button to each custom activity card row (near the existing edit/complete buttons)
- Wire it to open `SendCardToCoachDialog` with the template's title
- Only show the button for custom activity tasks (not built-in daily check-ins or folder items)

### Additional consideration
- The `SendCardToCoachDialog` currently passes `folderId=""` which is empty -- the dialog uses this to check `folder_coach_permissions`, meaning the permission check will likely fail or behave unexpectedly with an empty folder ID. This needs to be either:
  - Skipped when there's no folder (standalone custom activities don't live in folders)
  - Or the dialog should handle the "no folder" case by just sharing the template data directly without folder permission logic

### Files to edit
| File | Change |
|------|--------|
| `src/components/GamePlanCard.tsx` | Add graduation cap button + SendCardToCoachDialog for custom activity tasks |
| `src/components/custom-activities/SendCardToCoachDialog.tsx` | Handle the case where `folderId` is empty (skip folder permission check, just share) |

