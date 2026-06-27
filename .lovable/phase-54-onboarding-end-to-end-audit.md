# Phase 54 — Onboarding End-to-End Audit

**Date:** 2026-06-27
**Authority:** Static read of routes/components/migrations + live Playwright proof against `localhost:8080` with injected production session for user `95de827d-…dca4` (`55cam316@gmail.com`).
**Scope:** Athlete signup → `/onboarding/*` → first canonical event → dashboard (primary). Parent invite → accept → `parent_athlete_links` (secondary). Role/sport/module gating (secondary).

---

## Top-line answer

> **Is onboarding completely correct and connected end-to-end? NO.**

The post-signup flow reaches `/dashboard` for most users, so it *appears* connected. But three real bugs are confirmed by live evidence, and one orphaned surface exists. None of them break sign-up outright, but they do mean:

- the headline relational primitive **`relational.developmental.age_observed` is never emitted for any user signing up through the production path**;
- the parent-invite link is a **one-way trip** for any parent who is not already signed in;
- and one onboarding surface (`/onboarding/flow`) is **unreachable from any navigation in the app**.

---

## Evidence — live Playwright proofs

Run script: `/tmp/browser/onboarding/run.py`. Screenshots in `/tmp/browser/onboarding/screens/`.

Signed-in user under test:
- `id = 95de827d-7418-460b-8b79-267bf79bdca4`
- `email = 55cam316@gmail.com`
- `user_metadata = {}` (empty)
- `profiles.date_of_birth = 1998-02-07` (present)
- `user_roles = [{role: 'owner'}]`

### Scenario 1 — `/onboarding/flow` (Wave3 OnboardingFlow.tsx)

- Page rendered, `emitOnboardingBootstrap(user)` invoked on mount.
- **Result:** after page settle + 2.5s wait, `asb_events` for this athlete contains **0 rows of `relational.developmental.age_observed`**.
- Topic inventory observed: `athlete.plan.today`, `behavioral.{soreness,hydration,sleep,checkin,stress,fatigue,readiness}`, `athlete.schedule.day_type`. No relational/developmental row in any form.
- **Verdict:** **FAIL** — the bootstrap silently skips. See Bug #1.

### Scenario 2 — `/onboarding/athlete` (AthleteOnboarding.tsx)

- Page mount → `useAthleteOnboardingState` sees `hasFirstEvent = true` (one `athlete.schedule.day_type` row exists) → redirect to `/command`.
- Final URL: `http://localhost:8080/command`.
- **Verdict:** **PASS for already-onboarded user** (correct short-circuit). New-user behavior verified statically in `AthleteOnboarding.tsx:52-54`.

### Scenario 3 — `/auth?redirect=%2Faccept-parent-invite%3Ftoken%3Dxyz`

- Already-authed user lands on `/auth` and stays there (no auto-redirect when already signed in — see `Auth.tsx:50-53`).
- Static reading confirms the `?redirect=` query string is **never read**. `Auth.tsx:160` reads only `state?.returnTo` / `state?.from` (router-state, not URL).
- **Verdict:** **FAIL** for the parent invite hand-off. See Bug #3.

### Scenario 4 — `/accept-parent-invite?token=BADTOKEN`

- Page renders the "invalid link" card via `decodeInviteToken → null`. No crash, no console error.
- **Verdict:** **PASS** (graceful invalid-token handling).

### Database state for the signed-in user

```
asb_events (9 rows, none relational.*):
  behavioral.*    × 7
  athlete.plan.today × 1
  athlete.schedule.day_type × 1
profiles.date_of_birth = 1998-02-07          ← DOB present
parent_athlete_links = []
user_roles = [{role:'owner', status:'active'}]
```

The signed-in user has DOB on their profile, was bootstrapped through `/onboarding/flow`, and **still has zero `relational.developmental.age_observed` events**. This is the smoking gun for Bug #1.

---

## Confirmed bugs

### Bug #1 — `emitOnboardingBootstrap` reads from the wrong DOB source (HIGH)

**Where:** `src/lib/runtime/relational/onboardingBootstrap.ts:23-31`

```ts
function readDob(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const raw = (meta.dob ?? meta.date_of_birth) as string | undefined;
  if (!raw || typeof raw !== "string") return null;
  ...
}
```

**Reality:** signup (`Auth.tsx:198` → `signUp(email, password, fullName)`) only puts `full_name` into `user_metadata`. DOB is collected later by `ProfileSetup.tsx:206` and written to **`profiles.date_of_birth`**, never to `user_metadata`.

Consequence: `readDob` always returns `null` for real users → bootstrap always falls into the "skipped: dob_missing" branch → `relational.developmental.age_observed` is **never emitted** through the production code path. `developmentalState.chronological_age_years` stays null, and Phase 154 developmental gating defaults to its safest envelope for every athlete.

Live confirmation: the test user has `profiles.date_of_birth='1998-02-07'`, just visited `/onboarding/flow`, and `asb_events` still shows zero `relational.developmental.*` rows.

