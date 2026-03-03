

# Fix: Make Shared Activities Viewable in Collaborative Workspace

## Problem
There are two issues preventing the coach from viewing shared activities:

1. **Notifications only show when unread** -- the "New Shares" section filters to `!n.is_read`, so once marked as read (or if the coach scrolls past), the shared activity disappears entirely with no way to access it again.

2. **The "Roll Out" activity was likely shared before the `template_snapshot` column was added** -- meaning it has `null` for `template_snapshot`, and the click handler does nothing when that's null.

The main shared cards list (`filteredCards`) only shows `activity_folder_items` from folders. Standalone custom activities shared via "Send to Coach" are only stored as notifications and never appear in that list.

## Solution

### 1. Show ALL shared notifications (read + unread) as a dedicated section
Replace the unread-only filter with a full "Shared Activities" section that shows all notifications with `template_snapshot`. Unread ones get highlighted styling, but read ones remain visible and clickable.

### 2. `CollaborativeWorkspace.tsx` changes
- Remove the `!n.is_read` filter from the notification rendering section
- Show all notifications that have a `template_snapshot` as clickable items in a persistent "Shared Activities" section (below "New Shares" for unread ones without snapshots)
- Keep unread styling (highlight border) but always render the item
- Add an eye icon and click handler for all notifications with snapshots

### 3. Handle legacy notifications without snapshots
For the "Roll Out" notification that was created before `template_snapshot` existed, add a fallback: when a notification is clicked and has no snapshot, show a toast explaining the activity data isn't available and suggest the player re-share it.

| File | Change |
|------|--------|
| `src/components/coach/CollaborativeWorkspace.tsx` | Show all notifications (not just unread) as clickable items; add fallback for missing snapshots |

