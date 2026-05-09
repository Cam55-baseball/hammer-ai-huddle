
# Phase H — Observability & Admin Hardening

Five sequenced workstreams. All additive, no schema breaks, no regressions to existing routes (`/owner/foundations/traces|diagnostics|health`).

---

## H0 — Centralized thresholds (do first, everything else imports from here)

**New file:** `src/lib/foundationThresholds.ts`

Single source of truth for every magic number that currently lives inline. Plain TypeScript constants with inline tuning comments — no runtime dependency.

```ts
// Cron staleness (minutes since last heartbeat before status flips)
export const CRON_STALE_MIN = {
  'hourly-trigger-decay': 90,        // runs every 1h, allow 1.5x
  'daily-trace-prune': 60 * 26,      // runs daily, allow 26h
  'nightly-foundation-health': 60 * 26,
  'recompute-foundation-effectiveness': 60 * 26,
} as const;

// Health alerts
export const ALERT = {
  SUPPRESSION_RATE_WARN: 0.55,       // >55% of surfacings suppressed in 24h
  SUPPRESSION_RATE_CRIT: 0.75,
  UNRESOLVED_TRIGGERS_WARN: 500,     // org-wide active triggers
  UNRESOLVED_TRIGGERS_CRIT: 1500,
  STUCK_TRIGGER_DAYS: 30,            // already used in dashboard
  STUCK_TRIGGER_WARN: 5,
  STUCK_TRIGGER_CRIT: 25,
  REPLAY_MISMATCH_WARN: 0.10,        // 10% of recent replays drift
  REPLAY_MISMATCH_CRIT: 0.25,
  HEARTBEAT_MISSING_CRIT_MIN_RATIO: 2, // >2× CRON_STALE_MIN = critical
} as const;

// Trace inspector / export
export const TRACE_PAGE_SIZE = 100;        // cursor pagination page size
export const TRACE_EXPORT_MAX = 10_000;    // hard cap per CSV
export const TRACE_EXPORT_CHUNK = 1_000;   // server fetch chunk
export const TRACE_SEARCH_DEBOUNCE_MS = 300;
```

`FoundationHealthDashboard` and `FoundationTraceInspector` are refactored to import from this module — no inline numbers remain.

---

## H1 — Trace pagination & debounced search (foundation for H2 export)

`FoundationTraceInspector.tsx`:

- Replace the single `limit(200)` query with a cursor: `loadPage(after?: string)` that selects `TRACE_PAGE_SIZE` rows ordered by `created_at desc, trace_id desc`, using `.lt('created_at', cursor)` for the next-page boundary. "Load more" button at the bottom; existing "Apply filters" resets the cursor.
- Debounced unified search box (300ms via `useEffect` timer, no lodash):
  - `user_id` / `video_id` / `trace_id` — UUID detection (regex), use `.eq()` on the matching column
  - `suppression_reason` substring → `.ilike('suppression_reason', '%term%')`
  - `trigger` token → `.contains('active_triggers', [term])`
  - Free text falls back to OR across reason + score_breakdown text representation (kept narrow to stay indexed)
- Existing dropdown filters (`surface`, `reason`) still apply.
- Performance: all filters compose on the same indexed columns already present (`idx_frt_user_created`, `idx_frt_video_created`, `idx_frt_active_triggers`, `idx_frt_suppressed`). No new indexes needed; the cursor uses the existing `(user_id, created_at desc)` and `(created_at desc) where suppressed=true` indexes effectively.

**No schema change** for H1. Pagination is purely client-driven via Supabase REST.

---

## H2 — Trace Export CSV

Inside `FoundationTraceInspector.tsx`, add an "Export CSV" button next to "Apply filters":

- Re-runs the **current active filters** (not just the visible page) against `foundation_recommendation_traces`.
- Loops in chunks of `TRACE_EXPORT_CHUNK` using cursor pagination until either no more rows or `TRACE_EXPORT_MAX` reached. Shows a toast progress counter (`Exported 3,000 / ?`).
- Companion enrichment: after primary fetch, batch-loads matching `foundation_fatigue_decisions` and `foundation_onboarding_decisions` rows for the (`user_id`, `video_id`) pairs in the export within ±60s of each trace's `created_at`. Joined client-side. Empty columns when no companion record exists.
- CSV columns:
  ```
  trace_id, created_at, user_id, video_id, surface_origin,
  active_triggers, matched_triggers, raw_score, final_score,
  suppressed, suppression_reason, recommendation_version,
  fatigue_kept, fatigue_reason, fatigue_exposure_score,
  onboarding_kept, onboarding_reason, onboarding_account_age_days
  ```
- Streamed to disk via a `Blob` built incrementally per chunk and released after download (no full in-memory accumulation beyond the 10k cap; arrays/strings released between chunks). Manual `URL.revokeObjectURL` on completion.
- Disabled while `exporting === true`; uses `sonner` toast for success / partial / error.

