

# Remove Coach Selector from Coach Dialog & Fix Military Time Display

## Two Changes

### 1. Remove CoachSelector from CoachScheduleDialog

The coach scheduling a session *is* the coach — no need to select one. Remove the `CoachSelector` rendering and related imports/state from `CoachScheduleDialog.tsx`. In `handleSubmit`, always set `coach_id` to `user.id`.

**File**: `src/components/coach/CoachScheduleDialog.tsx`
- Remove lines 199-201 (CoachSelector conditional render)
- Remove `coachSelection` state and its reset in the submit handler
- Simplify `resolvedCoachId` to just `user.id`
- Remove `CoachSelector` import

### 2. Convert Military Time to 12-Hour Format

Multiple places display raw `HH:MM` times. Add a shared `formatTime12h` helper and apply it everywhere times are shown.

**Places to fix**:

| File | Location | Current |
|------|----------|---------|
| `ScheduledSessionsManager.tsx` | Line 161 | Raw `s.start_time` / `s.end_time` |
| `SchedulePracticeDialog.tsx` | Line 244 (preview) | Raw `startTime` |
| `CoachScheduleDialog.tsx` | Not displaying times in preview, but `<Input type="time">` natively shows based on locale — no change needed for inputs |

Create a small utility (or inline) to format `"HH:MM"` → `"h:MM AM/PM"` (same logic already exists in `GamePlanCard.tsx` and `GamePlanCalendarView.tsx`). Apply it to the display locations above.

**Files to modify**:
- `src/components/coach/CoachScheduleDialog.tsx` — remove CoachSelector for lessons
- `src/components/coach/ScheduledSessionsManager.tsx` — format time display in table
- `src/components/practice/SchedulePracticeDialog.tsx` — format time in preview bar

