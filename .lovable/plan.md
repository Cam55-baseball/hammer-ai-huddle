

# Fix: Coach-Initiated Connections Should Be Treated as Linked

## Problem
Your coaches initiated the connection from their side, which created `scout_follows` records with `relationship_type = 'follow'`. However, the Folder Permission Matrix and Send-to-Coach dialogs only query for `relationship_type = 'linked'`, so they show "No linked coaches" even though you have two accepted coach connections.

When a player accepts a coach-initiated follow request, the relationship should be upgradeable to "linked" -- or accepted follow connections should be treated equivalently.

## Solution
Two changes:

1. **Auto-upgrade to 'linked' on accept**: When a player accepts a coach-initiated connection request, set `relationship_type` to `'linked'` (not just update the status). This makes sense because accepting a coach connection implies granting them linked-level access.

2. **Fix existing data**: Update the two existing accepted `follow` connections to `linked` so they appear immediately.

## Changes

### 1. File: `src/components/connections/ConnectionsTab.tsx` (~line 81)
In the `respondMutation`, when the player accepts a request, also set `relationship_type: 'linked'`:

```typescript
const { error } = await supabase
  .from('scout_follows')
  .update({
    status: accept ? 'accepted' : 'rejected',
    confirmed_at: accept ? new Date().toISOString() : null,
    relationship_type: accept ? 'linked' : undefined,  // upgrade on accept
  })
  .eq('id', connectionId)
  .eq('player_id', user!.id);
```

Note: We need to handle the `undefined` case -- only include `relationship_type` when accepting. We'll build the update object conditionally.

### 2. Database Migration
Update existing accepted follow-type connections to `linked`:

```sql
UPDATE public.scout_follows
SET relationship_type = 'linked'
WHERE status = 'accepted'
  AND relationship_type = 'follow';
```

This fixes the two existing records so they show up immediately in the Folder Permission Matrix and Send-to-Coach dialogs.

## Why This Is the Right Fix
- A player accepting a coach's request is an explicit trust signal -- upgrading to `linked` is appropriate
- The player-initiated "Find Coach" flow already creates `linked` connections, so this creates consistency
- The `FolderPermissionMatrix` and `SendCardToCoachDialog` correctly require `linked` status for security reasons (linked coaches get deeper data access), so we should fix the data/flow rather than loosening the filter

