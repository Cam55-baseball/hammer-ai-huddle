# Phase X.4 — Deterministic Engine, Replay, Conversion Signals

## Status of "bugs" called out in the prompt

- **Math bug** in `completionRules.ts`: not present. Current code already reads `axes.tiers * W.tiers + …`. The prompt's "broken" example was a markdown rendering artifact (lost `*`). No change needed.
- **Generic typing** in `guard.ts`: not present. Current code: `makeDemoSafeClient<T extends Record<string, any>>(...)`. No change needed.
- **Sims non-deterministic**: not present. `simEngine.ts` already exposes `seedFromString` + Mulberry32 `rng`, and both `hittingSim` / `programSim` already seed by input. We will add **per-user salt** so seeds are stable per-user and add a public `src/demo/determinism.ts` re-export so future sims share one helper.

## 1. Per-user determinism layer

**New** `src/demo/determinism.ts` — re-exports `seedFromString` + `rng` from `simEngine` and adds:

```ts
export function userScopedSeed(simId: string, userId: string | null | undefined) {
  return seedFromString(`${simId}:${userId ?? 'anon'}`);
}
```

`hittingSim.run` and `programSim.run` accept an optional 2nd arg `{ userId?: string }`. When provided, the seed becomes `seedFromString(\`${input...}:${userId}\`)` so the same user always sees the same numbers. Backward compatible (omit → existing input-only seed).

`DemoLoopShell` callers (HittingAnalysisDemo, IronBambinoDemo) thread `user?.id` from `useAuth` into the sim call.

## 2. Replay capability — `session_id` on `demo_events`

**Migration**:
```sql
ALTER TABLE public.demo_events
  ADD COLUMN IF NOT EXISTS session_id uuid;
CREATE INDEX IF NOT EXISTS idx_demo_events_session ON public.demo_events (session_id, created_at);
```

Update `useDemoTelemetry`:
- Generate one `sessionId = crypto.randomUUID()` per hook mount (stable across the demo session, persisted in `sessionStorage` under `demo_session_id` so reloads keep continuity).
- Include `session_id: sessionId` in every `demo_events` insert.

**New** `src/demo/replay/useDemoReplay.ts` — fetches all events for a session id, ordered by `created_at`. Pure read; uses raw `supabase` client (not demo-safe wrapper) so admin/debug routes can introspect.

## 3. Conversion-signal events

Add explicit funnel events. Update `src/demo/guard.ts` to export a public `logDemoEvent` (currently file-private) so any UI can emit:

```ts
export function logDemoEvent(type: string, payload: Record<string, unknown>) { … }
```

Then in `DemoLoopShell.tsx`:
- `useEffect(() => logDemoEvent('cta_viewed', { simId, severity, gap }), [simId, severity])`
- Upgrade button onClick: `logDemoEvent('cta_clicked', { simId, severity, fromSlug })` before navigate.

In `DemoUpgrade.tsx`:
- On mount: `logDemoEvent('upgrade_started', { from, reason, gap })`.
- On any tier-select / checkout button click: `logDemoEvent('upgrade_completed', { tier })` (proxy for purchase intent — actual purchase still flows through Stripe webhooks).

## 4. Funnel SQL view (read-only analytics)

**Migration** (same file):
```sql
CREATE OR REPLACE VIEW public.demo_funnel AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE event_type = 'cta_viewed')        AS viewed,
  COUNT(*) FILTER (WHERE event_type = 'cta_clicked')       AS clicked,
  COUNT(*) FILTER (WHERE event_type = 'upgrade_started')   AS started,
  COUNT(*) FILTER (WHERE event_type = 'upgrade_completed') AS completed,
  MIN(created_at) AS first_event,
  MAX(created_at) AS last_event
FROM public.demo_events
GROUP BY user_id;

ALTER VIEW public.demo_funnel SET (security_invoker = on);
```
`security_invoker = on` makes the view honor each caller's RLS on `demo_events` (own rows only) — no privilege leak.

## 5. Strict Demo Mode (env-flagged)

In `guard.ts`:
- `const STRICT_DEMO = import.meta.env.VITE_DEMO_STRICT === '1';`
- Read-block path: when STRICT_DEMO + DEV, **throw** instead of returning empty (loud failure in staging). PROD always silent-empty.
- Already-existing write-blocker keeps current `assertNotDemo` (throws in DEV) behavior.

## 6. Inspector upgrade (replaces raw JSON dump)

Update `DemoDebugPanel.tsx`. Still gated by `localStorage.demo_debug === '1'`. Renders structured rows:
- Completion %, demo_state
- Last 5 events (read from in-memory ring populated by a tiny BroadcastChannel listener inside the panel — no DB call)
- Session id (from sessionStorage)
- Active prescription history count

No new dependencies.

## Files

**Migration (1)**:
- `session_id` column + index on `demo_events`
- `demo_funnel` view (security_invoker)

**New (2)**:
- `src/demo/determinism.ts`
- `src/demo/replay/useDemoReplay.ts`

**Edited (7)**:
- `src/demo/guard.ts` — export `logDemoEvent`, optional STRICT_DEMO throw
- `src/demo/useDemoTelemetry.ts` — sessionStorage-stable `session_id`
- `src/demo/sims/hittingSim.ts` + `programSim.ts` — accept optional `userId`
- `src/components/demo/DemoLoopShell.tsx` — `cta_viewed` + `cta_clicked`, thread userId into sims (callers)
- `src/components/demo/shells/HittingAnalysisDemo.tsx` + `IronBambinoDemo.tsx` — pass `user?.id` to sim
- `src/pages/demo/DemoUpgrade.tsx` — `upgrade_started` + `upgrade_completed`
- `src/components/demo/DemoDebugPanel.tsx` — structured inspector

**Zero impact** on production routes; everything outside `/demo*` untouched. No new dependencies.

## Outcomes

| Capability | Mechanism |
|---|---|
| Same user → same numbers | `userScopedSeed` salt |
| Replay any user journey | `session_id` + `useDemoReplay` |
| Funnel intelligence | 4 explicit events + `demo_funnel` view |
| Loud staging leaks | `VITE_DEMO_STRICT=1` |
| Live state introspection | Structured inspector |
