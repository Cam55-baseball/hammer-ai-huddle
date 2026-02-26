

# Show Folder Activities on the Game Plan (Player-Created + Coach-Assigned)

## Overview
Folder items from both player-created folders and coach-assigned (accepted) folders are currently invisible on the Game Plan. This plan integrates them so they appear as checkable tasks grouped by folder, with daily completion tracking.

---

## Changes

### 1. `src/hooks/useGamePlan.ts` -- Fetch folder items for today

Inside `fetchTaskStatus` (after the custom activities section around line 535), add a new block that:

- Queries `activity_folders` where `owner_id = user.id` AND `owner_type = 'player'` AND `sport = selectedSport` AND `status = 'active'` (player's own folders)
- Queries `folder_assignments` where `recipient_id = user.id` AND `status = 'accepted'`, then fetches the associated `activity_folders` (coach-assigned folders)
- For all active folders, fetches their `activity_folder_items`
- Filters items to today using: `assigned_days` includes today's day-of-week (0-6), OR `specific_dates` includes today's date string, OR both are null (always show)
- Queries `folder_item_completions` for `user_id = user.id` AND `entry_date = today` to get completion status
- Stores results in a new `folderTasks` state array

New state and types:
- Add `FolderGamePlanTask` interface: `{ folderId, folderName, folderColor, folderIcon, placement, item: ActivityFolderItem, completed: boolean, completionId?: string }`
- Add `folderTasks` state, returned from the hook
- Add `toggleFolderItemCompletion(itemId)` function that inserts/updates `folder_item_completions`

### 2. `src/hooks/useGamePlan.ts` -- Inject folder items into tasks list

At the bottom of the hook (around line 984, after custom activities are pushed), iterate `folderTasks` and push each as a `GamePlanTask` with:
- `id: 'folder-item-{item.id}'`
- `taskType: 'custom'` (reuses existing custom styling)
- `section: 'custom'` (appears in the custom activities section)
- `titleKey: item.title`
- `descriptionKey: folderName` (shows parent folder name as subtitle)
- `badge: folder placement label` (e.g., "Before Workout")
- A new `folderItemData` field on `GamePlanTask` interface to distinguish folder items from regular custom activities

### 3. `src/hooks/useGamePlan.ts` -- Return new values

Update the return object to include:
- `folderTasks`
- `toggleFolderItemCompletion`

### 4. `src/components/GamePlanCard.tsx` -- Handle folder item completion

- Destructure `folderTasks` and `toggleFolderItemCompletion` from `useGamePlan`
- In the task click handler, detect folder items via `task.folderItemData` and call `toggleFolderItemCompletion` instead of the custom activity toggle
- Folder items render with the folder's color as accent, using the existing task card UI

### 5. `GamePlanTask` interface update

Add an optional field to the existing interface:
```text
folderItemData?: {
  folderId: string;
  folderName: string;
  folderColor: string;
  itemId: string;
  placement: string;
}
```

---

## Technical Details

### Day filtering logic

```text
todayDow = getDay(new Date())    // 0-6
todayDate = getTodayDate()        // YYYY-MM-DD

Show item if:
  item.assigned_days includes todayDow
  OR item.specific_dates includes todayDate
  OR (assigned_days is null AND specific_dates is null)
```

### Data sources for folders

```text
Player folders:  activity_folders WHERE owner_id=user AND owner_type='player' AND status='active'
Coach folders:   folder_assignments WHERE recipient_id=user AND status='accepted'
                 --> JOIN activity_folders on folder_id
Items:           activity_folder_items WHERE folder_id IN (all active folder IDs)
Completions:     folder_item_completions WHERE user_id=user AND entry_date=today
```

### Completion toggle

Reuses the same logic from `useReceivedFolders.toggleCompletion`:
- Check if row exists in `folder_item_completions` for (item_id, user_id, entry_date)
- If exists: flip `completed` boolean
- If not: insert new row with `completed = true`

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useGamePlan.ts` | Fetch folder items from both sources, filter by today, check completions, push as tasks, return toggle function |
| `src/components/GamePlanCard.tsx` | Handle folder item clicks with completion toggle, show folder color accent |

