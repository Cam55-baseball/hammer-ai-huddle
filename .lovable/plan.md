

# Add Player Scheduled Sessions Management + Schedule from Game Plan & Calendar

## Overview

Three additions: (1) A player-facing "My Scheduled Sessions" management component, (2) a Schedule button on the Game Plan header, and (3) a Schedule button on the Calendar header.

## 1. New Component: `src/components/practice/PlayerScheduledSessions.tsx`

Adapted from the coach `ScheduledSessionsManager` but scoped to the player's own sessions (`user_id = auth.uid()`). Features:
- Collapsible card section showing upcoming sessions (filterable to "Upcoming" / "All")
- Each row: Title, Date, Time, Status badge, Edit and Cancel action buttons
- Edit dialog: modify date, times, description, recurring settings
- Cancel: confirmation alert then sets status to `cancelled`

## 2. Hook Update: `useScheduledPracticeSessions.ts`

Add `fetchPlayerSessions()` — fetches sessions where `user_id = auth.uid()`, ordered by `scheduled_date` ascending (upcoming first). This is distinct from `fetchCoachSessions` which uses `created_by`.

## 3. Game Plan Integration: `src/components/GamePlanCard.tsx`

Add the `SchedulePracticeDialog` import and render it in the action buttons row (line ~1277), alongside existing sort/lock buttons. This gives players quick access to schedule a practice session directly from the Game Plan.

## 4. Calendar Integration: `src/components/calendar/CalendarView.tsx`

Add the `SchedulePracticeDialog` next to the existing "Add Event" button (line ~208). When a session is scheduled, call `refetch()` to refresh calendar events.

## 5. Practice Hub Integration: `src/pages/PracticeHub.tsx`

Add the `PlayerScheduledSessions` component below the header area, giving players visibility into their upcoming scheduled sessions right where they do their practice work.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/practice/PlayerScheduledSessions.tsx` | **Create** — Player session management view |
| `src/hooks/useScheduledPracticeSessions.ts` | **Modify** — Add `fetchPlayerSessions` |
| `src/components/GamePlanCard.tsx` | **Modify** — Add SchedulePracticeDialog button |
| `src/components/calendar/CalendarView.tsx` | **Modify** — Add SchedulePracticeDialog button |
| `src/pages/PracticeHub.tsx` | **Modify** — Add PlayerScheduledSessions component |

