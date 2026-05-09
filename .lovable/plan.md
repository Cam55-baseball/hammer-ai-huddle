## Phase G — Operational Intelligence Layer  ✅ SHIPPED

Companion-decision tables (`foundation_fatigue_decisions`, `foundation_onboarding_decisions`), cron heartbeats table, Trace Inspector v2 (filters + drilldown + replay), Health Dashboard at `/owner/foundations/health`, edge functions `foundations-replay` + `foundations-recompute-user`, heartbeat writes wired into all 4 foundation crons.

---

## Phase G — Operational Intelligence Layer (original plan)

Turn Foundations from "tested + working" into "self-diagnosing + admin-operable + production-observable." No new recommendation logic — only explainability, replay safety, and ops tooling.

### Reuse, do not duplicate

Already in place (will be extended, not re-built):
- `src/pages/owner/FoundationTraceInspector.tsx` — basic list + replay button (Wave A)
- `src/pages/owner/FoundationDiagnosticsPanel.tsx` — 7d totals + low-health (Wave D)
- `src/lib/foundationReplay.ts` — `replayRecommendation(traceId)`
- `src/lib/foundationTracing.ts` — trace insertion
- Crons: `nightly-foundation-effectiveness`, `nightly-foundation-health`, `hourly-trigger-decay`, `daily-trace-prune`
- Tables: `foundation_recommendation_traces`, `foundation_trigger_events`, `athlete_foundation_state`, `foundation_video_outcomes`

Phase G upgrades these in place + adds the missing ops surfaces.

---

### G1 — Trace Inspector v2 (upgrade existing page)

Replace the current `FoundationTraceInspector.tsx` list with a filterable console at the same route (`/owner/foundations/traces`).

Filters (server-side, paginated):
- user_id (search by id or email via `profiles` join)
- trigger (any in `active_triggers` / `matched_triggers`)
- suppression_reason
- surface_origin
- recommendation_version
- date range

Per-trace drilldown drawer:
- candidates (final_score, raw_score, score_breakdown, matched_triggers)
- fatigue decision (read companion row from G3 below)
- onboarding decision (read companion row from G3 below)
- rollout eligibility snapshot
- kill-switch snapshot at trace time
- final surfaced result vs suppressed
- "Replay" button → calls G2 endpoint

### G2 — Replay Endpoint

New edge function `foundations-replay` (admin-only, JWT verified, `has_role(admin)` check):

```
POST /functions/v1/foundations-replay
{ userId, snapshotAt: ISO, recommendationVersion?: number }
```

Flow:
1. Load athlete snapshot at `snapshotAt` (closest `engine_snapshot_versions` row ≤ snapshotAt)
2. Recompute triggers from snapshot inputs
3. Re-run scorer (`scoreFoundationCandidates`)
4. Re-run fatigue (`foundationFatigue`)
5. Re-run onboarding gate (`foundationOnboarding`)
6. Diff vs the original trace(s) for that user near `snapshotAt`

Returns:
```
{ matched, differences: { scoreShift[], suppressionShift[], surfacedShift[] }, kill_switches_then, kill_switches_now }
```

Wired into Trace Inspector "Replay" button + standalone admin replay form.

### G3 — Decision-companion logging (small additive schema)

Today only the final scoring trace is persisted. To make G1 drilldown and G2 diff complete, add two thin companion tables (additive, nullable, no breaking changes):

- `foundation_fatigue_decisions` — `user_id, decided_at, video_id, kept (bool), reason ('exposure'|'domain_quota'|'semantic_dupe'|'philosophy_cap'), exposure_score, snapshot (jsonb)`
- `foundation_onboarding_decisions` — `user_id, decided_at, video_id, kept (bool), reason ('cold_start_quota'|'beginner_only'|'advanced_locked'|null), account_age_days, weekly_count, snapshot (jsonb)`

Both: 30-day retention via existing prune pattern, indexed `(user_id, decided_at desc)`. `useFoundationVideos` writes to them in the same fire-and-forget batch as traces.

### G4 — Health & Alerts Dashboard

New page `/owner/foundations/health`. Reads from existing tables + a new `cron_run_log` view (or `engine_settings`-stored heartbeat written by each cron).

Panels:
- **Cron health** — last run, duration, error count for each foundation cron (heartbeat row written at function tail)
- **Recommendation health** — recs/day, suppressions/day split by reason, rollout coverage %
- **Trigger health** — active unresolved count, avg confidence, decay throughput, stuck >30d list
- **State machine health** — transitions/day, dwell violations blocked, flap attempts blocked

Each panel: sparkline (7/30d) + threshold-based status pill (green/amber/red). No external alerting wired yet — visual only this phase.

### G5 — Manual "Recompute Foundations" tool

Admin-only button on a user's profile drilldown (and standalone form on Trace Inspector). Calls a new edge function `foundations-recompute-user`:

1. Recompute triggers
2. Reconcile state machine (force evaluate)
3. Invalidate fatigue cache for user
4. Re-run scorer
5. Insert a diagnostic trace tagged `surface_origin: 'admin_replay'`

Returns the diagnostic trace_id so admin can jump straight into Trace Inspector.

### G6 — Metrics instrumentation

Add a single materialized view `foundation_funnel_daily` (or scheduled aggregate writer in `nightly-foundation-health`) that rolls up per day:

- candidates_loaded, trigger_matched, fatigue_suppressed, onboarding_suppressed, surfaced, clicked, completed, helpful, rewatched, resolved_trigger
- derived: trigger_resolution_rate, usefulness, rewatch_value, suppression_overfire_pct, fatigue_effectiveness, state_recovery_speed

Surfaced as the top tiles on G4 dashboard. Source data already exists in traces + `foundation_video_outcomes` + `foundation_trigger_events`.

### G7 — Routing, access, kill switches

- Routes (lazy in `App.tsx`, admin-gated via `useAdminAccess`):
  - `/owner/foundations/traces` (upgraded)
  - `/owner/foundations/health` (new)
- Edge functions `foundations-replay` and `foundations-recompute-user` both require admin role check inside the function (not just `verify_jwt`)
- New kill switch `foundations_admin_tools_enabled` in `engine_settings` (default true) so the entire ops layer can be disabled without code changes

### Out of scope (defer to Phase H)

- Idempotency / race-condition / cache audits
- Distributed lock verification
- Cron overlap protection
- Index + query plan optimization
- External alerting (PagerDuty, email)
- Trace retention scaling beyond current 90d

---

### Technical notes

- All new tables additive, nullable, RLS-restricted to admin via `has_role(auth.uid(), 'admin')`
- Edge functions: `persistSession: false`, `Deno.serve()`, dual-auth, system user excluded
- Companion-table writes share the existing trace fire-and-forget batch in `foundationTracing.ts` to avoid extra round-trips
- All admin pages use existing `Card`/`Table`/`Badge` primitives — no new design tokens
- BroadcastChannel `'data-sync'` already broadcasts trace inserts; companion rows piggyback on the same channel

### Sequencing

1. G3 schema (companion tables) → migration, approved
2. G1 + G7 routing (Trace Inspector v2)
3. G2 replay edge function
4. G5 recompute edge function
5. G6 funnel aggregate
6. G4 health dashboard wires G6 + cron heartbeats

Each step ships independently behind `foundations_admin_tools_enabled`.

---

Approve to begin **G3 (companion-table migration)**.