
# Onboarding End-to-End Repair Plan

Goal: every athlete (and every parent following an invite) exits onboarding with a real canonical ledger state, no dead routes, no orphan paths, and no premature dashboard entry — proven with fresh-account Playwright runs against the live preview.

## 1. Bug map → fix map

| # | Defect | Fix |
|---|---|---|
| B1 | `emitOnboardingBootstrap` reads `user_metadata.dob`, but signup never writes it. `relational.developmental.age_observed` is never emitted in production. | Bootstrap reads from canonical `profiles.date_of_birth` first; falls back to `user_metadata.dob`/`date_of_birth`. Emits only when present; explicit missingness otherwise (constitutional). |
| B2 | `AthleteOnboarding.tsx` is the route real athletes hit and never calls the relational bootstrap. `OnboardingFlow.tsx` (Wave3) is orphan. Two divergent surfaces. | Collapse to one canonical flow. `AthleteOnboarding` calls `emitOnboardingBootstrap` on mount. `/onboarding/flow` is redirected to `/onboarding/athlete` (route alias) and `OnboardingFlow.tsx` is removed. |
| B3 | `Auth.tsx` ignores `?redirect=` query param used by `AcceptParentInvite`. Parents sign in and land on the dashboard, not the invite. | `Auth.tsx` reads `redirect` from `useSearchParams()` AND `state.returnTo`/`state.from`. Same-origin/relative-path allowlist only. Applied to both signup and signin success paths. |
| B4 | `hasCompletedOnboarding = hasProfile \|\| hasSubscription \|\| hasRole`. `handle_new_user` trigger backfills `profiles.full_name` at signup → users appear onboarded the instant they sign up, bypassing role/sport/event gating. | New definition: `hasCompletedOnboarding = hasFirstEvent \|\| hasRole` (canonical ledger event is the only proof of athlete onboarding; non-athlete roles like scout/admin remain valid). Profile/subscription existence no longer counts. Premature dashboard entry blocked. |
| B5 | `AcceptParentInvite` redirects to `/` after accept, losing the originating context; no proof of `parent_athlete_links` activation in UI. | After accept, poll `parent_athlete_links` for active row (short timeout) and route to a deterministic landing (`/parent-athletes`) with success toast. If the row doesn't appear, surface a non-fatal warning + replay link instead of silent navigation. |

## 2. Code changes (concrete, minimal)

### `src/lib/runtime/relational/onboardingBootstrap.ts`
- New signature: `emitOnboardingBootstrap(user, { profileDob? }, nowISO?)`.
- Resolution order for DOB: `profileDob` → `user_metadata.dob` → `user_metadata.date_of_birth` → null.
- Preserves existing idempotency (occurred_at pinned to DOB anchor; canonical idempotency_key collapse).
- No emission when DOB missing (explicit missingness preserved per Phase 151).

### `src/pages/AthleteOnboarding.tsx`
- Read `profiles.date_of_birth` via existing `supabase` client.
- Call `emitOnboardingBootstrap(user, { profileDob })` once per mount (in-process ref guard, mirroring `OnboardingFlow.tsx`).
- Existing `athlete.schedule.day_type` emit chain unchanged.

### `src/pages/OnboardingFlow.tsx` + `src/App.tsx` router
- Delete `OnboardingFlow.tsx`.
- Replace route `/onboarding/flow` with `<Navigate to="/onboarding/athlete" replace />`. Any internal links updated by grep.

### `src/pages/Auth.tsx`
- Add `useSearchParams()` and a `resolveRedirect()` helper that returns the first valid same-origin path among: `searchParams.get("redirect")`, `state?.returnTo`, `state?.from`. Must start with `/` and not contain `://`.
- Sign-in success: if `resolveRedirect()` returns a path, navigate there before any onboarding-status branching.
- Sign-up success: same — preserve `redirect` so parents who sign up via invite return to `/accept-parent-invite?token=…`.
- Onboarding check rewritten:
  - `hasCompletedOnboarding = hasFirstEvent || hasRole` (drop `hasProfile`/`hasSubscription` from the gate).
  - Scout/admin/owner branches unchanged (driven by `hasRole`).
  - Athletes without `hasFirstEvent` → `/onboarding/athlete`. Athletes with → `/dashboard`.

### `src/hooks/command/useAthleteOnboardingState.ts`
- Already exposes `hasFirstEvent`. No change.

