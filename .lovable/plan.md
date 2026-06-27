
# Phase 56 — Onboarding Regression Suite

## Objective

Lock the Phase 55 onboarding repair against silent regression. **No production code changes.** Only tests, scripts, a CI workflow, and documentation are added.

## Deliverables

1. `src/lib/runtime/relational/__tests__/onboarding-regression.test.ts` — Vitest unit invariants (fast, no network).
2. `tests/e2e/onboarding/onboarding.regression.spec.ts` — Playwright live E2E (real signups against Lovable Cloud, mirrors Phase 55 proof).
3. `tests/e2e/onboarding/README.md` — how to run locally and in CI.
4. `package.json` script additions: `test:onboarding`, `e2e:onboarding`, `verify:onboarding` (runs both).
5. `.github/workflows/onboarding-regression.yml` — CI workflow that fails the verification pipeline on any onboarding invariant violation.
6. `.lovable/phase-56-onboarding-regression-suite.md` — the canonical regression doctrine doc.

## Invariant → test coverage matrix

| # | Invariant | Layer | Test |
|---|---|---|---|
| I1 | Fresh athlete signup succeeds | Playwright | `S1 fresh-athlete-signup` (walks Welcome → Schedule emit) |
| I2 | Returning athlete skips onboarding | Vitest + Playwright | unit: `Auth gate routes to /dashboard when hasFirstEvent=true`; live: `S2 returning-athlete-routes-past-auth` |
| I3 | Athlete without canonical first event is redirected back into onboarding | Vitest + Playwright | unit: `Auth gate routes to /onboarding/athlete when hasFirstEvent=false`; live: `S3 no-first-event-redirects-to-onboarding` |
| I4 | Exactly one `relational.developmental.age_observed` per athlete | Vitest + Playwright | unit: `emitOnboardingBootstrap is idempotent across N invocations`; live: psql assertion `COUNT(*) = 1` after 3 reloads |
| I5 | Exactly one `athlete.schedule.day_type` per athlete | Playwright | live: psql assertion after S1 walk + one reload |
| I6 | Duplicate bootstrap events can never occur | Vitest | `bootstrap dedup by sha256 idempotency_key across concurrent + sequential calls`; missing-DOB skip produces zero rows |
| I7 | Parent invite survives authentication and activates | Vitest + Playwright | unit: `AcceptParentInvite poll resolves once link row appears`; live: `S5 redirect+token round-trip survives signup` (UI-level activation covered by `parent-linkage.test.ts`) |
| I8 | `/onboarding/flow` always redirects correctly | Playwright | `S6 legacy-flow-redirects` — asserts no `/onboarding/flow` ever rendered |
| I9 | Dashboard cannot be accessed before canonical onboarding is complete | Playwright | `S8 dashboard-gate-blocks-zero-event-athlete` |
| I10 | Mobile onboarding remains functional | Playwright | `S9 mobile-onboarding-renders` (390×844 viewport) |
| I11 | No console errors | Playwright | per-scenario filter on `page.on("console", "error")`, excluding the dev-only Vite SW MIME noise and React Router v7 advisory; assertion: `app_errors == 0` |
| I12 | No React warnings | Playwright | per-scenario filter on `Warning:` substrings; assertion: `react_warnings == 0` |
| I13 | No Supabase errors | Playwright | per-scenario filter on 4xx/5xx from `/auth/v1`, `/rest/v1`, `/functions/v1` for the onboarding-critical tables (`asb_events`, `profiles`, `parent_athlete_links`); the pre-existing `athlete.lifecycle.signup` topic FK 409 is allow-listed with a TODO referencing the Phase 55 backlog |
| I14 | No failed critical network requests | Playwright | same listener; status ≥ 400 on the critical-path endpoints fails the test |
| I15 | No authentication race conditions | Vitest + Playwright | unit: `Auth.tsx redirect resolution is deterministic given session+ledger state`; live: assert each scenario reaches a single terminal URL within 4s and stays there for 1s |

## Suite runtime expectations

- **Vitest invariants**: cold run < 5s; runs on every PR via the existing test infrastructure plus the new `test:onboarding` filter.
- **Playwright live E2E**: ~90–120s end-to-end; spins up 3 fresh signups against Lovable Cloud (signup auto-confirms in this project), writes DOB via REST, drives the live preview, and asserts DB row counts via `psql`.

