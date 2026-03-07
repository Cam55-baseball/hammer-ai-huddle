

# Fix: Coach Schedule Dialog RLS Error

## Root Cause

The coach has two accepted relationships:
- **Cam Williams** — `relationship_type: 'linked'` (works with RLS)
- **Reagan Niederhaus** — `relationship_type: 'follow'` (blocked by RLS)

The `CoachScheduleDialog` receives all `accepted` players regardless of relationship type, but the RLS INSERT policy uses `is_linked_coach()` which requires `relationship_type = 'linked'`.

## Solution

**Option A (recommended)**: Update the RLS INSERT policy to also allow coaches with `follow` relationship type to schedule sessions. This is more flexible and aligns with how coaches interact with followed players.

**Option B**: Filter the `linkedPlayers` prop in `CoachDashboard.tsx` to only include `relationship_type === 'linked'` players.

I recommend **both**: broaden the RLS policy AND also update the UI filter so the dialog clearly separates linked vs followed players.

### Changes

| File | Change |
|------|--------|
| DB migration | Update `is_linked_coach` function OR create new INSERT policy that accepts both `linked` and `follow` relationship types |
| `src/pages/CoachDashboard.tsx` (line 694) | Add `relationship_type` filter: `.filter(p => p.followStatus === 'accepted' && p.relationship_type === 'linked')` |

### Technical Detail

**RLS policy update** — modify the `is_linked_coach` function to also accept `follow`:
```sql
CREATE OR REPLACE FUNCTION public.is_linked_coach(p_coach_id uuid, p_player_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scout_follows
    WHERE scout_id = p_coach_id
      AND player_id = p_player_id
      AND status = 'accepted'
      AND relationship_type IN ('linked', 'follow')
  )
$$;
```

Alternatively, keep `is_linked_coach` strict and only fix the UI filter — depends on whether coaches should be able to schedule for followed (non-linked) players.