**No schema change** for H2.

---

## H3 — Health Alerts (persisted, auto-resolving)

### New migration

```sql
CREATE TABLE public.foundation_health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL,           -- e.g. 'cron_missing:hourly-trigger-decay'
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  UNIQUE (alert_key, resolved_at)    -- one open row per key
);
CREATE INDEX idx_fha_open ON public.foundation_health_alerts (severity, last_seen_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.foundation_health_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read alerts" ON public.foundation_health_alerts
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
-- inserts/updates only via service role (edge function)
```

### New edge function `foundation-health-alerts`

Cron-callable (scheduled hourly via existing pg_cron pattern; user can wire schedule after deploy). Logic:

1. Read `foundation_cron_heartbeats` → if any function in `CRON_STALE_MIN` has no beat within window → upsert `cron_missing:<fn>` (warning) or `>2× window` (critical).
2. Suppression rate over last 24h: `count(suppressed) / count(*)` from `foundation_recommendation_traces` (excluding system user). Compare to `ALERT.SUPPRESSION_RATE_*`.
3. Unresolved triggers: `count(*) where resolved_at is null` from `foundation_trigger_events`. Compare to `ALERT.UNRESOLVED_TRIGGERS_*`.
4. Stuck triggers: `count(*)` where `fired_at < now() - 30d AND resolved_at is null`. Compare to `ALERT.STUCK_TRIGGER_*`.
5. Replay mismatch rate: scan last 200 admin-replay marker traces (none today; placeholder uses `score_breakdown->>'admin_recompute'` = false until G2 starts persisting replay outcomes — guarded so absence yields no alert, never a crash).

**Auto-resolve:** for every check that does NOT trigger, look for an open alert with matching `alert_key` and set `resolved_at = now()`. Active alerts get `last_seen_at = now()` updated. Severity escalation just upserts a new row only after the previous open one is auto-resolved (UNIQUE constraint enforces single open per key).

Heartbeat row written to `foundation_cron_heartbeats` like every other cron.

Thresholds **only** read from `foundationThresholds.ts` — duplicated server-side via a small mirror constant block at the top of the function (Deno can't import `src/`). Comment in both files cross-references the other so they stay in sync.

### Dashboard panel

`FoundationHealthDashboard.tsx` gains a top-of-page "Active Alerts" card:
- Reads `foundation_health_alerts where resolved_at is null order by severity, last_seen_at desc limit 50`.
- Critical = red pill, warning = amber, info = slate. Shows `title`, `first_seen_at` relative time, expand for `detail` JSON.
- Empty state: "All clear."
- No client-side write of alerts (always service-role from edge function).

---

## H4 — Admin retry / recompute UX inside trace rows

In each `FoundationTraceInspector` row:
- Existing "Replay" + "Inspect" buttons stay.
- Add "Recompute user" button (only for non-marker rows) → calls `foundations-recompute-user` with that row's `user_id`.
- Add "Replay from this trace" → existing replay endpoint, but the result panel now opens the inspect drawer with replay diff merged.

UX hardening:
- Per-row state map keyed by `trace_id`: `'idle' | 'pending' | 'ok' | 'error'`.
- Buttons disabled when state is `'pending'` (prevents duplicate clicks).
- Spinner inline in the button label.
- Result surfaced via `sonner` toast (success "Replayed: 8/10 matched", error "Recompute failed: <msg>").
- Errors keep the row state visible (red badge) until next click.
- Existing top-of-page "Recompute" input is left in place for the manual user_id flow.

No backend changes — both endpoints already exist (`foundations-replay`, `foundations-recompute-user`).

---

## Sequencing & rollout

1. **H0** (constants module — pure refactor, no behavior change).
2. **H1** (pagination + search; smallest blast radius, unblocks export).
3. **H2** (CSV export; depends on H1's chunked fetch path).
4. **H3** (alerts table + edge function + dashboard panel; one migration).
5. **H4** (per-row admin actions; pure UI, depends on nothing).

Each step compiled and verified before the next. No regressions to `/owner/foundations/diagnostics` (untouched) or to existing companion-decision logging.

## Files

**Created**
- `src/lib/foundationThresholds.ts`
- `supabase/functions/foundation-health-alerts/index.ts`
- `supabase/migrations/<ts>_foundation_health_alerts.sql`

**Modified**
- `src/pages/owner/FoundationTraceInspector.tsx` (H1, H2, H4)
- `src/pages/owner/FoundationHealthDashboard.tsx` (H0, H3 panel)
- `supabase/functions/daily-trace-prune/index.ts` (only if we extend retention to alerts; otherwise untouched)

## Out of scope (deferred)

- Materialized view `foundation_funnel_daily` (G6 still deferred).
- External alerting (email/Slack/PagerDuty) — table is the single sink for now.
- Replay-mismatch rate persistence (placeholder check only — full implementation needs G2 to log replay outcomes, which is a separate workstream).
