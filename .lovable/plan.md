

# UI State Persistence — Activity Dialog Survives Refresh

## Problem
`detailDialogOpen` and `selectedCustomTask` are ephemeral `useState` in `GamePlanCard.tsx`. Any refresh, crash, or re-render that unmounts the component loses the open dialog state.

## Solution — URL Search Params (Option A)

Use `?activityId=custom-{templateId}` on the Dashboard URL. On mount, if the param exists, find the matching task and reopen the dialog. On close, clear the param.

This also covers folder items (`folderLoggerOpen` + `selectedFolderTask`) using `?folderId={itemId}`.

## Changes

### `src/components/GamePlanCard.tsx`

**On task click (line ~520-523):**
When opening the detail dialog, also update the URL:
```typescript
setSelectedCustomTask(task);
setDetailDialogOpen(true);
const params = new URLSearchParams(window.location.search);
params.set('activityId', task.id);
window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
```

**On dialog close:**
Clear the URL param whenever `detailDialogOpen` becomes false:
```typescript
const handleDetailClose = (open: boolean) => {
  setDetailDialogOpen(open);
  if (!open) {
    setSelectedCustomTask(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('activityId');
    window.history.replaceState({}, '', window.location.pathname);
  }
};
```

**On mount — restore from URL (new useEffect):**
After tasks load, check URL for `activityId`:
```typescript
useEffect(() => {
  if (loading || !tasks.length) return;
  const params = new URLSearchParams(window.location.search);
  const activityId = params.get('activityId');
  if (!activityId) return;
  
  const allTasks = [...tasks, ...customActivities];
  const match = allTasks.find(t => t.id === activityId);
  if (match?.taskType === 'custom' && match.customActivityData) {
    setSelectedCustomTask(match);
    setDetailDialogOpen(true);
    toast.info("Resuming your last activity");
  } else {
    // Stale ID — clear it
    params.delete('activityId');
    window.history.replaceState({}, '', window.location.pathname);
  }
}, [loading, tasks, customActivities]);
```

**Same pattern for folder items** using `?folderItemId=` param.

### Wire up the close handler
Replace `onOpenChange={setDetailDialogOpen}` (line ~1959) with `onOpenChange={handleDetailClose}`.

Also clear URL param on Skip action (line ~2128) and Edit action (line ~1971).

## Files Changed

| File | Change |
|------|--------|
| `src/components/GamePlanCard.tsx` | Add URL param persistence for detail dialog open/close/restore |

## What This Does NOT Do
- No new routes or pages
- No new dependencies
- No database changes
- No changes to auth logic

