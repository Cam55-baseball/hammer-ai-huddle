## Add "Delete Activity" button to custom activities in Game Plan

When a user opens a custom activity from the Game Plan (the `CustomActivityDetailDialog`), they currently can Complete, Edit, Skip for Today, or Send to Coach — but there is no way to delete the activity from this entry point. Today, deletion is only reachable from the My Activities management screen. This plan adds a Delete button directly to the dialog opened from the Game Plan.

### Behavior

- New "Delete Activity" button appears in the dialog's action footer, below the existing Skip / Send to Coach row.
- Styled as a destructive outline button (red) so it is clearly separated from positive actions.
- Click opens a confirmation `AlertDialog` ("Delete this activity? It will be moved to Recently Deleted and removed from your Game Plan. You can restore it within 30 days from My Activities → Recently Deleted.").
- On confirm: performs a **soft delete** (consistent with the rest of the app — sets `deleted_at` on `custom_activity_templates`), closes the dialog, removes the card from today's Game Plan, and shows a toast with an "Undo" action that clears `deleted_at`.
- Deletion uses the existing `deleteTemplate(id)` from `useCustomActivities` so the item shows up in the existing "Recently Deleted" list and can be restored there.
- Hidden when the activity originates from a coach-sent card or a folder item (those are managed elsewhere) — only shown for user-owned standalone custom activity templates.

### Technical details

Files to change:

1. **`src/components/CustomActivityDetailDialog.tsx`**
   - Add optional prop `onDeleteActivity?: () => Promise<void> | void`.
   - Render a destructive "Delete Activity" button below the Skip / Send-to-Coach row, only when `onDeleteActivity` is provided.
   - Wrap the click in an `AlertDialog` confirm (reuse `@/components/ui/alert-dialog`) so deletion isn't accidental.
   - Close the parent dialog (`onOpenChange(false)`) after a successful delete.
   - Add the i18n keys `customActivity.detail.deleteActivity`, `customActivity.detail.deleteConfirmTitle`, `customActivity.detail.deleteConfirmDescription`, `common.cancel`, `common.delete` (with English fallbacks inline as the rest of the file does).

2. **`src/components/GamePlanCard.tsx`**
   - Import `useCustomActivities` is already in use indirectly via `useGamePlan`; add a direct call to `deleteTemplate` from `useCustomActivities` (or expose `deleteTemplate` through `useGamePlan` to keep one source of truth — preferred since `useGamePlan` already holds the refresh logic).
   - Pass an `onDeleteActivity` handler to `<CustomActivityDetailDialog ... />` (the instance at ~line 2403). Inside the handler:
     - Pull `template.id` from `selectedCustomTask.customActivityData`.
     - Skip if the activity is coach-sent / folder-derived (guard on `selectedCustomTask.folderItemData` or a `received` flag).
     - Call `deleteTemplate(templateId)`; on success, call `refreshCustomActivities()` (already exposed) and broadcast via the existing `BroadcastChannel('data-sync')` pattern used elsewhere in this file so other tabs refresh.
     - Show a `toast.success` with an Undo action that re-sets `deleted_at` to null on `custom_activity_templates` (mirroring `useDeletedActivities.restoreActivity`).
   - Do **not** wire the same handler to the second `CustomActivityDetailDialog` instance (~line 2954) which renders folder-snapshot items — those aren't standalone templates.

3. **`src/hooks/useGamePlan.ts`** (small addition)
   - Re-export `deleteTemplate` from the embedded `useCustomActivities` instance in the returned object so `GamePlanCard` doesn't need a second hook subscription.

### Out of scope

- No schema changes (soft delete column already exists).
- No changes to the Recently Deleted UI (already supports restoring within 30 days).
- No changes to folder-item or coach-sent card handling.
