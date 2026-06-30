## Goal
Eliminate every path that can boot a signed-in user to `/auth` mid-session, and close every gap/fragment left from the prior audit waves so the app is shippable end-to-end.

---

## Part A — Eviction-proof the session (root cause first)

The current guard is conservative but still has live failure modes. The session replay shows the user on `/index`, clicked something, and landed on `/auth` ~9s later. Likely contributors:

1. **`useRequireAuth` 1.5s grace is too short** on mobile/slow networks when Supabase WS reconnects after a tab refocus. Token refresh can take 2–4s; we evict before it completes.
2. **`AuthContext` `scheduleVerifiedSignOut` runs `getSession()` once.** If that single call returns null during a refresh race, we set `user=null` globally, which triggers every page's guard.
3. **`onAuthStateChange` `SIGNED_OUT`** can fire from a 401 on a single broken query (e.g. a stale realtime channel), not a real sign-out.
4. **No global "auth blip" suppression** — every component that calls `useRequireAuth` decides independently.
5. **Realtime sync** (just fixed) may still emit `CHANNEL_ERROR` that cascades into a 401 path on resubscribe.

### Fixes

- **Harden `AuthContext.scheduleVerifiedSignOut`**: retry `getSession()` up to 3× with 1s/2s/4s backoff before clearing `user`. Also re-check `localStorage` for a persisted `sb-*-auth-token`; if present, refuse to clear and call `supabase.auth.refreshSession()` instead.
- **Extend `useRequireAuth` grace window** from 1500ms → 5000ms, and require **two** consecutive failed `getSession()` checks 1s apart before redirect. Keep the persisted-token bail-out.
- **Add a single `AuthEvictionGuard` at App root** that owns the redirect decision. Page-level `useRequireAuth` becomes a no-op renderer of `<Navigate>` only when the root guard has authoritatively decided "signed out." Removes the N-component race.
- **Suppress SIGNED_OUT from spurious 401s**: in `AuthContext`, ignore `SIGNED_OUT` events that arrive within 10s of a `TOKEN_REFRESHED` or while `document.visibilityState === "hidden"` or while `navigator.onLine === false`.
- **Online/offline awareness**: never evict while offline; queue the decision until `online` fires + 2s settle.
- **Telemetry**: every eviction emits a `auth.eviction` observability event with reason (`no_session_after_retries`, `manual_signout`, `token_invalid_grant`). This gives us a kill-switch signal post-deploy.
- **Eternity guard**: add a script check that no page calls `navigate('/auth')` directly — all eviction must route through `AuthEvictionGuard`.

---

## Part B — Finish unshipped/fragmented work

Items the prior audit flagged as **Deferred** or partially shipped:

1. **RLS + GRANT linter sweep** across all 200+ public tables. Run `supabase--linter`, snapshot results into `docs/audits/rls-grants-2026-06-30.md`, fix any table missing GRANT or missing RLS. New audit-table list shows several `gp_*`, `iq_*`, `relational.*`-style tables with only 1 policy — verify they're intentional (read-only via security-definer) vs. broken.
2. **Edge function heartbeat audit** — apply the analyze-video heartbeat pattern to every long-running function (`import-schedule`, `gp-document-ingest`, `ask-hammer`, IQ generation). One-shot pass with a shared `withHeartbeat()` helper.
3. **Loggers UX parity polish** — Defense/Baserun/Sub loggers still lack the inline-pitches keyboard shortcuts and undo affordance density of AtBat/Pitch. Bring to identical interaction shape.
4. **GP signal → roadmap completeness** — `useGpSignal` feeds `dailyPlan.ts`, but `useRoadmapProgress` only reads bias, not the per-skill "game-shaped" deltas. Wire the per-skill weights through.
5. **Side-context coverage gaps** — `sideDifferential.ts` is read by Vault + The General; not yet read by `GameReports.tsx` heat maps or `gp_at_bats` filters. Add side filter UI to both.
6. **Sport split (SB/baseball) sweep** — re-run grep for `(SB)` / `softball-only` / `baseball-only` across `src/data/`, `src/components/iq/`, and Hammer drill catalogs. Gate any survivors.
7. **Onboarding resume** — `ReviewAnswersStep` exists but the resume banner doesn't deep-link to the exact failing step when injury intake is the gap. Fix routing.
8. **Calendar importer** — image-paste path still has no timeout indicator after the 45s ceiling. Surface "took too long, try fewer items" UI.
9. **Drift markers** — re-run `rg 'TODO|FIXME|HACK|stub|placeholder|legacy|deprecated'` and triage any new occurrences since the last audit. Each gets a fix or an explicit `// AUDIT-EXEMPT: <reason>` annotation that the eternity guard recognizes.
10. **Eternity guard expansion** — add checks for: direct `navigate('/auth')`, raw `supabase.auth.signOut()` outside `AuthContext`, missing `user_id` filter on any `supabase.from('<rls-table>').select()` in client code.

---

## Verification

- `bunx tsgo --noEmit` clean.
- `bunx vitest run` green.
- `bash scripts/preflight.sh` green (with new guards).
- Playwright smoke `/tmp/browser/audit-eviction/`: sign in → visit Home → Calendar → IQ → Games → Hammer → simulate tab-hide/show + offline/online toggle + 30s idle. **Zero `/auth` redirects.**
- `supabase--linter` snapshot saved; all critical findings resolved.

## Deliverables

- `docs/audits/full-app-audit-2026-06-30-part2.md` with findings + fixes + remaining deferrals.
- `src/components/auth/AuthEvictionGuard.tsx` (new) + refactored `useRequireAuth`.
- `supabase/functions/_shared/withHeartbeat.ts` applied to long-running functions.
- Eternity-guard additions in `scripts/check-eternity-guards.sh`.

## Size
~20–30 surgical edits, no schema changes, no new routes, no UI redesigns.

## Out of scope
Visual redesigns, new product surfaces, destructive migrations, file renames.