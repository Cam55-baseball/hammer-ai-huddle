

# Add Contextual Session Fields to Coach Schedule Dialog

## Problem

The Coach Dashboard's `CoachScheduleDialog` supports selecting "Lesson", "Team Session", and "Game" as session types, but it doesn't show the dynamic configuration fields that were recently added to the player's `SchedulePracticeDialog` — no coach selector for lessons, no team/org auto-population for team sessions, and no opponent fields for games.

## Solution

Mirror the contextual fields from `SchedulePracticeDialog` into `CoachScheduleDialog`:

### Changes to `src/components/coach/CoachScheduleDialog.tsx`

1. **Import** `CoachSelector`, `GameSessionFields`, and `usePlayerOrganization`
2. **Add state**: `coachSelection`, `teamName`, `opponentName`, `opponentLevel`
3. **Conditional rendering** after the Session Type selector:
   - **Lesson** → `CoachSelector` (the scheduling coach can designate which coach is leading the lesson)
   - **Team Session** → Team/Organization text input (auto-populated from org if available)
   - **Game** → `GameSessionFields` (opponent name + level) + Team field
4. **Auto-populate** team name from `activeOrg?.name` via `useEffect` when session type changes
5. **Pass new fields** (`coach_id`, `team_name`, `opponent_name`, `opponent_level`) through to `createBulkSessions` in `handleSubmit`

### Files to Modify

| File | Action |
|------|--------|
| `src/components/coach/CoachScheduleDialog.tsx` | Add contextual fields matching player dialog |

No database or hook changes needed — the columns and interface fields already exist from the previous migration.

