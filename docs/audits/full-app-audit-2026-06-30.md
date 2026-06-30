# Full-App Bug, Drift & Fragmentation Audit — 2026-06-30

Scope: Auth, Onboarding, Hammer, Calendar/Schedule, Game Performance, Video,
Side Context, Competition Level, Game IQ 101, The General, sport split,
infrastructure, Cloud/DB.

## Findings shipped this pass

| # | Severity | Module | File:line | Fix |
|---|----------|--------|-----------|-----|
| 1 | **Critical** | Realtime sync | `src/hooks/useUnifiedDataSync.ts` | Reconnect loop hammered the realtime endpoint every few seconds because `CLOSED` (fired by our own cleanup) re-entered `attemptReconnect`, and `setupChannel`/`attemptReconnect` churned through useEffect deps. Rewrote as a single `user.id`/`enabled`-scoped effect with a `teardownRef` guard; reconnect only on `CHANNEL_ERROR`/`TIMED_OUT`; backoff capped at 30s; callbacks read through refs. |
| 2 | **High** | Chunk recovery | `src/utils/lazyWithRetry.ts` (new), `src/App.tsx`, `src/components/demo/DemoComponentRegistry.tsx` | Extracted `lazyWithRetry` + chunk helpers to a shared util. Replaced 5 raw `lazy(() => import(...))` calls in `DemoComponentRegistry` with `lazyWithRetry`, so a stale Demo shell never strands a user on a white screen. Added `clearChunkReloadGuard()` on successful boot so a recovered session can self-heal again on the next deploy. |
| 3 | **Medium** | Naming drift | `DailyOutcomeInlineBanner.tsx`, `SideDifferentialCard.tsx`, `GpInGameSummaryCard.tsx`, `useGpSignal.ts` | "Progress Dashboard" → "The General" in doc comments to match the user-visible rename. |
| 4 | **Eternity** | CI guards | `scripts/check-eternity-guards.sh` (new), wired into `scripts/preflight.sh` | Hard-fails CI on: raw `lazy()` imports, "Progress Dashboard" string drift, non-canonical `AuthContext` imports, duplicate `<Route path>` in `App.tsx`. |

## Verified clean

- AuthContext imports — only canonical `@/contexts/AuthContext` paths in use.
- `App.tsx` routes — no duplicate paths.
- `lazyWithRetry` coverage — every dynamic import in `src/` now goes through the helper.
- Eternity guards — `scripts/check-eternity-guards.sh` PASSED.
- Typecheck — `tsgo --noEmit` clean.

## Deferred (intentional, not silently changed)

These are flagged for follow-up rather than shipped because each requires a
schema migration, new UI surface, or content authoring pass that would expand
scope past a bug/drift audit:

- **RLS + GRANT linter sweep across all 200+ public tables.** The migration-tool
  flow already enforces grants on new tables. A one-shot linter pass should
  run via `supabase--linter` and be triaged in a dedicated security wave.
- **Loggers UX parity polish** (Defense/Baserun/Sub vs AtBat/Pitch) — already
  brought to functional parity; remaining work is design-system polish.
- **IQ 101 content triple-pass** — completed in prior wave (114 situations,
  `primary_path` backfill). No new findings this pass.
- **Edge function heartbeat audit** — analyze-video already heartbeats;
  remaining functions need a one-shot review for similar patterns.

## How to re-run this audit

```bash
bash scripts/preflight.sh             # includes eternity guards
bash scripts/check-eternity-guards.sh # standalone
bunx tsgo --noEmit                    # typecheck
bunx vitest run                       # unit + ledger tests
```

The eternity guards are the contract that keeps these regressions from
re-appearing. Add new guards here whenever a user-visible regression is fixed.
