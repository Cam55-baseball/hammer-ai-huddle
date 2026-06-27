# Onboarding End-to-End Audit Plan

Goal: prove (or disprove) that onboarding is correct and connected end-to-end, with the heaviest scrutiny on `Auth → OnboardingFlow → relational.developmental.age_observed → dashboard`. Output is a single audit document, no production code changes unless the user later asks for fixes.

## Why this needs an audit (initial read flags real issues)

A 30-minute read of the code already surfaces structural problems that suggest "completely correct end-to-end" is currently **not** true. The audit will confirm/refute each one with Playwright.

### Suspected gaps (to be verified)

1. **Two onboarding surfaces, only one bootstraps the relational event.**
   - `/onboarding/flow` → `OnboardingFlow.tsx` (Wave3Onboarding) — calls `emitOnboardingBootstrap` → `relational.developmental.age_observed`.
   - `/onboarding/athlete` → `AthleteOnboarding.tsx` — emits `athlete.schedule.day_type` but **never** calls `emitOnboardingBootstrap`.
   - `Auth.tsx` routes users to `/select-user-role` (new) or `/onboarding/athlete` (returning without first event). **Nothing in Auth or AthleteOnboarding routes to `/onboarding/flow`.** Result: most signups never emit `relational.developmental.age_observed`.

2. **DOB source mismatch.**
   - `emitOnboardingBootstrap` reads `user.user_metadata.dob` / `date_of_birth`.
   - `Auth.tsx signUp` only collects `fullName`; DOB is never written to `user_metadata`.
   - `OnboardingFlow.tsx` itself reads DOB from `profiles.date_of_birth` (for `isMinor`), but the bootstrap function ignores that source. So even on the rare `/onboarding/flow` visit, bootstrap silently skips with `dob_missing`.

3. **`hasCompletedOnboarding` is profile-shaped, not event-shaped.**
   - `Auth.tsx` defines onboarded = `hasProfile || hasSubscription || hasRole`.
   - `handle_new_user` trigger likely backfills `profiles.full_name` from signup metadata → users land "onboarded" the moment they sign up, bypassing role/sport/module gating on first sign-in.

4. **Wave3 `/onboarding/flow` is orphaned.**
   - Grep shows no `navigate("/onboarding/flow")` in the app; only the route exists. Dead surface or intentional deep-link only?

5. **Parent invite → link activation depends on DB trigger.**
   - `AcceptParentInvite` only emits `relational.relationship.confirmed`; activation of `parent_athlete_links` is by trigger `project_relationship_to_parent_link`. Needs live verification that the row actually appears for a freshly accepted invite.

6. **Auth redirect to `/accept-parent-invite?token=…` after sign-in.**
   - URL built as `/auth?redirect=…` but `Auth.tsx` reads `state?.returnTo`/`state?.from`, not the `redirect` query param. Possible parent-side dead-end after sign-in.

## Audit method

### Static pass
- Read: `Auth.tsx`, `AthleteOnboarding.tsx`, `OnboardingFlow.tsx`, `onboardingBootstrap.ts`, `emit.ts`, `useAthleteOnboardingState.ts`, `useAthleteEvents.ts`, `DemoGate.tsx`, `SelectUserRole/Sport/Modules/Role.tsx`, `ParentInvite.tsx`, `AcceptParentInvite.tsx`, `parentLinking.ts`.
- Migrations: `handle_new_user`, `project_relationship_to_parent_link`, RLS on `asb_events` / `profiles` / `parent_athlete_links` / `parent_invite_dispatches`.
- Tests: `relational-onboarding.test.ts`, `relational-developmental.replay.test.ts`.

### Live Playwright proof (signed-in session is injected)

Run from `/tmp/browser/onboarding/` against `localhost:8080`, restoring the user's Supabase session before each scenario. Capture screenshots + read DB rows via `asb_events` / `profiles` / `parent_athlete_links` to prove or disprove each claim.

Scenarios:
1. **Fresh signup → first sign-in path.** Create a throwaway email, sign up with `fullName`, follow whatever redirect Auth produces; observe whether `relational.developmental.age_observed` ever lands in `asb_events`, and which surface is reached.
2. **Returning athlete with no canonical event.** Manipulate state to remove the first event, sign back in, verify `/onboarding/athlete` is reached and emits `athlete.schedule.day_type`.
3. **`/onboarding/flow` direct visit with DOB in profile but not metadata.** Confirm bootstrap silently skips (the suspected DOB-source bug).
4. **Parent invite full chain.** Athlete issues invite → parent signs up via `/auth?redirect=…` → accepts → verify `parent_athlete_links` row + `parent_invite_dispatches.status='accepted'`.
5. **Role/sport/module gating + DemoGate redirect** for a demo-pending user.

Each scenario records: final URL, console errors, network 4xx/5xx, and the canonical event rows actually present.

## Deliverable

`.lovable/phase-54-onboarding-end-to-end-audit.md` containing:
- Verdict per scenario (PASS / PARTIAL / FAIL) with evidence (screenshot path + ledger row IDs).
- A confirmed bug list with file:line citations and minimal-fix sketches (no code applied).
- Single top-line answer to the user's question: *Is onboarding completely correct and connected end-to-end?*

No production code, migrations, or schema changes in this phase. Fixes (if any) are proposed in a follow-up plan after the user reviews findings.
