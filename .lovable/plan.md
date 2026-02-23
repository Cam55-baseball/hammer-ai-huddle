

# Two Fixes: Remove Dashboard Prices + Debug Timeline Lock/Template Issues

## 1. Remove Prices from Dashboard Module Cards

The three tier cards on the Dashboard (Complete Pitcher, 5Tool Player, The Golden 2Way) each display hardcoded price text like "$200/month", "$300/month", "$400/month". These need to be removed so users only see prices during checkout.

### File: `src/pages/Dashboard.tsx`

Remove these three lines:
- Line 449: `<p className="text-sm text-muted-foreground">$200/month</p>`
- Line 484: `<p className="text-sm text-muted-foreground">$300/month</p>`
- Line 519: `<p className="text-sm text-muted-foreground">$400/month</p>`

Prices will still be visible on the Select Modules page and Checkout page where they belong.

---

## 2. Timeline Lock/Template Feature Investigation

Users report that the lock and template features in timeline mode are not working. After thorough code review, here are the identified issues and fixes:

### Issue A: Lock button is disabled when it should not be

In `GamePlanCard.tsx` around line 1295, the "Lock for Today" button has `disabled={todayLocked}`. If a weekly lock already exists for today's day-of-week, the button is disabled even though the user may want to create a date-specific override lock. The fix is to only disable if `isDateLockedToday` (date-specific lock), not if weekly locked.

### File: `src/components/GamePlanCard.tsx`
- Line ~1295: Change `disabled={todayLocked}` to `disabled={isDateLockedToday}` so users can override weekly locks with a day-specific lock.

### Issue B: Template apply doesn't persist times correctly

In `handleApplyTemplate` (line ~786), the template's `schedule` contains `ScheduleItem` objects with `taskId`, `startTime`, and `reminderMinutes`. However, the code reads `s.startTime` and `s.reminderMinutes` but the `ScheduleItem` interface from `useGamePlanLock.ts` defines `displayTime` (not `startTime`) and `reminderEnabled`. There is a mismatch between the template save format and the lock format.

When templates are saved (line ~772), times use `taskTimes[t.id]` saved as `startTime`. When applied (line ~800), they read `s.startTime`. This part actually matches. However the `useScheduleTemplates` hook saves with its own `ScheduleItem` type which has `startTime`, while `useGamePlanLock` uses `displayTime`. This dual naming is confusing but functionally works for templates.

The real problem is more subtle: after applying a template, the applied order and times are saved to `localStorage` and state, but the timeline is not re-locked. Users expect applying a template to automatically lock the order, but it does not. We should add an auto-lock after template application.

### File: `src/components/GamePlanCard.tsx`
- After `handleApplyTemplate` sets the order and times, automatically trigger `handleLockCurrentOrder()` so the applied template is persisted to the database, not just localStorage.

### Issue C: Comment says isWeeklySkipped can't be called in lock handler

Line 681 has a comment: "Note: isWeeklySkipped can't be called here since it's defined later." This means the lock handler at line 680 only filters manually skipped tasks but not weekly-scheduled-off tasks. Since `isTaskHiddenToday` is defined later, the lock could include hidden tasks. We should restructure to use `timelineVisibleTasks` instead.

### File: `src/components/GamePlanCard.tsx`
- In `handleLockCurrentOrder` (line ~680), `handleUnlockSave` (line ~717), `handleLockDays` (line ~751), and `handleSaveTemplate` (line ~770): use `timelineVisibleTasks` instead of manually filtering `timelineTasks`.

---

## Summary of Changes

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Remove 3 price lines ($200, $300, $400/month) from tier cards |
| `src/components/GamePlanCard.tsx` | Fix lock button disabled state to allow day-specific override of weekly locks |
| `src/components/GamePlanCard.tsx` | Auto-lock after applying template so it persists |
| `src/components/GamePlanCard.tsx` | Use `timelineVisibleTasks` in lock/template handlers to exclude hidden tasks |