### `src/pages/AcceptParentInvite.tsx`
- After successful `acceptParentInvite`, poll `parent_athlete_links` (max ~3s, 3 tries) for the active row; on success route to `/parent-athletes`. On miss, leave user on the page with a degraded-but-honest message and a manual retry button. No silent `/` navigation.
- `signInPrompt` button already passes `?redirect=…` — confirmed once `Auth.tsx` honors it.

### Tests (added, deterministic)
- `src/lib/runtime/relational/__tests__/relational-onboarding.test.ts`: add cases (a) DOB from `profileDob` arg emits one event; (b) `profileDob` precedes `user_metadata`; (c) both absent → no emission.

## 3. End-to-end Playwright proof (the only thing that closes the loop)

Run from `/tmp/browser/phase55/`. Each scenario starts a fresh Chromium context, uses fresh throwaway emails, and after the UI flow reads the DB directly through the user's authenticated supabase-js to verify ledger truth. Screenshots + JSON evidence written under `screenshots/` and `evidence/`.

Auth note: Supabase `signup` requires email confirmation by default on this project. The plan is to use `supabase.auth.admin`-equivalent flow via the user's anon client + the **existing** "Auto-confirm new email signups" setting on this project (already enabled per earlier phases). If signups need confirmation, fall back to using the user's pre-injected session (`LOVABLE_BROWSER_AUTH_STATUS=injected`) for an existing athlete and a freshly created athlete via a one-off sign-up using a throwaway email + confirm via direct Supabase Admin SQL through `supabase--migration`/`supabase--read_query` is out of scope; we will gate the plan on auto-confirm being on. If it's off when execution starts, we will request enabling it before continuing rather than fabricating evidence.

Scenarios and pass criteria:

1. **Fresh athlete signup** — fill DOB on profile during onboarding, complete `athlete.schedule.day_type`, land on `/dashboard`. Verify:
   - `asb_events` rows: exactly one `relational.developmental.age_observed` AND exactly one `athlete.schedule.day_type`.
   - `relational.developmental.age_observed` idempotent under re-mount (re-visit `/onboarding/athlete` → still exactly one row).
2. **Fresh athlete signup with no DOB** — completes flow; verify zero `relational.developmental.age_observed` rows (explicit missingness), one `athlete.schedule.day_type` row, lands on `/dashboard`.
3. **Returning athlete with first event** — sign in → routed straight to `/dashboard` (not `/onboarding/athlete`), no duplicate bootstrap rows.
4. **Returning athlete WITHOUT first event** (simulated by deleting their `asb_events`) — sign in → routed to `/onboarding/athlete`, can complete and emit.
5. **`/onboarding/flow` deep link** — redirects to `/onboarding/athlete`, no orphan render.
6. **Parent invite full chain** — athlete A issues invite → parent B opens `/accept-parent-invite?token=…` while signed out → clicks Sign in → `/auth?redirect=/accept-parent-invite?token=…` → completes signup → returned to invite page → accepts → `parent_athlete_links` row active, `parent_invite_dispatches.status='accepted'`, lands on `/parent-athletes`.
7. **Console + network audit** — for each scenario assert zero `console.error` events and zero `>=400` network responses on the critical paths.

Each scenario's verdict and evidence ID list is appended to `.lovable/phase-55-onboarding-end-to-end-proof.md` with the final top-line answer.

## 4. Stop conditions

- Any scenario fails → fix → re-run all scenarios. No partial PASS report.
- Success is declared only when scenarios 1–7 all PASS with on-disk screenshots + DB row evidence and zero console/network errors on the critical paths.

## 5. Out of scope

- Wave3 life-context check-in copy/UX (the orphan `OnboardingFlow` carries that; if we want to preserve life-context emission, port the `LIFE_CONTEXT_CHECKIN` step into `AthleteOnboarding` as a follow-up phase — not required for the canonical-event end-to-end fix and the user did not request it).
- Schema / migration changes. None required.
- `handle_new_user` trigger behavior. Unchanged; we just stop treating its profile backfill as proof of onboarding.

## Technical notes

- `Auth.tsx` redirect allowlist: `redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("://")`. Anything else is dropped and the normal onboarding gate runs.
- `useAthleteOnboardingState` already returns `hasFirstEvent` from `asb_events` count — reused as the single source of truth.
- Bootstrap idempotency relies on `occurred_at = ${dob}T00:00:00.000Z` and the canonical `idempotency_key = sha256(athlete_id + topic_id + occurred_at + canonical(payload))`. Re-running across days/devices collapses to the same DB row.
- `parent_athlete_links` activation is driven by the existing `project_relationship_to_parent_link` trigger on `asb_events`. The new poll is purely a UI confirmation; it never writes.

