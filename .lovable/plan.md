

# Add Folder Links in Collaborative Workspace + MyFollowers Visibility for Coaches

## Overview
Two changes:
1. Make each item in the Collaborative Workspace clickable to open the full `FolderDetailDialog` for that folder.
2. Hide the "My Followers" sidebar link for users with the coach role, since they manage connections from their own dashboard.

## Changes

### 1. `src/components/coach/CollaborativeWorkspace.tsx`
- Import `FolderDetailDialog` and the `ActivityFolder` type
- Add state for `selectedFolderId` (string | null)
- When a shared card row is clicked, set `selectedFolderId` to that card's `folder_id`
- Fetch the full folder data (`activity_folders` row) when `selectedFolderId` is set, cast it to `ActivityFolder`
- Render `<FolderDetailDialog>` with `isOwner={false}` (coach is viewing, not owning)
- Make each card row visually clickable (cursor-pointer, hover state)
- Also add a small "Open Folder" button/icon on each row for clarity

### 2. `src/components/AppSidebar.tsx`
- Import `useScoutAccess` (already provides `isCoach`)
- Hide the "My Followers" link when `isCoach` is true (coaches manage connections from their dashboard)
- Current logic: `!isScout ? show : hide` -- update to `!isScout && !isCoach ? show : hide`

## Technical Details

**CollaborativeWorkspace folder opening:**
```tsx
// State
const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
const [selectedFolder, setSelectedFolder] = useState<ActivityFolder | null>(null);

// When selectedFolderId changes, fetch full folder
useEffect(() => {
  if (!selectedFolderId) { setSelectedFolder(null); return; }
  supabase.from('activity_folders').select('*')
    .eq('id', selectedFolderId).single()
    .then(({ data }) => setSelectedFolder(data as unknown as ActivityFolder));
}, [selectedFolderId]);

// Each card row becomes clickable
<div onClick={() => setSelectedFolderId(card.folder_id)} className="cursor-pointer hover:bg-accent/50 ...">

// Render dialog
<FolderDetailDialog
  open={!!selectedFolder}
  onOpenChange={(open) => { if (!open) { setSelectedFolderId(null); setSelectedFolder(null); }}}
  folder={selectedFolder}
  isOwner={false}
/>
```

**Sidebar update:**
```tsx
...(!isScout && !isCoach ? [{ title: t('navigation.myFollowers'), url: "/my-followers", icon: Users }] : []),
```

No database changes needed.

