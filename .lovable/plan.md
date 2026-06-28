## What's actually happening

The console shows `Maximum update depth exceeded` coming from `useCalendar.ts` every time the Calendar mounts or you click a day. That's a real infinite render loop — and once React tears the tree down, the auth guard sees an unmounted tree and the next click lands you back on the home/login screen. So the "kicked out" symptom and the "click a date crashes" symptom are the same bug.

## Root cause (proven by reading the code)

In `src/components/calendar/CalendarView.tsx`:

```ts
// recreated on EVERY render — new Date object identity each time
const fetchStart = startOfWeek(startOfMonth(subMonths(currentMonth, 1)), { weekStartsOn: 0 });
const fetchEnd   = endOfWeek(endOfMonth(addMonths(currentMonth, 1)), { weekStartsOn: 0 });

useEffect(() => {
  fetchEventsForRange(fetchStart, fetchEnd);
}, [currentMonth, fetchEventsForRange, fetchStart, fetchEnd]);  // ← fires every render
```

`fetchEventsForRange` then calls `setCurrentRange(...)` and `setEvents(...)` inside `useCalendar.ts`, which re-renders `CalendarView`, which builds two more new `Date` objects, which retrips the effect — forever. Same loop is what `useCalendarProjection` is also being asked to recompute against, which is why the day sheet and importer feel unstable.

Secondary issue in `src/hooks/useCalendar.ts` line 209: `setCurrentRange((prev) => { if (prev === null) setLoading(true); return ...; })` — calling another setState from inside an updater function is a React anti-pattern (updater must be pure; React may invoke it twice in StrictMode) and amplifies the loop.

## The fix (surgical, presentation-only)

### 1) `src/components/calendar/CalendarView.tsx`
- Wrap `monthStartForRange`, `fetchStart`, `fetchEnd` in `useMemo` keyed only on `currentMonth` so their identity is stable across renders.
- Reduce the fetch effect's deps to `[fetchStart, fetchEnd, fetchEventsForRange]` (drop the redundant `currentMonth`).
- Also memoize the `useCalendarProjection` date strings (already derived from the memoized dates, so this falls out for free).

### 2) `src/hooks/useCalendar.ts`
- Move the `setLoading(true)` call out of the `setCurrentRange` updater. Keep the "only show skeleton on first load" behavior by checking the previous range with a ref or by reading current state before the updater.
- Leave all DB queries, sort logic, and write paths untouched.

### 3) `src/pages/Calendar.tsx`
- No changes needed. The auth guard, realtime gate, and `hasMountedWithUser` shield are already correct; once the render loop stops, the "eject" symptom goes away on its own.

## What I am explicitly NOT changing

- No auth/session logic changes (`AuthContext`, `useRequireAuth`, `protectedEditing` all stay as-is — they aren't the cause).
- No schema, RLS, or query changes.
- No changes to `CalendarDaySheet`, the importer dialog, or any write paths.

## Verification before declaring it fixed

1. Open `/calendar`, confirm zero `Maximum update depth exceeded` warnings in the console over a 10-second idle.
2. Click several day cells — the day sheet opens, no nav to `/` or `/auth`.
3. Page through months forward/back 3× — no warning storm, events render.
4. Open the schedule importer, type, paste a block — no eviction (already covered by the Phase 57 regression suite, which will still pass).

## Technical notes

- React's "Maximum update depth exceeded" is raised when a component schedules a state update from inside `useEffect` (or render) without a stable dependency boundary. Memoizing the date objects breaks the identity churn that was feeding the effect.
- `useCallback`'s `fetchEventsForRange` is already stable (deps don't include `currentRange`), so once its inputs stop changing every render, the loop ends.
