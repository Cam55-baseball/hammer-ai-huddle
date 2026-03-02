

# Allow Players to Revoke Head Coach Folder Access

## Problem
Currently, the Head Coach gets automatic, non-revocable access to all folders. The UI shows "Auto" / "Auto - Full Access" with no toggles. Players cannot restrict access on a per-folder basis.

## Solution
Make the Head Coach appear as a normal coach in the permission UI, pre-checked with Edit access by default, but fully toggleable. The database function `can_edit_folder_item` will be updated to respect explicit revocations.

## Changes

### 1. Database Migration: Update `can_edit_folder_item` function
Modify the head coach check to also verify no explicit revocation exists in `folder_coach_permissions`:

```sql
-- Head coach (primary_coach_id) UNLESS explicitly revoked for this folder
OR (
  EXISTS (
    SELECT 1 FROM public.athlete_mpi_settings ams
    WHERE ams.user_id = af.owner_id
      AND ams.primary_coach_id = p_user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.folder_coach_permissions fcp
    WHERE fcp.folder_id = af.id
      AND fcp.coach_user_id = p_user_id
      AND fcp.revoked_at IS NOT NULL
  )
)
```

### 2. `FolderPermissionMatrix.tsx`
- Remove the special "Auto" badge rendering for the head coach
- Remove the `colSpan` difference (head coach gets 1 column, others get 2)
- Render the head coach with the same View/Edit checkboxes as other coaches
- Pre-check both View and Edit if no explicit permission record exists (auto-access)
- Keep the "Head Coach" name badge for identification

### 3. `FolderShareDialog.tsx`
- Remove the `isHeadCoach` guard that prevents toggling
- Remove the "Auto - Full Access" badge
- Render the head coach with the same View/Edit/None radio controls
- Default to "edit" when no explicit permission record exists
- Keep the "Head Coach" badge label for identification

### 4. `FolderDetailDialog.tsx`
- Update the head coach auto-access check (around line 132-140) to also verify no revocation exists in `folder_coach_permissions` for the current folder

## Technical Notes
- When a player revokes the head coach, a `folder_coach_permissions` row is created with `revoked_at` set (same revocation mechanism used for other coaches)
- When a player re-grants access, the revoked row is updated or a new row is inserted
- The Head Coach badge remains visible so players know which coach is designated, even if access is revoked for a specific folder

