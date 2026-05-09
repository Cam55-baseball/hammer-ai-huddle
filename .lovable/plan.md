
# Phase G Stabilization Audit

Full integrity sweep of every file touched by Phase G. **TypeScript compiles cleanly** (`tsc --noEmit` passes with no errors). No malformed JSX, no broken generics, no truncated hooks, no stripped operators, no invalid `Record<>` declarations, no `.select("")` placeholders found anywhere in `src/` or `supabase/`. Edge functions all use `Deno.serve`, `persistSession: false`, and proper admin role checks.

However, the audit surfaced **4 real defects** that will cause incorrect runtime behavior. All are small, isolated fixes.

## Defects to fix

### D1 — Trace Inspector filter bug (functional, high impact)
`FoundationTraceInspector.tsx` lines 110-121. Radix `SelectItem` cannot accept `value=""`, so the code maps the empty option to the literal string `"any"`. But `onValueChange={setSurface}` writes `"any"` into state, and then `if (surface) q = q.eq('surface_origin', surface)` runs `eq('surface_origin', 'any')` — which matches zero rows. Same bug on `reason`.
**Fix:** translate sentinel back: `onValueChange={(v) => setSurface(v === 'any' ? '' : v)}` (and same for `reason`). Also pass `value={surface || 'any'}` so the dropdown reflects state.

### D2 — Health Dashboard cron name mismatch (observability dead)
`FoundationHealthDashboard.tsx` line 17 lists `'nightly-foundation-effectiveness'` in `CRON_FNS`, but the actual edge function is named `recompute-foundation-effectiveness` (and that's the name written into `foundation_cron_heartbeats`). The panel will permanently show "no beat yet / red" for that cron.
**Fix:** change the constant to `'recompute-foundation-effectiveness'`.

### D3 — Decision retention never runs (silent data growth)
`daily-trace-prune/index.ts` only calls `rpc('cleanup_old_foundation_traces')`. The Phase G migration added `cleanup_old_foundation_decisions()` (covers `foundation_fatigue_decisions`, `foundation_onboarding_decisions`, `foundation_cron_heartbeats`) but nothing invokes it, so the 30/60-day retention promised in the plan never executes.
**Fix:** in `daily-trace-prune`, after the existing call, also `await supabase.rpc('cleanup_old_foundation_decisions')`; merge both errors into the heartbeat row.

### D4 — Funnel rollup includes system user (metric pollution)
`FoundationHealthDashboard.tsx` `tracesRes` query has no `neq('user_id', SYSTEM_USER)` filter. Phase 9 architecture mandates excluding `00000000-0000-0000-0000-000000000001` from all behavioral pipelines.
**Fix:** add `.neq('user_id', '00000000-0000-0000-0000-000000000001')` to the traces query.

## Verified clean (no changes needed)

- **`foundationTracing.ts`** — batched flush logic, dedupe set, bounded queue all valid; companion `enqueueFatigueDecisions` / `enqueueOnboardingDecisions` symmetric and correct.
- **`foundations-replay/index.ts`** — admin auth via `user_roles` lookup; reads only; explicit field list on `library_videos.select(...)`; bounded `±60min` window with `limit(50)`.
- **`foundations-recompute-user/index.ts`** — admin gate, system-user guard, idempotent trigger resolution, marker trace uses allowed `surface_origin='admin_replay'` (no FK on `video_id`, so zero-UUID marker is safe).
- **`hourly-trigger-decay/index.ts`** — heartbeat with both ok/error paths, bounded `limit(5000)`, decay math correct.
- **`recompute-foundation-effectiveness/index.ts`** & **`nightly-foundation-health/index.ts`** — cursor pagination, system-user exclusion, heartbeat instrumentation all intact.
- **Migration `20260509143443…`** — companion tables have RLS (user-own SELECT + admin SELECT + user-own INSERT), proper indexes (`user_id, decided_at DESC`), heartbeat table admin-only SELECT, `cleanup_old_foundation_decisions` SECURITY DEFINER with `search_path = public`. No duplicate policies. `types.ts` already reflects both RPCs.
- **`App.tsx`** — three Foundation routes registered cleanly (`/owner/foundations/traces|diagnostics|health`); no syntax issues.
- **No `.select("")` placeholders** anywhere; all queries use explicit field lists or `select('*')` with bounded `.limit()`.

## Known risks left as-is (called out, not fixed)

- **Funnel pulls up to 5,000 raw trace rows then aggregates client-side.** Fine for current volume; will need a server-side rollup (or the deferred `foundation_funnel_daily` materialized view from G6) once daily traces exceed ~5k.
- **Trace inspector `limit(200)` with no pagination.** Acceptable for an admin tool; pagination upgrade is explicitly deferred per the user's instructions.
- **`(supabase as any)` casts** in tracing/inspector/dashboard are now unnecessary (types.ts has the new tables) but removing them is a cosmetic refactor, not a stabilization fix.

## Files modified by this stabilization pass

1. `src/pages/owner/FoundationTraceInspector.tsx` — D1
2. `src/pages/owner/FoundationHealthDashboard.tsx` — D2, D4
3. `supabase/functions/daily-trace-prune/index.ts` — D3

No migrations, no new files, no schema changes, no behavior beyond bug fixes.

## Exit criteria

- `tsc --noEmit` passes (already passing; will re-verify after edits).
- Trace Inspector "any" filter returns rows.
- Health Dashboard shows green pill for `recompute-foundation-effectiveness` once it next runs.
- `daily-trace-prune` heartbeat metadata reports both cleanup calls.
- System user excluded from funnel counts.

After these four edits land, Phase G is stable and the deferred work (CSV export, alerts, thresholds, pagination, replay enhancements) can resume.
