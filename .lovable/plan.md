## Problem

When the user starts typing in the Add Event dialog on `/calendar`, they get kicked back to the home screen (`/index`). The console for the current session confirms the user ended up with `hasUser: false, hasSession: false` after a Vite reconnect / channel-error blip. The same eviction pattern that we hardened against in `AuthContext` for SIGNED_OUT is still firing in two new ways:

1. **`Calendar` page has no auth-stable guard.** `src/pages/Calendar.tsx` mounts `useSchedulingRealtime` and `CalendarView` directly without `useRequireAuth()` and without waiting for `isAuthStable`. When the Supabase channel disconnects mid-typing (we see `Channel error/closed, attempting reconnect` in the logs), the realtime hook and dependent queries re-run, hit a momentarily null user, and downstream components unmount/redirect.
2. **`AddCalendarEventDialog` lives inside a parent that re-renders on every auth/projection blip.** The dialog's local state survives, but the moment `CalendarView`'s parent layout decides it has no user (because a child query threw, or because `DashboardLayout` re-evaluates and bounces), the dialog is torn down and the user lands on home — feeling like typing "kicked them out".
3. **`addEvent` in `useCalendar` doesn't assert a live session before insert.** A keystroke-coincident token refresh window can put the insert into an RLS-failing state and the resulting error is swallowed (`console.error` only), then the parent unmounts.

The home redirect (not `/auth`) is consistent with `DashboardLayout`'s reload-on-error path being triggered by a thrown render in a child, not with the auth guard.

## Fix

### 1. Make the Calendar page auth-stable, not just auth-checked

`src/pages/Calendar.tsx`:
- Call `useRequireAuth()` so the page waits for `isAuthStable` and only navigates to `/auth` (with `returnTo`) after the same 400 ms second-tick recheck used elsewhere.
- Gate `useSchedulingRealtime()` and the render of `<CalendarView />` behind `isAuthStable && !!user`. Show the existing `DashboardLayout` shell with a lightweight skeleton while auth is settling so the dialog and its parent are never torn down by a transient null user.

### 2. Keep the Add Event dialog mounted across transient auth churn

`src/components/calendar/CalendarView.tsx`:
- Move `AddCalendarEventDialog` (and `SeasonScheduleImporterDialog`) out of any conditional render path tied to query/loading state. They should always be rendered when `addEventOpen` / `importerOpen` is true, regardless of `loading`, `derivedEvents`, or realtime reconnect state.
- Memoize the `onAdd` callback so a parent re-render triggered by a realtime invalidation doesn't change the dialog's prop identity and cause focus loss mid-typing.

### 3. Harden `addEvent` against the keystroke / refresh race

`src/hooks/useCalendar.ts` (`addEvent`):
- Before insert, call `await supabase.auth.getSession()` and use the returned user id; if it's missing, surface a single toast ("Session expired — please sign in again") and return `false` without throwing. This prevents the silent RLS failure path that currently bubbles up as an unmount.
- Wrap the existing `try/catch` so any thrown error is contained and surfaced as a toast, never as an uncaught render-time exception.

### 4. Hold session through input focus (defensive)

`src/contexts/AuthContext.tsx`:
- When the SIGNED_OUT debounce timer fires, also skip eviction if `document.activeElement` is an `<input>`, `<textarea>`, or `contenteditable` element. This matches the user's exact failure surface (typing) and is consistent with the existing "don't evict on hidden tab / token refresh" pattern. Re-arm the check on the next auth event so a real sign-out still works.

### 5. Verify

- Manual: open `/calendar`, click a day → Add Event → type into Title; with devtools network throttled to "Slow 3G" + offline toggle to force a channel reconnect, the dialog must stay open and focused.
- Verify the Import-schedule textarea on the same page (`SeasonScheduleImporterDialog`) behaves the same — it is the second text-entry path the user named.
- Playwright smoke against the live preview: sign in, open Add Event, type 10 characters with a 1 s pause each, assert `location.pathname === "/calendar"` and the input still has focus after each keystroke.

## Out of scope
- No schema changes; `calendar_events` insert path is unchanged beyond the pre-flight session check.
- No redesign of the dialog or the calendar grid.
- The photo-upload import path is already wired through `SeasonScheduleImporterDialog`; this plan keeps it mounted across blips but does not change its parsing logic.

## Files touched
- `src/pages/Calendar.tsx` — add `useRequireAuth`, gate render on `isAuthStable && user`.
- `src/components/calendar/CalendarView.tsx` — unconditional dialog mounts, memoized `onAdd`.
- `src/hooks/useCalendar.ts` — pre-flight session check + safe error surfacing in `addEvent`.
- `src/contexts/AuthContext.tsx` — skip SIGNED_OUT eviction while a text input is focused.
