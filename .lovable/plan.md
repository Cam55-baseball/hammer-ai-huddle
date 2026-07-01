## Full-App Bug, Brokenness & Fragmentation Sweep

### Scope
Audit the entire app for runtime crashes, dead buttons, broken routes, auth-eviction glitches, missing GRANTs, unhandled promise rejections, lazy-load import failures, and E2E gaps between UI → hook → edge function → DB.

### Investigation phases

**1. Static / structural audit**
- `tsgo --noEmit` — zero-error baseline.
- `rg` sweep for known glitch patterns: raw `signOut(` outside guard, `throw new Error` in render paths, missing `ErrorBoundary` wraps on lazy routes, `import(` without `lazyWithRetry`, `useAuth()` called without `useOptionalAuth` fallback, `.single()` without error handling, `navigate("/auth")` on non-auth failures.
- Verify every top-level route in `App.tsx` is wrapped in an `ErrorBoundary`.

**2. Database & permissions audit**
- Query `pg_class`/`aclexplode` for every `public.*` table used by the client — flag any missing `authenticated`/`service_role` grants.
- Check RLS: enabled + at least one policy per user-facing table.
- Run Supabase linter and record ERROR-level items.

**3. Edge function health**
- List all deployed functions, curl each critical one (`wk-generate-daily`, `compute-hammer-state`, `hie-refresh-worker`, `evaluate-advice-effectiveness`, video analysis, schedule import, ask-hammer, ingest doc) and check for 5xx / boot failures in logs.

**4. Auth eviction glitch audit**
- Grep `AuthContext.tsx` `canEvictNow()` guards.
- Confirm `protectedEditing.ts` focus guards are wired into every text/textarea that previously kicked the user out (Add Event, calendar dialogs, onboarding steps, dossier notes).
- Check `SIGNED_OUT` handler doesn't fire on token refresh.

**5. Interactive smoke test (Playwright, authenticated preview session)**
Run headless Chromium through the critical journeys and screenshot each step:
- Landing → Hammer Today Plan render.
- Open Baserunning / Hitting / Throwing / Defense / Speed / Lifts drawers.
- Calendar view → click a date → open Add Event → type in text field (must NOT kick to login).
- Season dates / Add Game importer.
- Cancel/Reschedule event.
- Onboarding resume, category goals ranked, Save & Exit.
- Game Hub → pregame dossier → generate plan.
- Progress "The General" dashboard.
- IQ 101 scenario open.
- Video upload flow — confirm skeleton + countdown appear, no eviction.
- Report Injury dialog.
- User menu → sign out (only path that should evict).

**6. Consolidated fix pass**
For every real bug found, apply the smallest correct fix, re-run the affected smoke step, then re-run `tsgo`.

### Deliverable
A single report per area: **PASS** / **FIXED (what+why)** / **KNOWN LIMITATION (owner action needed)**, plus a final verdict.