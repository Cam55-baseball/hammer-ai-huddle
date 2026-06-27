
## What's actually happening

I traced all three reports against the running app, the auth logs, the edge-function logs, and the route guards. They are three separate bugs, not one — and the first one is the loudest because it makes the other two look worse than they are.

### 1. "Random kicks to the login screen"
The current console snapshot is the smoking gun: `hasUser: false, hasSession: false, authLoading: false` while you're on `/`. Auth logs show successful `/token` and `/user` calls a few seconds earlier from `cefbf3ce-…lovableproject.com`, but the preview you're viewing is on `id-preview--cefbf3ce-…lovable.app`. Those are **two different origins**, and Supabase stores the session in `localStorage` per-origin. The session is real, just on the wrong domain — so any page that does `if (!user) navigate('/auth')` evicts you.

Most pages also call `navigate('/auth')` the instant `user` is falsy, with no `isAuthStable` / second-tick recheck (Dashboard, Index, Activate, MyFollowers, ParentAthletes, RecruitingConsent, Nutrition, MindFuel, PickoffTrainer, SoftballStealingTrainer, TexVision, HelpDesk, Profile, ProfileSetup, SelectUserRole, SelectModules, ScoutApplicationPending, InitializeOwner — 18 pages total). During any momentary auth flicker (token refresh, network blip — see the `check-subscription` "connection reset" in today's logs), all of those redirect.

### 2. Video analysis kicks to home
`AnalyzeVideo.handleUploadAndAnalyze` does a live `supabase.auth.getSession()` right before upload and, if it returns no session, force-navigates to `/auth`. On a flaky network or origin-drifted preview that path fires even though the user is signed in elsewhere.

### 3. Calendar date click crashes the page
Day click opens `CalendarDaySheet`, which renders `DraggableEventCard` inside `framer-motion`'s `Reorder.Group/Item` and embeds `DaySessionsList` + `DayStatusSelector`. There is no error boundary anywhere in this subtree, so any render-time throw (null `event.startTime`, a Reorder key clash on derived events, a missing field on `composite_indexes`) takes down the whole route. I haven't pinned the exact thrower yet — but the structural fix (boundary + defensive guards) eliminates the "site crash" class regardless of which row is bad.

## Plan

### A. Stop the eviction storm (shared guard)
1. Add `src/hooks/useRequireAuth.ts` — one hook that encodes the safe pattern AnalyzeVideo already uses:
   - waits for `authLoading === false && isAuthStable === true`
   - skips while `document.visibilityState === 'hidden'`
   - on `!user && !session`, sets a 400ms timer, rechecks `supabase.auth.getSession()` once more, and only then navigates to `/auth` with `returnTo` set to the current path
2. Replace the bare `if (!user) navigate('/auth')` calls in the 18 pages listed above with `useRequireAuth()`. This is mechanical and keeps each page's other logic untouched.
3. Add a tiny `<AuthBoundary>` around the protected routes in `App.tsx` so the same guard applies even if a page forgets to call the hook.

### B. Harden video analysis
1. In `AnalyzeVideo.handleUploadAndAnalyze`, when `getSession()` returns no session: **do not navigate**. Show a persistent toast with a "Sign in again" action that opens `/auth?returnTo=/analyze-video?...` in the same tab. The video file stays selected so the user can retry without re-picking.
2. Same treatment for the `session.user.id !== user.id` mismatch branch — surface the mismatch, offer one-click re-sign-in, don't yank them out mid-flow.
3. Add a console-visible diagnostic line (`[auth-origin] preview=…`, `[auth-origin] session=…`) so future origin-drift incidents are obvious in the logs.

### C. Fix the calendar crash
1. Wrap `CalendarDaySheet`'s body in a route-scoped `<ErrorBoundary>` that renders a "Couldn't load this day — try again" panel with a Reset button instead of unmounting the route. Reuse the existing boundary pattern if there is one; otherwise add `src/components/ErrorBoundary.tsx`.
2. Harden the day-sheet render path:
   - guarantee unique `Reorder.Item` keys (fallback to `${event.type}:${event.id}:${idx}` when ids collide across legacy + derived events)
   - guard `event.startTime.split(':')` and `formatTime` against null/undefined
   - in `DaySessionsList`, default `s.composite_indexes`/`s.drill_blocks`/`s.module` before calling `generateInsights`, and wrap the `.map` in a try/catch per row so one bad session can't blank the list
3. After the boundary is in place, click a date in the preview, capture the real stack from the boundary's `componentDidCatch`, and patch the exact thrower in a follow-up commit. The boundary itself already converts "site crash" into "one broken card".

### D. Origin-drift visibility (small, high-leverage)
Add a one-line check at app boot: if `localStorage` has no `sb-*-auth-token` but `document.referrer` is a different `*.lovable.app` / `*.lovableproject.com` origin, show a non-blocking banner ("You're signed in on a different preview URL — sign in here to continue") instead of silently behaving signed-out. This is what was actually happening in today's session.

## Verification

- Unit: extend `tests/e2e/onboarding/` invariants with one new case — guard hook must not navigate while `isAuthStable === false`.
- Live (Playwright, the same harness Phase 55/56 use):
  - sign in, hard-reload Dashboard 5× → never lands on `/auth`
  - upload a video with a deliberately stale session → stays on AnalyzeVideo, sees the re-sign-in toast, file still selected
  - click every date in the current month → no route crash; if a day's data is malformed, the boundary card appears and the rest of the sheet still renders
- Screenshot evidence saved to `/tmp/browser/auth-stability/` and referenced in `.lovable/phase-57-auth-stability-and-calendar-repair.md`.

## Technical notes

- Files added: `src/hooks/useRequireAuth.ts`, `src/components/ErrorBoundary.tsx` (only if no existing one is reusable), `.lovable/phase-57-auth-stability-and-calendar-repair.md`.
- Files edited: `src/pages/AnalyzeVideo.tsx` (sections at lines 197, 340, 351), `src/components/calendar/CalendarDaySheet.tsx`, `src/components/calendar/DaySessionsList.tsx`, the 18 pages enumerated under §A.2, and `src/App.tsx` for the route-level boundary.
- No DB migrations, no edge-function changes, no schema changes. Everything stays within frontend presentation + guard logic, consistent with the trust-lock rules from Phases 49–56.
- Memory: not saving anything — these are bug fixes, not new conventions.
