

# Team Roster Hub: Unified Coach Team Management

## Problem
Coaches managing full teams currently see a flat, ungrouped list of players on the Coach Dashboard. The Organization Dashboard exists but has placeholder data and no connection to the coach's actual linked players or their performance data. There's no single view where a coach can see their entire roster organized by position, with key stats, compliance, and quick actions.

## Solution
Build a **Team Roster** tab on the Organization Dashboard that bridges the organization membership data with the coach's linked player data, providing a comprehensive roster view with real performance metrics.

### Phase 1: Wire Organization Dashboard to Real Data

**1. Connect Organization members to coach's linked players**

Create a new `TeamRosterView` component that:
- Fetches all organization members (from `organization_members`)
- Cross-references with `scout_follows` to determine link status
- Pulls profile data (name, avatar, position, grad year) from `profiles_public` and `athlete_profiles`
- Groups players by position (pitchers, catchers, infielders, outfielders, utility)

**2. Populate TeamComplianceCard with real data**

Update the Organization Dashboard overview to compute actual metrics:
- **Avg Integrity**: Average MPI score across org members (from `athlete_mpi_settings` or `performance_sessions`)
- **Coach Validated %**: Percentage of sessions with `coach_override_applied = true`
- **Active Members**: Count from `organization_members` where status = 'active'
- **Flagged**: Players with sessions that have no coach verification in 7+ days

### Phase 2: Team Roster View Component

**New file: `src/components/organization/TeamRosterView.tsx`**

A sortable, filterable roster table showing:
- Player name and avatar
- Position(s) (from `athlete_profiles`)
- Connection status (linked / follow-only / not connected)
- Last session date and module
- MPI score (if available)
- Quick actions: View Profile, View Sessions, Send Activity

Features:
- Group-by-position toggle (card grid vs. table view)
- Sort by name, position, last activity, MPI
- Filter by position group, connection status
- Bulk select for sending activities (reuse existing `BulkSendDialog`)
- "Not yet connected" indicator for org members who haven't accepted a coach link

### Phase 3: Add Roster Tab and Bridge Coach Dashboard

**Update `src/pages/OrganizationDashboard.tsx`:**
- Add a "Roster" tab between Overview and Members
- Wire the TeamComplianceCard to fetch real aggregated data via a new `useTeamStats` hook
- Add a "Quick Actions" section: bulk invite remaining unlinked members, send team-wide activities

**New file: `src/hooks/useTeamStats.ts`**

A hook that computes team-level aggregates:
- Fetches recent `performance_sessions` for all org member user IDs
- Computes avg integrity, coach validation %, flagged count
- Returns loading/error states

**Update Coach Dashboard sidebar/navigation:**
- Add a link to the Organization Dashboard from the Coach Dashboard for coaches who own an org
- Show a "Team" badge or count in the nav

## Technical Details

### Data Flow
```text
organization_members (org membership)
        |
        v
scout_follows (coach-player link status)
        |
        v
profiles_public + athlete_profiles (player details)
        |
        v
performance_sessions (session data for stats)
```

### TeamRosterView query strategy
```tsx
// 1. Get org members
const { data: members } = await supabase
  .from('organization_members')
  .select('user_id, role_in_org, status')
  .eq('organization_id', orgId)
  .eq('status', 'active');

// 2. Get profiles for those members
const { data: profiles } = await supabase
  .from('profiles_public')
  .select('id, full_name, avatar_url')
  .in('id', memberIds);

// 3. Get athlete details (position, etc.)
const { data: athleteProfiles } = await supabase
  .from('athlete_profiles')
  .select('user_id, primary_position, secondary_positions, graduation_year')
  .in('user_id', memberIds);

// 4. Check link status with coach
const { data: follows } = await supabase
  .from('scout_follows')
  .select('player_id, status, relationship_type')
  .eq('scout_id', coachUserId)
  .in('player_id', memberIds);

// 5. Get last session per player
const { data: sessions } = await supabase
  .from('performance_sessions')
  .select('user_id, session_date, module, coach_override_applied')
  .in('user_id', memberIds)
  .order('session_date', { ascending: false });
```

### useTeamStats hook
```tsx
// Aggregates across all org member sessions
{
  avgIntegrity: number;        // from MPI data
  coachValidationPct: number;  // % sessions with coach_override_applied
  activeMemberCount: number;   // active org members
  flaggedCount: number;        // players with no verified session in 7 days
}
```

### Files to create
- `src/components/organization/TeamRosterView.tsx` -- main roster component
- `src/hooks/useTeamStats.ts` -- team-level aggregation hook

### Files to modify
- `src/pages/OrganizationDashboard.tsx` -- add Roster tab, wire real stats
- `src/components/organization/TeamComplianceCard.tsx` -- no structural changes needed (already accepts props)

### No database changes needed
All required data already exists in `organization_members`, `scout_follows`, `profiles_public`, `athlete_profiles`, and `performance_sessions`. Existing RLS policies allow coaches to read their own connections and org data.

