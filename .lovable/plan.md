
# E2E Directive -- Tee Visual + Bidirectional Coach Linking System

## Overview

This plan covers three major areas: (1) Tee depth visual overhaul with real home plate rendering, (2) bidirectional coach-player relationship system replacing the current one-way follow model, and (3) rep confirmation UX polish with visual feedback.

---

## Part 1: Tee Depth Grid with Home Plate Visual

### Current State
`TeeDepthGrid.tsx` is a plain column of 5 abstract buttons labeled F2/F1/Plate/B1/B2. No home plate visual. No handedness awareness.

### Changes

**File: `src/components/practice/TeeDepthGrid.tsx`** -- Full rewrite

Render a top-down view showing:
- A white pentagon home plate SVG centered at depth position 3 (Plate)
- 5 depth rows extending vertically: 2 in front of plate (toward pitcher), plate line, 2 behind plate (toward catcher)
- Each depth row is a tappable rectangular zone
- The plate pentagon is rendered as an inline SVG overlay at the center row
- Labels: "Toward Pitcher" at top, "Toward Catcher" at bottom
- Selected depth square highlights with primary color ring
- Sport prop controls plate shape:
  - Baseball: standard 17-inch pentagon
  - Softball: proportional softball plate (slightly different visual)

Accept new props:
- `sport: 'baseball' | 'softball'`
- `batterSide: 'L' | 'R'` -- mirrors horizontal orientation labels (though depth itself is front-to-back, the layout context flips to match the batter's perspective)

**File: `src/components/practice/RepScorer.tsx`** -- Update TeeDepthGrid usage
- Pass `sport` and `batterSide={handedness}` to TeeDepthGrid
- Layout remains: PitchLocationGrid (5x5 horizontal) on left, TeeDepthGrid (5x1 depth with plate) on right
- Both selections mandatory for tee reps

---

## Part 2: Rep Confirmation Visual Feedback

### Current State
Rep confirmation exists (Confirm Rep button), but no visual feedback animation after commit.

### Changes

**File: `src/components/practice/RepScorer.tsx`**
- After `commitRep()` succeeds, show a brief animated checkmark overlay (framer-motion scale-in/out, ~600ms)
- Rep count badge updates with a subtle pulse animation
- Session summary line updates live showing latest rep stats
- The existing "Rep will be recorded manually once you confirm all required fields" text stays

---

## Part 3: Bidirectional Coach-Player Relationship System

### Current State
- `scout_follows` table exists with `scout_id`, `player_id`, `status` columns
- RLS policies allow coaches and scouts to create follows; players can accept/reject
- `CoachDashboard.tsx` uses edge functions (`get-following-players`, `search-players`, `send-follow-request`, `unfollow-player`) for the current one-way follow system
- No `coach_player_relationships` table exists
- No player-initiated coach connection flow exists
- Coach linking in sessions uses `athlete_mpi_settings.primary_coach_id` (manual field, no mutual consent)

### Solution: Upgrade `scout_follows` to full bidirectional relationship

Rather than creating a brand new table, we upgrade the existing `scout_follows` table with new columns to support bidirectional linking. This avoids breaking the existing coach dashboard and edge functions.

**Database Migration:**

```sql
-- Add bidirectional fields to scout_follows
ALTER TABLE public.scout_follows
  ADD COLUMN IF NOT EXISTS initiated_by text DEFAULT 'coach',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS relationship_type text DEFAULT 'follow';
  -- relationship_type: 'follow' (view-only) or 'linked' (full access)
```

New RLS policy for player-initiated requests:
```sql
-- Players can create follow requests (player-initiated linking)
CREATE POLICY "Players can create link requests"
ON public.scout_follows FOR INSERT
WITH CHECK (
  auth.uid() = player_id
  AND initiated_by = 'player'
);
```

**Relationship Types:**
- `follow` = public visibility only (existing behavior, lighter)
- `linked` = full permission access (sessions, micro data, overrides, notes)

### New Component: `src/components/connections/ConnectionsTab.tsx`

Dedicated "Connections" section accessible from player profile/settings:
- **My Coaches**: list of active linked coaches with "Revoke" option
- **Pending Requests**: incoming coach link requests to accept/reject, outgoing player requests pending coach acceptance
- **Search Coach**: search by name to send link request

### New Component: `src/components/connections/CoachSearchConnect.tsx`

Player-side coach search:
- Search coaches by name (queries `profiles_public` filtered by coach role)
- Send link request (creates `scout_follows` row with `initiated_by = 'player'`, `relationship_type = 'linked'`, `status = 'pending'`)
- Coach receives in their dashboard under "Pending Invites"

### Updated Edge Functions

**`supabase/functions/send-follow-request/index.ts`** -- Modified
- Accept optional `initiated_by` and `relationship_type` params
- Support player-to-coach direction (player sends, coach confirms)
- Validate that target user has appropriate role (coach role for player-initiated)

**`supabase/functions/get-following-players/index.ts`** -- Modified
- Return `relationship_type` and `initiated_by` fields
- Filter by `status = 'accepted'` for active relationships

**New: `supabase/functions/get-coach-connections/index.ts`**
- Player-facing: returns all coach relationships (active, pending) for the authenticated player
- Used by ConnectionsTab

### Permission Enforcement

**File: `src/components/practice/SessionConfigPanel.tsx`** -- Modified
- When coach session type is 'coached' or 'lesson':
  - Only show coaches with `relationship_type = 'linked'` AND `status = 'accepted'`
  - Do not allow selecting coaches who only have `follow` relationship

**Coach Dashboard session visibility:**
- Coaches with `relationship_type = 'linked'` can see full session data (micro-layer, heat maps, all reps)
- Coaches with `relationship_type = 'follow'` can see basic session logged info only (count, date, type)
- No relationship = no visibility

---

## Part 4: Coach Dashboard Upgrade

### File: `src/pages/CoachDashboard.tsx` -- Modified

Add new sections:
- **Pending Invites tab**: shows player-initiated link requests for coach to accept/reject
- **Session Feed**: chronological list of linked player sessions (not just follow list)
  - Filterable by: player, season type, rep source, date range
  - Click session to expand and see: config, distance, velocity, rep source, all reps, tee depth rendered visually
- **Player MPI Trend**: small sparkline per player showing recent MPI movement
- **Coach Actions on Session**:
  - Add note (text input, saved to `player_notes`)
  - Submit override grade (20-80 scale, immutable via existing trigger)
  - Mark as verified (sets `coach_override_applied = true`)

### New: `src/components/coach/SessionFeed.tsx`

Component that fetches `performance_sessions` for all linked players and renders a filterable feed:
- Uses existing `performance_sessions` table
- RLS: coaches access via a new security definer function that checks active linked relationship
- Each session card shows: date, module, rep source, distance, rep count, session type, coach verified badge

### New: `src/components/coach/SessionDetailView.tsx`

Expanded session view for coaches:
- Full rep list with execution scores
- Tee depth grid rendered (read-only) showing selected positions
- 5x5 pitch location grid rendered with rep positions highlighted
- Override grade input (if not already overridden)
- Notes input

---

## Part 5: Security & RLS

### New Security Definer Function
```sql
CREATE OR REPLACE FUNCTION public.is_linked_coach(p_coach_id uuid, p_player_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scout_follows
    WHERE scout_id = p_coach_id
      AND player_id = p_player_id
      AND status = 'accepted'
      AND relationship_type = 'linked'
  )
$$;
```

### New RLS Policy for Session Visibility
```sql
-- Linked coaches can view their players' sessions
CREATE POLICY "Linked coaches can view player sessions"
ON public.performance_sessions FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_linked_coach(auth.uid(), user_id)
  OR public.has_role(auth.uid(), 'owner')
);
```

---

## Part 6: MPI Integration

Already implemented via `ENGINE_CONTRACT.ts`:
- `COACH_VERIFIED_INTEGRITY_BONUS: 3`
- `COACH_VERIFIED_WEIGHT_BONUS: 1.05`

Additional validation: the `apply_coach_override_to_session` trigger already writes back to `performance_sessions`. We add a check that the coach has an active linked relationship before allowing the override insert.

### Updated RLS on `coach_grade_overrides`:
```sql
-- Only linked coaches can submit overrides
CREATE POLICY "Linked coaches can insert overrides"
ON public.coach_grade_overrides FOR INSERT
WITH CHECK (
  public.is_linked_coach(auth.uid(), (
    SELECT user_id FROM public.performance_sessions WHERE id = session_id
  ))
);
```

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/connections/ConnectionsTab.tsx` | Player view: linked coaches, pending requests, revoke |
| `src/components/connections/CoachSearchConnect.tsx` | Player search to find and request coach |
| `src/components/coach/SessionFeed.tsx` | Chronological session feed for coach dashboard |
| `src/components/coach/SessionDetailView.tsx` | Expanded session view with rep details |
| `supabase/functions/get-coach-connections/index.ts` | Player-facing coach relationship API |

### Modified Files
| File | Change |
|------|--------|
| `src/components/practice/TeeDepthGrid.tsx` | Full rewrite with home plate SVG, sport/handedness props |
| `src/components/practice/RepScorer.tsx` | Pass sport/handedness to TeeDepthGrid, add commit animation |
| `src/components/practice/SessionConfigPanel.tsx` | Filter coach list to linked-only for coached/lesson sessions |
| `src/pages/CoachDashboard.tsx` | Add pending invites, session feed, player MPI trend |
| `supabase/functions/send-follow-request/index.ts` | Support bidirectional + relationship_type |
| `supabase/functions/get-following-players/index.ts` | Return relationship_type field |

### Database Changes
- Add columns to `scout_follows`: `initiated_by`, `confirmed_at`, `relationship_type`
- New RLS policy: players can create link requests
- New security definer function: `is_linked_coach()`
- New RLS policy on `performance_sessions` for linked coach read access
- New RLS policy on `coach_grade_overrides` for linked coach insert

### No New Tables Created
The existing `scout_follows` table is extended rather than creating a parallel `coach_player_relationships` table, avoiding data duplication and preserving all existing edge functions.

---

## Execution Order

1. Database migration (add columns + RLS + security definer function)
2. TeeDepthGrid rewrite with plate visual (independent)
3. RepScorer commit animation (independent)
4. Edge function updates for bidirectional linking
5. ConnectionsTab + CoachSearchConnect components
6. CoachDashboard upgrade (session feed, detail view, pending invites)
7. SessionConfigPanel linked-coach filter
8. Integration testing
