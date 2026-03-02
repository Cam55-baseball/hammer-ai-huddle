

# Enhanced Player Organization View

## Problem
After a player joins a team via invite code, they see only a static card saying "Member of [Team Name]" with no useful information, no visibility into teammates, and no team context.

## Solution
Replace the bare membership card with a richer player-facing view that shows team info, teammates, the player's own standing, and a way to leave.

## Changes

### `src/pages/OrganizationDashboard.tsx`
Replace the minimal `membership` block (lines 74-80) with a new `PlayerOrganizationView` component that receives the membership data and org name.

### New file: `src/components/organization/PlayerOrganizationView.tsx`
A dedicated component for the player's organization experience with these sections:

**1. Team Info Header**
- Organization name, sport, and member count
- Fetched by querying `organizations` using the membership's `organization_id`

**2. Your Status Card**
- Player's own latest MPI integrity score (from `mpi_scores`)
- Last session date and module (from `performance_sessions`)
- Their role in the org (player/captain/etc.)

**3. Teammates List**
- Query `organization_members` for the same org, then `profiles_public` for names/avatars
- Show a simple list of teammates with name, avatar, and position
- Exclude the current user from the list
- No link status or coach-specific data shown (players don't need that)

**4. Leave Organization Button**
- Confirmation dialog before leaving
- Deletes the player's row from `organization_members`
- Invalidates relevant queries and shows a toast

### `src/hooks/usePlayerOrganization.ts`
- Also return the `organization_id` from the membership query (it's already fetched, just not exposed cleanly)

## Technical Details

### PlayerOrganizationView queries
```tsx
// 1. Get org details
const { data: org } = await supabase
  .from('organizations')
  .select('id, name, sport, org_type')
  .eq('id', organizationId)
  .single();

// 2. Get teammates
const { data: members } = await supabase
  .from('organization_members')
  .select('user_id, role_in_org')
  .eq('organization_id', organizationId)
  .eq('status', 'active');

const { data: profiles } = await supabase
  .from('profiles_public')
  .select('id, full_name, avatar_url, position')
  .in('id', memberUserIds);

// 3. Get player's own latest stats
const { data: myScore } = await supabase
  .from('mpi_scores')
  .select('integrity_score, calculation_date')
  .eq('user_id', currentUserId)
  .order('calculation_date', { ascending: false })
  .limit(1)
  .maybeSingle();

const { data: myLastSession } = await supabase
  .from('performance_sessions')
  .select('session_date, module')
  .eq('user_id', currentUserId)
  .order('session_date', { ascending: false })
  .limit(1)
  .maybeSingle();
```

### Leave organization
```tsx
const leaveOrg = async () => {
  await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', user.id);
  queryClient.invalidateQueries({ queryKey: ['player-orgs'] });
};
```

### Files to create
- `src/components/organization/PlayerOrganizationView.tsx`

### Files to modify
- `src/pages/OrganizationDashboard.tsx` (swap minimal card for new component)
- `src/hooks/usePlayerOrganization.ts` (expose `organization_id` cleanly)

### No database changes needed
All data is already available via existing tables and RLS policies.

