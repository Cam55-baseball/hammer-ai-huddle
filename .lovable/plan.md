

# Add "Share with Coach" Button in Folder Detail + Shared Indicator on Folder Cards

## Overview
Two features:
1. A "Share with Coach" button inside the folder detail view so players can grant coach access directly (no Connections tab detour).
2. A visual share indicator on player folder cards showing when a coach has been granted access.

## Changes

### 1. New Component: `src/components/folders/FolderShareDialog.tsx`
A small dialog that lets the player pick a linked coach and grant View or Edit access. Reuses the same `folder_coach_permissions` table logic from `FolderPermissionMatrix`.

- On open, fetch linked coaches from `scout_follows` (same query pattern as `FolderPermissionMatrix`)
- Also fetch existing permissions for this folder
- Show each coach with View/Edit radio options and a "Revoke" action for existing permissions
- Head Coach shows as "Auto - Full Access" (non-toggleable)
- Insert/update/revoke permissions via `folder_coach_permissions` table

### 2. File: `src/components/folders/FolderDetailDialog.tsx`
- Import the new `FolderShareDialog` and `Share2` icon from lucide-react
- Add `shareDialogOpen` state
- Add a "Share" button in the fixed footer (next to Edit Folder), visible only when `isOwner` is true
- Render `<FolderShareDialog>` at the bottom of the component

### 3. File: `src/components/folders/FolderCard.tsx`
- Accept a new optional prop `sharedWithCoaches?: number` (count of coaches with active permissions)
- When > 0, render a small `Share2` icon with count in the metadata row at the bottom of the card (next to dates/item count)
- Style: `<Share2 className="h-3 w-3" /> Shared (2)` in muted text

### 4. File: `src/components/folders/FolderTabContent.tsx`
- Fetch `folder_coach_permissions` for all player folders on mount (single query)
- Build a map of `folderId -> count of active permissions`
- Pass `sharedWithCoaches={permissionCounts[f.id] || 0}` to each player `FolderCard`

## Technical Details

**FolderShareDialog** query flow:
```
1. Fetch scout_follows WHERE player_id = user.id, status = 'accepted', relationship_type = 'linked'
2. Fetch profiles for those coach IDs
3. Fetch folder_coach_permissions for this folder WHERE revoked_at IS NULL
4. Fetch athlete_mpi_settings to identify head coach
5. Render coach list with permission toggles
```

**FolderCard shared indicator** (bottom metadata row):
```tsx
{sharedWithCoaches > 0 && (
  <span className="flex items-center gap-1">
    <Share2 className="h-3 w-3" />
    Shared ({sharedWithCoaches})
  </span>
)}
```

No database changes needed -- all existing tables and RLS policies support this.

