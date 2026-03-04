

# Contextual Session Configuration Fields for Practice Hub Scheduling

## Overview

Add dynamic configuration fields to `SchedulePracticeDialog` that appear based on session type: Coach selector for Lessons, Team/Org field for Team Sessions, and Opponent + Team fields for Games.

## Database Migration

Add three new nullable columns to `scheduled_practice_sessions`:

```sql
ALTER TABLE public.scheduled_practice_sessions
  ADD COLUMN opponent_name text,
  ADD COLUMN opponent_level text,
  ADD COLUMN team_name text;
```

No RLS changes needed — existing policies cover these columns automatically.

## Component Changes: `src/components/practice/SchedulePracticeDialog.tsx`

Add state variables and conditionally render fields after the Session Type selector:

- **When `sessionType === 'lesson'`**: Render the existing `CoachSelector` component. Store selection as `coach_id` (linked coach) or in `description` (external coach name).

- **When `sessionType === 'team_session'`**: Show a "Team / Organization" input. If `usePlayerOrganization` returns an org, auto-populate with org name and store `organization_id`. If not, show a free-text input stored in `team_name`.

- **When `sessionType === 'game'`**: Show `GameSessionFields` (opponent name + level) plus a "Team You Are Playing For" field. Auto-populate team from org if linked, otherwise free-text. Store in `opponent_name`, `opponent_level`, `team_name`, and `organization_id`.

New state: `coachSelection`, `opponentName`, `opponentLevel`, `teamName`. Import `CoachSelector`, `GameSessionFields`, `usePlayerOrganization`.

Update `handleSubmit` to pass these fields through to `createSession`.

## Hook Update: `useScheduledPracticeSessions.ts`

Extend `CreateScheduledSession` interface with optional `opponent_name`, `opponent_level`, `team_name` fields. Pass them through in the `createSession` insert call.

## Files to Modify

| File | Action |
|------|--------|
| Database migration | Add `opponent_name`, `opponent_level`, `team_name` columns |
| `src/components/practice/SchedulePracticeDialog.tsx` | Add conditional fields for lesson/team/game |
| `src/hooks/useScheduledPracticeSessions.ts` | Extend interface and insert logic |

