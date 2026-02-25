

# Coach & Scout Game Plan View

## Problem

Currently, when coaches or scouts log into the main `/dashboard`, they see the `ScoutGamePlanCard` which **only** shows pending video reviews. This is not a proper "game plan" -- it's just one small slice of their daily workflow. Coaches and scouts need a comprehensive daily task overview tailored to their role, similar in spirit to how players have a full `GamePlanCard` with multiple task categories.

## Solution

Replace the current `ScoutGamePlanCard` with a new `CoachScoutGamePlanCard` component that aggregates all relevant daily tasks for coaches and scouts into a single, actionable game plan view on the main dashboard.

---

## Game Plan Sections

The new card will display the following task sections, each with a count and quick-action links:

### 1. Video Reviews (existing)
- Pull from `useScoutGamePlan` hook (already built)
- Show count of unreviewed videos per player
- Click navigates to `/scout-dashboard?viewPlayer={id}`

### 2. Player Notes
- Query `player_notes` for notes written today by the current user
- Show count of notes written today vs total followed players
- Quick link: "Write Notes" navigates to the scout/coach dashboard's Player Notes section

### 3. Pending Folder Assignments (Coach only)
- Query `folder_assignments` for assignments sent by the coach that are still `pending`
- Show count of pending assignments awaiting player acceptance
- Quick summary of which players haven't accepted yet

### 4. Players Following Summary
- Show total count of followed players (accepted status)
- Quick link to scout/coach dashboard

### 5. Quick Actions Row
- "Go to Scout Hub" / "Go to Coach Hub" button linking to `/scout-dashboard` or `/coach-dashboard`
- "View Player Profiles" button
- "Write Player Notes" button

---

## Changes

### 1. New Component: `CoachScoutGamePlanCard`

**File: `src/components/CoachScoutGamePlanCard.tsx`**

A comprehensive game plan card that:
- Accepts an `isCoach` boolean prop to conditionally show coach-specific sections (sent activities, folder assignments)
- Uses the existing `useScoutGamePlan` hook for video review data
- Queries `player_notes` for today's note count
- Queries `folder_assignments` for pending count (coach only)
- Receives `followingCount` as a prop from the dashboard (already loaded there)
- Displays a progress summary at the top (tasks completed today)
- Each section is a clickable task row that navigates to the relevant area
- Keeps the cyan athletic styling from the existing `ScoutGamePlanCard`
- Shows the date header, progress ring, and task sections

### 2. Update Dashboard

**File: `src/pages/Dashboard.tsx`**

- Replace `ScoutGamePlanCard` import with `CoachScoutGamePlanCard`
- Pass `isCoach` and `isScout` props from the existing `useScoutAccess` hook
- The conditional on line 430 stays the same pattern: `(isScout || isCoach) && !isOwner && !isAdmin`

### 3. Keep Existing `ScoutGamePlanCard`

The old `ScoutGamePlanCard` can remain as-is (it's not imported elsewhere). No deletion needed.

---

## Technical Details

### Data Fetching (inside CoachScoutGamePlanCard)

**Today's notes count:**
```sql
SELECT count(*) FROM player_notes
WHERE author_id = auth.uid()
  AND created_at::date = CURRENT_DATE
```

**Pending folder assignments (coach only):**
```sql
SELECT count(*) FROM folder_assignments
WHERE sender_id = auth.uid()
  AND status = 'pending'
```

**Following count:** Passed as a prop -- already fetched by Dashboard or derived from the scout access context. Alternatively, a quick query:
```sql
SELECT count(*) FROM follow_requests
WHERE follower_id = auth.uid()
  AND status = 'accepted'
```

### Files Created

| File | Purpose |
|------|---------|
| `src/components/CoachScoutGamePlanCard.tsx` | Comprehensive game plan for coaches and scouts |

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Import and render `CoachScoutGamePlanCard` instead of `ScoutGamePlanCard` |

### No Database Changes Required

All data sources already exist (`player_notes`, `folder_assignments`, `follow_requests`, and the `get-scout-pending-reviews` edge function).