## CI wiring

`package.json` additions (no removal/edit of existing scripts):

```text
"test:onboarding": "vitest run src/lib/runtime/relational/__tests__/onboarding-regression.test.ts",
"e2e:onboarding": "node tests/e2e/onboarding/run.mjs",
"verify:onboarding": "npm run test:onboarding && npm run e2e:onboarding"
```

`.github/workflows/onboarding-regression.yml` triggers:

- **Always on PR**: `npm run test:onboarding` (Vitest invariants).
- **On PR when paths touched**: `src/pages/Auth.tsx`, `src/pages/AthleteOnboarding.tsx`, `src/pages/AcceptParentInvite.tsx`, `src/pages/ParentInvite.tsx`, `src/lib/runtime/relational/**`, `src/hooks/useAthleteOnboardingState.ts`, `src/hooks/useAthleteEvents.ts`, `src/App.tsx`, `src/integrations/supabase/**` → also run `npm run e2e:onboarding`.
- **On push to `main`**: full `verify:onboarding`.
- Any failure marks the workflow red and (per repo settings) blocks merge / deploy.

CI needs two repo secrets (instruction in the doc, not committed):

- `LOVABLE_CLOUD_URL` — the Lovable Cloud project URL.
- `LOVABLE_CLOUD_ANON_KEY` — the publishable anon key.

The dev server is started inline by the workflow: `npm ci && npm run build && npx vite preview --port 8080 &` then `npx wait-on http://localhost:8080`. DB invariants (I4, I5) use the project's REST API rather than psql in CI (psql isn't guaranteed in GitHub-hosted runners), querying `asb_events` filtered by the fresh test athlete UIDs with the anon key + the just-signed-in user JWT.

## Doctrine — how future changes must extend (not bypass) the suite

The `.lovable/phase-56-onboarding-regression-suite.md` doc states:

1. **No invariant may be deleted.** New PRs may only *add* invariants. Removing or weakening I1–I15 requires explicit constitutional review and an entry in `.lovable/`.
2. **Every PR touching the gated paths (above) must add a regression test** if the change introduces a new branch, redirect target, gate condition, canonical topic, or invite/role surface. The CI workflow's `paths:` filter is the enforcement mechanism — touching a gated path without touching the suite earns a review-time pushback.
3. **The Playwright suite is the source of truth** for end-to-end onboarding behavior. Unit tests may not replace E2E coverage; they may only deepen it.
4. **Allow-listed noise is explicit.** The pre-existing `athlete.lifecycle.signup` topic FK 409 is the only allow-listed Supabase error and is annotated with a backlog reference. Any new allow-list entry requires a code comment + a row in the doc explaining why.
5. **No `skip`, `only`, or `todo` may be merged in this suite.** CI fails on detection.

## Technical notes

- The Playwright runner is plain Node (no separate Playwright config needed) — `tests/e2e/onboarding/run.mjs` uses `playwright-core` against the bundled Chromium, mirroring `/tmp/browser/phase-55/run.py` but in JS so it runs on a stock GitHub runner with `npx playwright install --with-deps chromium`.
- The unit test imports `emitOnboardingBootstrap` directly and reuses the existing fixture pattern from `relational-onboarding.test.ts` (which already passes 7 cases) so we don't duplicate mock infrastructure.
- The test athlete accounts created by Playwright are namespaced `ve56-regression-…@example.com`. The doc includes a cleanup SQL snippet operators may run on demand (not part of the suite — we never delete in CI).
- No edits to `src/integrations/supabase/client.ts`, `.env`, or `supabase/config.toml`.
- No changes to any file under `src/pages/`, `src/lib/runtime/`, or anything that affects runtime behavior. The suite is purely observational.

## Out of scope

- Refactors of `Auth.tsx`, `AthleteOnboarding.tsx`, `AcceptParentInvite.tsx`, or `onboardingBootstrap.ts`.
- Changes to the `athlete.lifecycle.signup` topic FK issue (backlog from Phase 55).
- Changes to role-selection / subscription gating (the `/start-here?intent=…` interceptor observed in Phase 55).
