## Phase 55 Production Verification — Plan

Execute a live end-to-end verification of the repaired onboarding pipeline against the running preview, with fresh accounts created at runtime, and produce `.lovable/phase-55-production-verification.md` containing PASS/FAIL, screenshots, DB evidence, and a final readiness verdict.

### Approach

Drive the live preview with Playwright (headless Chromium, viewport 1280×1800 for desktop, 390×844 for mobile) from `/tmp/browser/phase-55/`. Create fresh Supabase auth users via the public anon key signup endpoint at runtime (random `+tag@` emails) so each scenario starts from a clean identity. Use `psql` (managed `PG*` env vars) for canonical-event evidence queries. Use `supabase--analytics_query` for auth + edge logs.

### Scenarios (each → PASS/FAIL + screenshot + SQL evidence)

1. Fresh athlete signup — DOB supplied → `/onboarding/athlete` → dashboard. Assert exactly one `relational.developmental.age_observed` and exactly one `athlete.schedule.day_type` row.
2. Returning athlete (has first event) — sign out / sign in → routes directly to `/dashboard`, no onboarding bounce.
3. Returning athlete missing canonical first event — manually delete the bootstrap event via `psql` migration-free SELECT/DELETE is not allowed; instead simulate by creating a fresh user but skipping `AthleteOnboarding` mount, then sign back in → must route to `/onboarding/athlete`.
4. Athlete signup with missing DOB — signup without DOB metadata, then visit `/onboarding/athlete`; assert bootstrap is skipped with `dob_missing`, no event row created, UI degrades visibly without crash.
5. Parent invite end-to-end — athlete A creates invite (`/parent-invite`), capture token, open invite link in a fresh incognito context signed-out → `/auth?redirect=…` → signup as parent → returned to `/accept-parent-invite?token=…` with token intact → accept → poll `parent_athlete_links` → land on `/parent/athletes` with athlete visible.
6. `/onboarding/flow` redirect — navigate directly; assert `<Navigate>` lands on `/onboarding/athlete` with no flicker / no orphan mount.
7. Idempotency under repeated logins — sign out/in 3× and reload `/onboarding/athlete` 3×; rerun event-count query, must remain exactly 1 of each canonical event.
8. Dashboard gate — confirm a brand-new athlete with no first event is bounced from `/dashboard` to `/onboarding/athlete`.
9. Mobile pass — repeat scenarios 1 and 5 at 390×844 viewport; assert completion.

### Cross-cutting audits per scenario

- Console: capture `page.on("console")`; fail on any `error` or `warning` containing "Warning:" (React) or "Supabase".
- Network: capture `page.on("response")`; fail on any 4xx/5xx to `asb_events`, `profiles`, `parent_athlete_links`, `auth/v1/*`, or `functions/v1/*`.
- Race conditions: between auth state change and first navigation, assert no double-mount of `AthleteOnboarding` (instrument by counting bootstrap log lines).

### Database evidence (via `psql`)

For each created `athlete_id`:
```sql
select topic_id, count(*) from asb_events
 where athlete_id = $uid
 group by topic_id order by topic_id;
```
Plus a global duplicate check:
```sql
select athlete_id, topic_id, count(*)
  from asb_events
 where topic_id in ('relational.developmental.age_observed','athlete.schedule.day_type')
 group by 1,2 having count(*) > 1;
```
Parent linkage:
```sql
select status, accepted_at, revoked_at
  from parent_athlete_links
 where parent_user_id = $parent_uid and athlete_user_id = $athlete_uid;
```

### Investigation needed before fully scripting

Two unknowns require quick code reads (read-only, still in plan mode boundary — I will do these at the start of build mode, not now):
- Where `athlete.schedule.day_type` is emitted today (the user lists it as a required canonical event, but Phase 55 repair didn't touch it — need to confirm emitter exists and is wired into the onboarding/dashboard mount).
- Whether the in-app signup form actually collects DOB, or whether DOB only arrives via `ProfileSetup`. This determines the exact click-path Playwright must drive for scenario 1.

If `athlete.schedule.day_type` has no emitter on the onboarding path, the verification will FAIL scenario 1 and the fix (wire its emitter into `AthleteOnboarding` analogous to bootstrap) must land before re-running the suite — per the user's "fix immediately and rerun" directive.

### Failure handling

For any failing scenario:
1. Capture failing screenshot + console + network into the doc.
2. Patch the minimum source needed (e.g., add missing emitter, fix routing edge case).
3. Re-run the full suite from scenario 1. Do not declare PASS until every scenario is green in a single contiguous run.

### Deliverable

`.lovable/phase-55-production-verification.md` containing:
- Scenario matrix (PASS/FAIL, evidence links).
- Embedded screenshots (`/tmp/browser/phase-55/screenshots/*.png` referenced relatively, copies committed under `.lovable/phase-55-evidence/`).
- SQL output blocks for every canonical event check.
- Console + network audit summary per scenario.
- Edge cases discovered.
- Final verdict: **PRODUCTION READY** or **BLOCKED** with remaining blockers enumerated.
