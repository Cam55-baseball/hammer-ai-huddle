

# Deduplicate Custom Activities That Exist in Folders

## Problem

When a user has a custom activity (e.g., "Morning Supplements") AND the same activity exists inside a folder (e.g., "Before Work"), both appear on the Game Plan as separate items. The user wants the folder version to take priority, hiding the standalone custom activity.

## Matching Strategy

A custom activity is considered a duplicate of a folder item when their titles match (case-insensitive, trimmed). This is the safest heuristic since:
- Folder items created via "Import from Activities" copy the title exactly
- Folder items created via the builder with the same name are intentionally the same activity
- There's no direct `template_id` foreign key linking folder items back to custom activity templates

## Changes

### File: `src/hooks/useGamePlan.ts`

**Where**: At lines 1231-1248, where custom activities are pushed into the `tasks` array.

**What**: Before iterating over `customActivities`, build a Set of folder item titles (lowercased, trimmed) from the already-built `folderTasks` array. Then, when iterating custom activities, skip any whose title matches a folder item title.

```text
// Collect folder item titles for deduplication
const folderItemTitles = new Set(
  folderTasks.map(ft => ft.item.title.trim().toLowerCase())
);

// Add custom activities, skipping duplicates that exist in folders
customActivities.forEach(activity => {
  const title = activity.template.title.trim().toLowerCase();
  if (folderItemTitles.has(title)) return; // folder version takes priority

  // ... existing task push logic unchanged
});
```

This is a 3-line addition. No other files need to change.

### Behavior

- Folder version always wins -- it shows with its folder context (color, icon, folder name label)
- If the user removes the activity from the folder, the custom activity reappears automatically on next refresh
- Completion data stays independent: folder completions go to `folder_item_completions`, custom activity completions go to `custom_activity_logs`
- The `refreshCustomActivities` lightweight refresh path (line 773) also needs the same filter applied using the current `folderTasks` state

### File: `src/hooks/useGamePlan.ts` (refreshCustomActivities)

Also apply the same dedup in `refreshCustomActivities` (line 773-801) so the filter persists after quick refreshes. Use the current `folderTasks` state variable (already in scope via closure) to build the same title Set.

### Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useGamePlan.ts` | Add ~6 lines: build folder title Set, skip matching custom activities in both `fetchTaskStatus` and `refreshCustomActivities` |

