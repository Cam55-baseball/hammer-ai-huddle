

# Move Schedule Practice Button Next to Scheduled Sessions Header

## Problem

The "Schedule Practice" button currently sits in the coach dashboard header area. The user wants it placed next to the "Scheduled Sessions" title inside the `ScheduledSessionsManager` card header.

## Solution

### Modify `ScheduledSessionsManager.tsx`

Accept an optional `onSchedule` callback prop. Render a "Schedule Practice" button in the card header (next to the Upcoming/All filter buttons) that calls this callback.

### Modify `CoachDashboard.tsx`

Pass `onSchedule={() => setScheduleDialogOpen(true)}` to `<ScheduledSessionsManager />`. Optionally remove the duplicate Schedule Practice button from the dashboard header area (line ~379).

### Files to Modify

| File | Action |
|------|--------|
| `src/components/coach/ScheduledSessionsManager.tsx` | Add `onSchedule` prop, render button in header |
| `src/pages/CoachDashboard.tsx` | Pass `onSchedule` prop, remove duplicate button from header |

