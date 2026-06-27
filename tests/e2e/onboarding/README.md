# Phase 56 — Onboarding regression suite (live E2E)

Permanent guardrail that locks the Phase 55 onboarding repair against silent regression.

## What it covers

See [`/.lovable/phase-56-onboarding-regression-suite.md`](../../../.lovable/phase-56-onboarding-regression-suite.md) for the full invariant → test matrix.

## Run locally

```bash
# Vitest invariants (fast, no network)
npm run test:onboarding

# Playwright live E2E against the running preview (~90–120s)
#   needs: dev server on http://localhost:8080
#          LOVABLE_CLOUD_URL, LOVABLE_CLOUD_ANON_KEY in env
npm run e2e:onboarding

# Both
npm run verify:onboarding
```

The live suite creates fresh test athletes (namespaced `ve56-regression-…@example.com`), reads canonical-event row counts via REST using each athlete's own JWT (RLS-safe), and writes screenshots + a `results.json` summary under `.lovable/phase-56-evidence/`.

## Run in CI

`.github/workflows/onboarding-regression.yml` runs the suite on every PR that
touches onboarding-critical paths and on every push to `main`. The workflow
requires two repo secrets:

- `LOVABLE_CLOUD_URL` — the project's Lovable Cloud URL.
- `LOVABLE_CLOUD_ANON_KEY` — the project's publishable anon key.

## Cleanup (operator-only)

The suite never deletes anything. To clean up accumulated test users when needed:

```sql
-- Operators only. Not part of CI.
DELETE FROM auth.users WHERE email LIKE 've56-regression-%@example.com';
```
