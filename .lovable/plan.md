

# Fix: Crown Icon Not Appearing After Setting Head Coach

## Problem

When clicking "Set Head Coach", the mutation uses `.update()` on `athlete_mpi_settings`. If the logged-in user doesn't have a row in that table yet, the update matches 0 rows, succeeds silently, and nothing changes -- so the crown never appears.

## Solution

Change the mutation in `ConnectionsTab.tsx` from `.update()` to `.upsert()` so it creates the settings row if one doesn't exist.

## Changes

### File: `src/components/connections/ConnectionsTab.tsx`

Update the `setHeadCoachMutation` (around line 56-61):

**Before:**
```typescript
const { error } = await supabase
  .from('athlete_mpi_settings')
  .update({ primary_coach_id: coachId })
  .eq('user_id', user!.id);
```

**After:**
```typescript
const { error } = await supabase
  .from('athlete_mpi_settings')
  .upsert(
    { user_id: user!.id, primary_coach_id: coachId },
    { onConflict: 'user_id' }
  );
```

This ensures:
- If the user already has a settings row, it updates `primary_coach_id`
- If no row exists, it creates one with the `primary_coach_id` set
- The crown icon and "Head Coach" badge then appear immediately after the query re-fetches

### No other files change

The crown/badge UI code is already correct -- it just never triggers because `headCoachId` stays `null`.
