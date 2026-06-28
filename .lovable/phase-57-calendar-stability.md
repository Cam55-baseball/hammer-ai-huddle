# Phase 57 — Calendar stability + regression suite

## Root cause (proven by inspection)

The eviction-on-Calendar-click symptom was reachable through a combination of:

1. `useRequireAuth` allowed a fast (400 ms) window after `isAuthStable` flipped
   true in which a transient `session === null` would trigger `navigate('/auth')`.
   On mobile, the Supabase WS reconnect that fires on route change can race
   inside this window before `getSession()` rehydrates.
2. The guard did not inspect persisted `sb-*-auth-token` in `localStorage`,
   so an in-memory context blip could win against a still-valid disk token.
3. The guard did not protect typing users at the moment of the recheck — only
   the AuthContext `SIGNED_OUT` handler did.
4. The schedule importer paste box could still be caught during a focus/remount
   edge where auth briefly reported null before the one-time active-element
   check observed the textarea.

## Fix

`src/hooks/useRequireAuth.ts` now requires **all five** conditions before any
redirect to `/auth`:

1. Auth context settled (`!loading && isAuthStable`).
2. Tab visible.
3. No `INPUT` / `TEXTAREA` / `contenteditable` has focus.
4. `supabase.auth.getSession()` returns no session after a **1500 ms** grace
   window (was 400 ms).
5. No `sb-*-auth-token` entry in `localStorage`.

The fix now also adds a protected-editing signal used by the importer paste box
and review fields. While that signal is active, both `AuthContext` and
`useRequireAuth` refuse to evict the user even if auth/realtime briefly blips.

Calendar also stays mounted after it has seen a real user once in the current
mount, so a transient context null cannot tear down the importer and erase
typed schedule text.

## Regression suite

`tests/e2e/calendar/run.mjs` mirrors the Phase 56 onboarding pattern and runs
five scenarios:

| ID | Asserts |
|----|---------|
| S1 | `/calendar` is reachable and stays mounted for 3 s after nav — no `/auth` redirect. |
| S2 | `calendar_events` row persisted via REST for `game / practice / event / appointment`, typed character-by-character with a synthetic storage blip mid-typing. |
| S3 | `SeasonScheduleImporterDialog` accepts a PNG upload without eviction. |
| S4 | Synthetic `visibilitychange` storm while typing leaves focus + URL untouched. |
| S5 | `Import schedule → Paste text` survives slow typing, a synthetic auth-storage blip, and Analyze without `/auth` eviction or text loss. |

Wired to CI via `.github/workflows/calendar-regression.yml` (paths-scoped, runs
on PRs that touch Calendar, AuthContext, or the suite itself).
