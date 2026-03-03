

# Fix: Allow Coach to View Shared Custom Activities

## Problem
When a player shares a standalone custom activity, only a notification with a title string is stored in `coach_notifications`. The coach sees the notification but has no way to view the actual activity content -- there's no template data stored and no UI to display it.

## Solution

### 1. Database Migration
Add a `template_snapshot` JSONB column to `coach_notifications` to store the full activity template data when shared:

```sql
ALTER TABLE public.coach_notifications ADD COLUMN template_snapshot jsonb;
```

### 2. Update `SendCardToCoachDialog.tsx`
- Accept a new optional `templateData` prop (the full `CustomActivityTemplate` object)
- Pass the template snapshot into the `coach_notifications` insert so the coach has the full activity data

### 3. Update callers to pass template data
- **`GamePlanCard.tsx`**: Pass the template object when opening `SendCardToCoachDialog`
- **`CustomActivityDetailDialog.tsx`**: Pass the template object when opening `SendCardToCoachDialog`

### 4. Update `CollaborativeWorkspace.tsx`
- Include `template_snapshot` in the notifications query
- When a notification with `template_snapshot` is clicked, open a read-only `CustomActivityDetailDialog` showing the full activity
- Add click handling on notification items to view the shared activity

| File | Change |
|------|--------|
| DB migration | Add `template_snapshot jsonb` column to `coach_notifications` |
| `SendCardToCoachDialog.tsx` | Accept + store `templateData` in notification insert |
| `GamePlanCard.tsx` | Pass template data to `SendCardToCoachDialog` |
| `CustomActivityDetailDialog.tsx` | Pass template data to `SendCardToCoachDialog` |
| `CollaborativeWorkspace.tsx` | Query template_snapshot, add click-to-view on notifications |

