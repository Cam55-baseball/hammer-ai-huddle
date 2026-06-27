# Phase 56 — Onboarding Regression Suite

**Status:** ✅ LANDED — automated regression suite in place.
**Authority:** Locks the Phase 55 onboarding repair against silent regression.
**Owner of doctrine:** Any modification to onboarding, auth, routing, profiles, parent invites, or canonical-event logic must extend this suite, not bypass it.

---

## 0. Doctrine

> Onboarding is the only path that converts a signed-up identity into a measurable athlete.
> Therefore, **every protected invariant below must be machine-verified before any change to onboarding-adjacent code can be deployed.**
> Silent regression of any I-numbered invariant is treated as a constitutional failure.

The suite is intentionally split into two layers:

| Layer | Purpose | Cost | Runs |
|---|---|---|---|
| **Vitest invariants** (`test:onboarding`) | Deterministic logic contracts — gate routing, redirect safety, bootstrap idempotency. | ~1s | Every PR, unconditionally. |
| **Playwright live E2E** (`e2e:onboarding`) | Real signups, real Supabase, real DB row counts, real browser. | ~90–120s | Every push to `main`; PRs that touch onboarding-critical paths. |

Both layers are wired through `package.json` scripts (`test:onboarding`, `e2e:onboarding`, `verify:onboarding`) so the same gate that runs in CI runs locally with no flag drift.

---

## 1. Protected invariants → tests

Every invariant has at least one test. Each test is tagged in source with its `I*` number for grep-ability.

| # | Invariant | Protected by |
|---|-----------|--------------|
| **I1** | Fresh athlete signup walks the canonical flow and reaches event emission. | `tests/e2e/onboarding/run.mjs` → **S1** |
| **I2** | Returning athlete (canonical-event-emitting) is routed past `/auth` (and never stranded in onboarding). | Vitest: `authGateDecision` cases (hasFirstEvent / hasRole / scout). E2E: **S2**. |
| **I3** | Athlete without the canonical first event is redirected back into `/onboarding/athlete`. | Vitest: gate case `hasFirstEvent=false, hasRole=false`. E2E: **S3+S8**. |
| **I4** | Exactly one `relational.developmental.age_observed` event exists per athlete. | Vitest: bootstrap idempotency cases (single emission, profile-DOB precedence). E2E: **DB count via REST**. |
| **I5** | Exactly one `athlete.schedule.day_type` event exists per athlete. | E2E: **DB count via REST** after S1 completes the canonical walk. |
| **I6** | Duplicate bootstrap events can never occur (repeated mounts, concurrent invocations, missing DOB → still no fabrication). | Vitest: 3 explicit cases (3 reloads, 5 concurrent, dual missing-DOB sources). E2E: **S7** (3 reloads under live conditions). |
| **I7** | Parent invite survives authentication: `?redirect=/accept-parent-invite?token=…` round-trips through signup with the token intact. | Vitest: `resolveRedirect` contract (7 cases: relative/protocol-relative/absolute/javascript:/fallthrough/null/token-preservation). E2E: **S5**. |
| **I8** | `/onboarding/flow` always redirects away (legacy path). | E2E: **S6**. |
| **I9** | `/dashboard` is gated — athletes with zero canonical events cannot reach it. | E2E: **S3+S8** (settle assertion on `/onboarding/athlete`). |
| **I10** | Mobile onboarding remains functional (390×844 viewport). | E2E: **S9** (mobile viewport, welcome heading visible, signals clean). |
| **I11** | No app-level console errors during any onboarding scenario. | E2E: `attachSignalCapture` `appErrors` assertion in every scenario. |
| **I12** | No React warnings during any onboarding scenario. | E2E: `attachSignalCapture` `reactWarnings` assertion in every scenario. |
| **I13** | No unexpected Supabase errors. | E2E: `attachSignalCapture.supabaseErrors`; only `ALLOWED_SUPABASE_ERRORS` permitted. |
| **I14** | No failed critical network requests (`/auth/v1/`, `/rest/v1/asb_events`, `/rest/v1/profiles`, `/rest/v1/parent_athlete_links`, `/rest/v1/user_roles`, `/functions/v1/`). | E2E: `attachSignalCapture.criticalNetworkFailures` asserted clean. |
| **I15** | No authentication race conditions — gate decision is a pure function of inputs; terminal URL is stable for ≥1s after navigation. | Vitest: 50-iteration determinism check on `authGateDecision`. E2E: `assertTerminalUrl` re-reads URL after a 1s hold. |

### Allow-listed pre-existing errors

The suite explicitly allow-lists exactly one class of error inherited from before Phase 55:

