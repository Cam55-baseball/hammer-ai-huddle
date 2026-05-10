
# Plan — Operational Readiness Surfacing + 365-Day Log Retention

## Goals
1. Make every operational readiness piece (retention rules, cron jobs, alerts, rollback steps, runbook, troubleshooting) **visible inside the app** — no more "it's only in markdown files."
2. Extend system-log retention windows from **90 days → 365 days** so deeper longitudinal debugging is possible. Athlete data stays untouched (already kept forever).
3. Surface the ops hub from the **Owner dashboard** so it's discoverable.

---

## Part A — Retention extension (90d → 365d)

### What changes
| Table | Before | After |
|---|---|---|
| `foundation_recommendation_traces` | 90d | **365d** |
| `foundation_fatigue_decisions` | 90d | **365d** |
| `foundation_onboarding_decisions` | 90d | **365d** |
| `foundation_health_alerts` (resolved only) | 30d | **365d** |
| `foundation_notification_dispatches` | unlimited | **365d** (new) |
| `foundation_cron_heartbeats` | unlimited | **365d** (new) |
| `foundation_replay_outcomes` | unlimited | **365d** (new) |

### What does NOT change (athlete data — kept forever)
`custom_activity_logs`, `athlete_daily_log`, `engine_snapshot_versions`, all Vault tables, game scoring, MPI/BQI/PEI/FQI scores, nutrition logs, hydration, supplements, CNS load, regulation, profile/DOB/sport, foundation per-user state, all rollups on `library_videos.foundation_*`.

### How
- Migration: update the two prune RPCs (`cleanup_old_foundation_traces`, `cleanup_old_foundation_decisions`) to use a 365-day cutoff.
- Migration: add `cleanup_old_foundation_ops_logs()` RPC that prunes the three ops-only tables at 365d.
- Edge fn: extend `daily-trace-prune` to also call the new RPC. Heartbeat metadata records counts deleted per table.
- No threshold or notification logic changes.

---

## Part B — Ops hub UI (lives at `/owner/foundations/ops`)

Extend the existing `FoundationOpsObservability.tsx` page with a tabbed layout. Current content becomes the first tab; five new tabs added.

### Tab structure
1. **Live Health** *(existing)* — current alerts, heartbeats, replay drift charts.
2. **Data Retention** *(new)* — visual two-column table:
   - 🟢 Kept Forever (athlete data) — list of tables with plain-English description
   - 🟡 Pruned After 365 Days (system logs) — list with last-prune timestamp pulled from heartbeat metadata + row counts
   - Banner explaining the rollup principle: "summaries live forever, raw breadcrumbs prune at 365d"
3. **Cron Jobs** *(new)* — live table from `foundation_cron_heartbeats`:
   - job name, schedule, last run, duration, status, next-expected
   - "Run now" button per job (calls existing edge fn endpoint)
   - Red/amber/green pill based on staleness vs `cron-inventory.md` thresholds
4. **Alerts & Notifications** *(new)* — current open alerts + dispatch log:
   - Master gate state (`FOUNDATION_NOTIFICATIONS_ENABLED` on/off pill)
   - Slack/email adapter status (configured / not configured)
   - Last 50 dispatches with status (`ok`/`dlq`/`skipped_*`)
   - Link to enablement-order checklist (rendered from `notification-enablement.md`)
5. **Rollback Procedures** *(new)* — read-only cards for each documented rollback scenario, rendered from `runbook.md`:
   - "Notification flag enabled in error" → command + explanation
   - "Alerter producing false-positive criticals" → steps
   - "Retention deleted unintended rows" → recovery path
   - "Phase II tables / indexes" → drop statements
   - Each card has a copy-to-clipboard button for the command, but **no execute button** (intentional — owner runs these consciously).
6. **Runbook & Troubleshooting** *(new)* — full searchable rendering of:
   - Required env vars
   - Alert lifecycle (open → refresh → auto-resolve)
   - Replay drift interpretation
   - Notification system rules
   - Troubleshooting symptom → first-check table

### Data sources for tabs
- Retention: `select count(*), max(created_at)` per table + last heartbeat for `daily-trace-prune`.
- Cron: `foundation_cron_heartbeats` (last 50 per function) + static schedule map in code.
- Alerts: existing queries on `foundation_health_alerts` + `foundation_notification_dispatches`.
- Runbook/Rollback: markdown files imported via Vite `?raw` and rendered with `react-markdown` (already in deps if present, otherwise add).

---

## Part C — Owner dashboard surfacing

Add a new card to the Owner dashboard (`/owner`) titled **"System Operations"** with:
- Current health pill (green/amber/red based on open critical alert count)
- Three quick stats: open alerts, last cron heartbeat age, dispatch failures (24h)
- "Open Ops Hub" button → `/owner/foundations/ops`

Also add a sidebar/nav link in the owner area so it's reachable in one click from anywhere in the owner section.

---

## Out of scope
- No changes to athlete data, engines, recommendation logic, or thresholds.
- No new alert rules or notification adapters.
- No changes to the master notification gate (still off by default).

## Technical details (for the AI implementing this)
- **Migration**: single SQL file replacing the two existing RPCs with 365d cutoff + adding `cleanup_old_foundation_ops_logs()`.
- **Edge fn**: extend `supabase/functions/daily-trace-prune/index.ts` only.
- **UI**: refactor `FoundationOpsObservability.tsx` into a parent with `<Tabs>` (shadcn) + 6 child components in the same folder.
- **Markdown rendering**: import docs as `?raw` strings, render via `react-markdown`.
- **Owner dashboard**: edit `src/pages/owner/OwnerOverview.tsx` to add the System Operations card.
- **Routing**: existing `/owner/foundations/ops` stays the URL; just internally tabbed.
- **Memory update**: bump retention rule from 90d → 365d in the relevant memory file.
