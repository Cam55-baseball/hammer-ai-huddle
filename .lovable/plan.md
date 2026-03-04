

# Phase 2: Coach Scheduling for Practice Hub

## Overview

Add a `CoachScheduleDialog` component that lets coaches schedule sessions for their linked players — individually, by team, or for the whole organization. Sessions appear on both coach and player Game Plans.

## Database

No schema changes needed — the `scheduled_practice_sessions` table already has `coach_id`, `organization_id`, `team_id`, `assignment_scope`, and `created_by` columns. The existing RLS INSERT policy uses `is_linked_coach()` to allow coach inserts for players. We just need to use these fields.

## New Component: `src/components/coach/CoachScheduleDialog.tsx`

A dialog with:
- **Module** selector (Hitting, Pitching, Fielding, etc.)
- **Session Type** selector (Team Session, Lesson, Game, Solo Work, Live ABs)
- **Assignment Scope** toggle: Individual / Team / Organization
  - **Individual**: Multi-select from the coach's linked players (fetched via `get-following-players` edge function or direct `scout_follows` query)
  - **Team/Organization**: Uses `useOrganization` to pick org; creates a row per org member
- **Date, Start Time, End Time**
- **Recurring Weekly** toggle with day picker
- **Description** field (optional)
- On submit: creates one `scheduled_practice_sessions` row per target player, with `coach_id = currentUser.id`, `created_by = currentUser.id`, `assignment_scope` set accordingly

## Integration: Coach Dashboard

Add a "Schedule Practice" button in `src/pages/CoachDashboard.tsx` header area (near the org quick-link or My Players section). This opens `CoachScheduleDialog`.

## Hook Update: `useScheduledPracticeSessions`

Add a `createBulkSessions` method that accepts an array of player IDs and creates one row per player in a loop (Supabase JS doesn't support bulk insert returning with `as any` casting cleanly, so we'll insert in a single `.insert([...rows])` call).

## Game Plan Visibility

Already handled — the existing RLS SELECT policy (`user_id = auth.uid() OR created_by = auth.uid()`) ensures:
- Players see sessions assigned to them
- Coaches see sessions they created

The `useGamePlan.ts` integration from Phase 1 already fetches and renders these.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/coach/CoachScheduleDialog.tsx` | **Create** — Full coach scheduling dialog with scope selection and player picker |
| `src/hooks/useScheduledPracticeSessions.ts` | **Modify** — Add `createBulkSessions` for multi-player scheduling |
| `src/pages/CoachDashboard.tsx` | **Modify** — Add Schedule Practice button + import CoachScheduleDialog |