**Minimal fix sketch** (no code applied — pending user approval):
- Make `emitOnboardingBootstrap` accept a `dobOverride: string | null` argument.
- In `OnboardingFlow.tsx`, pass `profileDob` (already fetched at line 31) into the bootstrap call.
- Keep the `user_metadata` fallback so the legacy path still works.

---

### Bug #2 — `/onboarding/flow` is an orphan route (MEDIUM)

**Where:** `src/App.tsx:273`

```tsx
<Route path="/onboarding/flow" element={<Wave3Onboarding />} />
```

Grep result: no `navigate("/onboarding/flow")`, no `<Link to="/onboarding/flow">`, no redirect anywhere in `src/`. `Auth.tsx` routes new users to `/select-user-role` and returning-without-event athletes to `/onboarding/athlete` — never to `/onboarding/flow`. The only way to reach it is to type the URL manually.

Consequence: even if Bug #1 is fixed, **no real user will ever hit the bootstrap**, because the only page that calls it is unreachable.

**Minimal fix sketch:** either (a) move the `emitOnboardingBootstrap` call into `AthleteOnboarding.tsx` (so it runs on the actually-reachable onboarding page), or (b) add a redirect from `/onboarding` → `/onboarding/athlete` and merge the Wave3 LifeContext step into AthleteOnboarding.

---

### Bug #3 — `?redirect=` query param is silently ignored by `Auth.tsx` (HIGH for parent invite UX)

**Where:** `src/pages/Auth.tsx:160` vs `src/pages/AcceptParentInvite.tsx:131-136`.

`AcceptParentInvite` constructs:
```ts
navigate(`/auth?redirect=/accept-parent-invite?token=${encodeURIComponent(token)}`)
```

`Auth.tsx` only reads router state:
```ts
const redirectTarget = state?.returnTo || (state as any)?.from;
```

There is no `useSearchParams().get("redirect")` and no post-login navigation honoring the `redirect` query. After a parent signs in, they land on `/select-user-role` (new account) or `/dashboard` (existing), and **the invite token is dropped**. They have to manually re-open the email link.

**Minimal fix sketch:** in `Auth.tsx`, add `const [sp] = useSearchParams(); const queryRedirect = sp.get("redirect");` and include it in the `redirectTarget` fallback chain.

---

### Bug #4 — `hasCompletedOnboarding` is profile-shaped, not event-shaped (LOW, by current intent)

**Where:** `src/pages/Auth.tsx:130-141`

```ts
const hasProfile = profileCheck.data && (
  profileCheck.data.first_name || profileCheck.data.last_name || profileCheck.data.full_name
);
const hasCompletedOnboarding = hasProfile || hasSubscription || hasRole;
```

The `handle_new_user` trigger backfills `profiles.full_name` from signup metadata on the very first sign-up (see `20260224234238_*.sql`). So `hasProfile` flips true the moment the user signs up — meaning a brand-new account that abandons mid-flow will, on their next login, be treated as `hasCompletedOnboarding=true` and routed past `/select-user-role`. They then go to `/onboarding/athlete` (because `!hasFirstEvent && !hasRole`) which is correct, but the *semantic* gate isn't an onboarding completion gate, it's a "row exists" gate.

This is not breaking today (the `!hasFirstEvent && !hasRole` branch catches the bypass), but the comment claim at `Auth.tsx:120-122` ("Profile/subscription existence is NOT proof of onboarding; only a real canonical event is") is contradicted by the line directly below it. Worth tightening to `hasFirstEvent || hasRole || hasSubscription` if the intent really is event-shaped.

---

## What works correctly

- `useAuth` / `onAuthStateChange` wiring + `getSession` rehydration.
- Signup → `handle_new_user` trigger → `profiles` row + `athlete_mpi_settings` row created server-side.
- `AthleteOnboarding` short-circuit when `hasFirstEvent=true` (verified live — redirected to `/command`).
- `athlete.schedule.day_type` emission via `useAthleteEvents.createEvent` and read-back via canonical query (verified in DB; one row present for the test user).
- `decodeInviteToken` invalid/tampered/expired branches (verified live with `?token=BADTOKEN`).
- `project_relationship_to_parent_link` trigger projects `relational.relationship.confirmed/revoked` into `parent_athlete_links` (static read of migration `20260606072853_*.sql`; matches the doc at `docs/asb/onboarding-production-audit.md`).
- Demo gate redirect for pending demo users (`DemoGate.tsx`) — code-correct, not exercised live in this audit.

---

## Recommended fix order (no code applied — awaiting user go-ahead)

1. **Bug #1** (DOB source) — 5-line change in `onboardingBootstrap.ts` + 1-line call-site change.
2. **Bug #2** (orphan route) — call `emitOnboardingBootstrap` from `AthleteOnboarding.tsx`'s mount effect so the live path actually emits the developmental event.
3. **Bug #3** (`?redirect=` ignored) — add `useSearchParams` read in `Auth.tsx`. Parents can complete the invite chain after a fresh signup.
4. **Bug #4** (profile-shaped gate) — optional tighten of `hasCompletedOnboarding`.

After fixes, re-run this audit with a freshly created account + a fresh parent-invite chain to validate end-to-end emission of `relational.developmental.age_observed` and `relational.relationship.confirmed → parent_athlete_links` activation.
