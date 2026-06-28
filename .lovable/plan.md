## Goal

1. Diagnose & fix the regression where clicking **Calendar** in the sidebar evicts the user to `/auth`.
2. Add a Playwright E2E suite that proves all four event types (game, camp, practice, event) can be added via **text entry** and **photo upload** without mid-typing eviction.

## Part 1 — Root-cause the eviction on Calendar entry

Investigate, in this order, before changing any code:

- `DashboardLayout` — confirm whether it runs its own auth redirect that bypasses `useRequireAuth`'s 400 ms recheck.
- `useAuth` / `AuthContext` — confirm `isAuthStable` is `true` at first render after navigation (not flipped to `false` on every route change).
- `useSchedulingRealtime` — confirm the `enabled=false` path doesn't still open a Supabase channel that triggers a `SIGNED_OUT` blip.
- `Sidebar` `Calendar` link — confirm it's a `<Link>` (SPA nav) and not a full-page reload that drops the in-memory session before localStorage rehydrates.

Expected fix surface (apply only what the investigation proves):
- Harden `DashboardLayout` to use the same `useRequireAuth` settle window instead of an eager `if (!user) navigate('/auth')`.
- Ensure `useAuth().isAuthStable` is sticky-true once set, not re-armed on route change.
- Make sure `useSchedulingRealtime(false)` is a true no-op (no channel subscription, no auth listener).

## Part 2 — E2E regression suite

Add `tests/e2e/calendar/run.mjs` (mirrors the existing `tests/e2e/onboarding/run.mjs` pattern) plus a short `README.md`. Drives Playwright against the local dev server using the injected Supabase session from `LOVABLE_BROWSER_SUPABASE_*` env vars.

Scenarios (each is an independent test that fails the run on any console error, network 4xx/5xx to Supabase, or navigation to `/auth`):

1. **Sidebar nav stability** — sign-in fixture → click sidebar Calendar link → assert URL stays `/calendar`, `CalendarView` mounts, no `/auth` redirect within 3 s.
2. **Text entry — Game** — open Add Event dialog, type a multi-word title slowly (per-character `page.keyboard.type` with 80 ms delay), pick "Game", set date, submit → row appears on calendar with red color token.
3. **Text entry — Camp / Practice / Event** — parametrized variants of #2 covering each event type and asserting the correct color token (camp/practice/event vs. AI-imported violet/red).
4. **Mid-typing eviction guard** — start typing in the title field, then dispatch a synthetic `visibilitychange` + a fake `SIGNED_OUT` on the auth channel (via `page.evaluate` flipping a Supabase channel event) → assert the dialog stays mounted, focus stays in the input, no navigation to `/auth`.
5. **Photo upload — schedule import** — open `SeasonScheduleImporterDialog`, attach a fixture screenshot (`tests/e2e/calendar/fixtures/schedule.png`), click "Analyze with Hammer AI" → assert spinner resolves within 45 s, parsed events land on the calendar with the AI-import color tokens (violet tournaments, red games), no eviction.
6. **Photo upload failure path** — attach an unreadable image → assert user-visible toast appears and the dialog stays open (no silent spin, no eviction).

### Test harness details

- One Playwright script, `--scenario=<name>` flag to run individually; default runs all.
- Reuse the session-injection block from the onboarding suite (read `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY` + `_SESSION_JSON`, `page.evaluate` localStorage write after `goto('/')`).
- Screenshots written under `/tmp/browser/calendar/screenshots/<scenario>/`.
- Fail-fast assertions: any navigation whose `page.url()` ends with `/auth` during a scenario throws.
- Console listener collects errors; any `error`-level log fails the scenario unless explicitly allow-listed.

### CI wiring

- Add `.github/workflows/calendar-regression.yml` mirroring `onboarding-regression.yml`: install deps, start Vite preview, run `node tests/e2e/calendar/run.mjs`, upload screenshots on failure.
- Both workflows gate the same branch protection set.

## Deliverables

- Code fix(es) from Part 1 with a one-paragraph note in `.lovable/phase-57-calendar-stability.md` describing the proven root cause.
- `tests/e2e/calendar/run.mjs`, `tests/e2e/calendar/README.md`, `tests/e2e/calendar/fixtures/schedule.png`.
- `.github/workflows/calendar-regression.yml`.
- Green local run captured in the phase doc (scenario list + pass/fail + screenshot paths).
