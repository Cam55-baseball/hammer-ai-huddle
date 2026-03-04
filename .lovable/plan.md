

# Scheduled Sessions Management View for Coach Dashboard

## Overview

Add a new `ScheduledSessionsManager` component to the Coach Dashboard that displays all sessions the coach has scheduled, with ability to edit and cancel them.

## New Component: `src/components/coach/ScheduledSessionsManager.tsx`

A Card-based section showing a table/list of all sessions where `created_by = current user`. Features:

- **Fetch**: Query `scheduled_practice_sessions` where `created_by = auth.uid()`, ordered by `scheduled_date` desc
- **Display columns**: Title, Module, Type, Date, Time, Scope, Status, Actions
- **Status badges**: `scheduled` (blue), `completed` (green), `cancelled` (red)
- **Actions per row**:
  - **Cancel** button → sets status to `cancelled` (with confirmation dialog)
  - **Edit** button → opens an inline edit dialog to update date, time, description, recurring settings
- **Filters**: Toggle between "Upcoming" (scheduled, date >= today) and "All" views

## Hook Update: `src/hooks/useScheduledPracticeSessions.ts`

Add two methods:
- `fetchCoachSessions()` — fetches all sessions where `created_by = user.id`, no date filter
- `updateSession(id, updates)` — partial update for date, time, description, recurring fields

## Integration: `src/pages/CoachDashboard.tsx`

Insert the `ScheduledSessionsManager` component between the Session Feed and Collaborative Workspace sections (around line 557), placing it logically after player management.

## Files

| File | Action |
|------|--------|
| `src/components/coach/ScheduledSessionsManager.tsx` | **Create** |
| `src/hooks/useScheduledPracticeSessions.ts` | **Modify** — add `fetchCoachSessions` and `updateSession` |
| `src/pages/CoachDashboard.tsx` | **Modify** — import and render `ScheduledSessionsManager` |

