## Make Delete Activity work on every custom activity in the Game Plan

### The bug

Today the "Delete Activity" button only appears for **standalone** custom activities the player created or accepted from a coach. It is missing for:

1. **Custom activities sitting inside a folder** (your own folders).
2. **Activities inside coach-shared folders** that landed on your Game Plan via a `folder_assignments` accept.

That happens because `GamePlanCard.tsx` mounts `CustomActivityDetailDialog` from three places:

- standalone path (line ~2450) — passes `onDeleteActivity`, but only when `!folderItemData`.
- folder-snapshot path (~3078) — does **not** pass `onDeleteActivity` at all.
- folder raw-fields path (~3269) — does **not** pass `onDeleteActivity` at all.

So clicking into any folder item shows no Delete button. We will fix this end-to-end.

### Behavior after the fix

For every custom activity opened from the Game Plan (standalone or folder item, owned or coach-shared), the detail dialog shows a destructive **Delete Activity** button with a confirmation prompt.

Per type:

| Source | Action | Coach notified? |
|---|---|---|
| Own standalone custom activity | Soft-delete template (Recently Deleted, restorable 30 days) — already works | n/a |
| Coach-sent standalone activity (accepted) | Soft-delete template + insert `coach_notifications` row (`activity_removed`) — already works | Yes |
| Item inside your own folder | Hard-delete the `activity_folder_items` row (folders aren't part of Recently Deleted) | n/a |
| Item inside a coach-shared folder you accepted | Remove only your copy from your Game Plan (decline the assignment so it disappears for you), and notify the coach who shared the folder | Yes |

Confirmation copy adapts:
- Own folder item: *"Remove this item from the folder? This can't be undone."*
- Coach-shared folder item: *"Remove this folder from your Game Plan? {coachName} will be notified."*
- Own standalone: existing copy ("moved to Recently Deleted… 30 days").
- Coach-sent standalone: existing copy ("the coach who sent it will be notified").

### Technical changes

**1. `src/components/GamePlanCard.tsx`**

- Standalone path (~2450): drop the `!selectedCustomTask?.folderItemData` guard from `onDeleteActivity` — the standalone branch never has `folderItemData`, so the guard was just dead defensiveness, but keep `taskType === 'custom'` and the template id check.
- Folder-snapshot path (~3078) and raw-fields path (~3269): wire `onDeleteActivity` on both `CustomActivityDetailDialog` mounts. Implementation is shared, so factor it into a local helper inside the component:

  ```ts
  const buildFolderItemDeleteHandler = (task: GamePlanTask) => async () => {
    const fid = task.folderItemData;
    if (!fid) return;
    const isOwnFolder = fid.isOwner;

    if (isOwnFolder) {
      // Hard delete the item from the folder (RLS allows owner)
      const { error } = await supabase
        .from('activity_folder_items')
        .delete()
        .eq('id', fid.itemId);
      if (error) { toast.error(t('common.error')); return; }
    } else {
      // Coach-shared folder: decline the assignment so it leaves the player's plan
      const { data: assignment } = await supabase
        .from('folder_assignments')
        .select('id, sender_id, folder_id')
        .eq('recipient_id', user!.id)
        .eq('folder_id', fid.folderId /* add to folderItemData */)
        .eq('status', 'accepted')
        .maybeSingle();

      if (assignment) {
        await supabase
          .from('folder_assignments')
          .update({ status: 'declined' })
          .eq('id', assignment.id);

        // Notify the coach
        await supabase.from('coach_notifications').insert({
          coach_user_id: assignment.sender_id,
          sender_user_id: user!.id,
          notification_type: 'folder_removed',
          title: `${playerName} removed a folder from their Game Plan`,
          message: `"${fid.folderName}" • Removed ${new Date().toLocaleString()}`,
        });
      }
    }

    handleFolderLoggerClose(false);
    refetch();
    toast.success(t('customActivity.detail.removed', 'Removed from your Game Plan'));
  };
  ```

  Pass `onDeleteActivity={buildFolderItemDeleteHandler(selectedFolderTask)}` into both folder-path `CustomActivityDetailDialog` instances. Pass `isCoachSent={!fid.isOwner}` and `coachName` (look up via `useReceivedFolders` assignments cache, fallback to "your coach").

- Add `folderId` to `folderItemData` (small extension in `useGamePlan.ts`) so we can find the assignment to decline. The data is already available where `folderItemData` is built (line ~1615) — `folder.id`.

**2. `src/hooks/useGamePlan.ts`**

Extend `folderItemData` with `folderId: string` (line ~1615 area and the type definition near line 69). Also, when filtering tasks for the Game Plan (~line 622–650 where `folder_assignments` are read), ignore assignments with `status = 'declined'` so removed coach folders don't reappear (verify this — likely already the case, but assert it).

**3. `src/components/CustomActivityDetailDialog.tsx`**

Add an optional `deleteVariant?: 'standalone' | 'folder-own' | 'folder-coach'` prop (default `'standalone'`). Use it to pick the correct AlertDialog title/description:

- `standalone` + `isCoachSent`: existing copy.
- `standalone` + not coach-sent: existing copy.
- `folder-own`: "Remove this item from the folder? This can't be undone."
- `folder-coach`: "Remove this folder from your Game Plan? {coachName} will be notified."

The existing destructive button + AlertDialog stay; only the copy branches.

**4. `src/components/coach/CollaborativeWorkspace.tsx`**

Add a render branch for `notification_type === 'folder_removed'` mirroring the existing `activity_removed` styling (red accent, "removed a folder").

### Out of scope

- No DB migrations. `coach_notifications.notification_type` is a free-text column; `folder_removed` is additive.
- No change to Recently Deleted UI — folder items are not added there (they use hard delete or assignment decline).
- No change to the pending coach-folder Accept/Decline flow.
- No Undo for folder-item deletion in this pass (folder items don't have a soft-delete column). Standalone Undo continues to work as today.

### Files to edit

- `src/components/GamePlanCard.tsx` — wire delete on both folder dialog mounts; drop dead guard on standalone path.
- `src/hooks/useGamePlan.ts` — add `folderId` to `folderItemData`; verify declined assignments are excluded.
- `src/components/CustomActivityDetailDialog.tsx` — add `deleteVariant` and folder-aware confirm copy.
- `src/components/coach/CollaborativeWorkspace.tsx` — render `folder_removed` notifications.