- `athlete.lifecycle.signup` topic FK violation (`asb_events_topic_id_fkey`), emitted by `AuthContext.tsx` on signup. Tracked in the Phase 55 backlog. Allow-listed in both `ALLOWED_SUPABASE_ERRORS` (console) and the 409-on-`/asb_events` network filter.

Adding any entry to the allow-list requires:
1. A row in this document explaining what the error is and why it is tolerable.
2. A backlog ticket to remove it.

---

## 2. How the suite is executed

### Local

```bash
# Fast: deterministic invariants only (no network, no browser).
npm run test:onboarding

# Slow: live signups + browser + DB row-count proofs.
#   Requires: dev server on http://localhost:8080
#             LOVABLE_CLOUD_URL, LOVABLE_CLOUD_ANON_KEY in env.
npm run e2e:onboarding

# Both, in order.
npm run verify:onboarding
```

### CI

`.github/workflows/onboarding-regression.yml`:

- **`unit-invariants` job** — runs `npm run test:onboarding` on every PR and every push to `main`. Unconditional.
- **`live-e2e` job** — runs `npm run e2e:onboarding` on every push to `main`, and on PRs that change any path in the **scope list** (below). Builds the app, starts `vite preview`, polls until ready, then drives the Playwright runner against the real Lovable Cloud project. Evidence (screenshots + `results.json`) is uploaded as a workflow artifact.

A pre-flight grep step in CI hard-fails the job if `.only`, `.skip`, or `.todo` appears in the regression suite source — the suite must never silently shrink.

### Scope list (paths that trigger live E2E)

- `src/pages/Auth.tsx`
- `src/pages/AthleteOnboarding.tsx`
- `src/pages/AcceptParentInvite.tsx`
- `src/pages/ParentInvite.tsx`
- `src/App.tsx`
- `src/lib/runtime/relational/**`
- `src/hooks/useAthleteOnboardingState.ts`
- `src/hooks/useAthleteEvents.ts`
- `src/contexts/AuthContext.tsx`
- `src/integrations/supabase/**`
- `tests/e2e/onboarding/**`

Editing any of these without the live E2E going green is a constitutional violation.

---

## 3. Runtime expectations

| Layer | Median | Soft budget |
|---|---|---|
| `test:onboarding` | ~1.3s for 19 invariants | < 5s |
| `e2e:onboarding`  | ~90–120s for the 8-scenario matrix | < 240s |
| `verify:onboarding` | ~100–130s end to end | < 300s |

If the E2E suite exceeds the soft budget, the first action is to split it across parallel browser contexts (already structured per-scenario), **not** to remove scenarios.

---

## 4. How future onboarding changes must extend the suite

Mandatory protocol:

1. **Add or modify** a test before merging any change to a scope-list path. If your change introduces a new code path, add it under a new `I*` number in §1.
2. **Never weaken an assertion** to make a flaky test pass. Stabilize the underlying behavior instead, or quarantine in a separate suite — never inside `onboarding-regression.test.ts` or `tests/e2e/onboarding/`.
3. **Never use `.only`, `.skip`, or `.todo`** in the regression suite. CI hard-fails this.
4. **Allow-listing a new error** requires both a doc row in §1 and a backlog ticket.
5. **Removing an invariant** requires a constitutional review note in `.lovable/` documenting why the invariant is no longer protective.
6. **New canonical event** added to onboarding → add an I-numbered exactly-one assertion (Vitest for emit shape, E2E for DB count) mirroring I4/I5.
7. **New onboarding sub-route** → add an E2E scenario asserting both terminal URL and the no-console-error / no-React-warning signals.

---

## 5. Evidence

- Vitest run (this commit): **19/19 PASS** in 1.23s.
- Playwright runner: `tests/e2e/onboarding/run.mjs` (runs identically locally and in CI).
- Screenshots and DB-count summaries land at `.lovable/phase-56-evidence/` and are uploaded as the `phase-56-evidence` artifact on every CI run.

---

## 6. Files added by this phase

| Path | Role |
|------|------|
| `src/lib/runtime/relational/__tests__/onboarding-regression.test.ts` | Vitest invariants (19 cases). |
| `tests/e2e/onboarding/run.mjs` | Playwright live E2E runner (8 scenarios + DB asserts). |
| `tests/e2e/onboarding/README.md` | Local-run instructions. |
| `.github/workflows/onboarding-regression.yml` | CI gate (unit + live E2E with scope filter). |
| `package.json` | Added `test:onboarding`, `e2e:onboarding`, `verify:onboarding` scripts. |
| `.lovable/phase-56-onboarding-regression-suite.md` | This doctrine document. |

**No production code paths were modified by Phase 56.** The suite is observation-only and gate-only.
