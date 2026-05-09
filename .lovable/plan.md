## Phase I — Regression Automation + Observability Hardening

Scope frozen against Phase H. Additive only. No UX redesign. No threshold tuning.

---

### 1. Shared thresholds source of truth

**Goal:** Eliminate the mirrored ALERT/CRON_STALE_MIN block currently duplicated in `src/lib/foundationThresholds.ts` and `supabase/functions/foundation-health-alerts/index.ts`.

- New canonical file: `supabase/functions/_shared/foundationThresholds.ts`
  - Exports `CRON_STALE_MIN`, `ALERT`, `TRACE_PAGE_SIZE`, `TRACE_EXPORT_MAX`, `TRACE_EXPORT_CHUNK`, `TRACE_SEARCH_DEBOUNCE_MS`, `SYSTEM_USER_ID`, `AlertSeverity` — values **byte-identical** to current.
- `src/lib/foundationThresholds.ts` becomes a thin re-export forwarder (Vite resolves the relative `../../supabase/functions/_shared/foundationThresholds` path; pure constants, no Deno-only imports, no runtime branches).
- `foundation-health-alerts/index.ts` imports from `../_shared/foundationThresholds.ts`; mirror block deleted.
- Compile-time check: identical literal values verified by a vitest snapshot test.

No behavioral tuning.

---

### 2. Replay mismatch analytics

**New table** `public.foundation_replay_outcomes`:

```text
id              uuid pk default gen_random_uuid()
trace_id        text not null
user_id         uuid
video_id        uuid
ran_at          timestamptz not null default now()
matched         boolean not null
drift_reason    text                    -- nullable
original_score  numeric
replay_score    numeric
recommendation_version_then  int
recommendation_version_now   int
source          text not null           -- 'manual' | 'cron' | 'admin'
```

Indexes:
- `idx_fro_ran_at` on `(ran_at desc)`
- `idx_fro_matched_ran_at` on `(matched, ran_at desc)`
- `idx_fro_trace` on `(trace_id, ran_at desc)`

RLS:
- enable RLS
- admin SELECT (via existing `has_role(uid, 'admin')`)
- service-role ALL (explicit for FORCE-RLS safety)

**Edge function changes:**
- `foundations-replay`: after computing `differences[]`, bulk-insert one row per trace into `foundation_replay_outcomes` with `source='manual'` (best-effort; failure logged, never blocks response).
- `foundation-health-alerts`: add evaluator `replay_mismatch_high`
  - window: last 24h, min sample 20
  - rate = `count(matched=false) / count(*)`
  - severity: `>= ALERT.REPLAY_MISMATCH_CRIT` → critical, `>= REPLAY_MISMATCH_WARN` → warning
  - alert_key `replay_mismatch_high` (auto-resolves via existing lifecycle)

**Dashboard:** new compact panel "Replay drift (24h)" showing total/mismatched/rate, bounded `.gte('ran_at', t-24h).limit(5000)`. Inserted next to existing Active alerts card. No layout redesign.

---

### 3. Resolved-alert retention

**New edge function** `foundation-alert-retention`:
- Deletes `foundation_health_alerts` rows where `resolved_at IS NOT NULL AND resolved_at < now() - interval '30 days'`.
- **Hard guard:** query includes `.not('resolved_at','is',null).lt('resolved_at', cutoff)` — unresolved rows can never be touched. Verified by integration test that seeds an open alert and asserts it survives.
- Writes heartbeat `foundation-alert-retention` with `{deleted_count}`.
- Cron: daily `30 4 * * *` via `supabase--insert` (idempotent name check), payload `{}`.
- Add `foundation-alert-retention` to `CRON_STALE_MIN` (`60*26`).

---

### 4. Metrics summary card

Single `<Card>` "Foundations ops summary" on `FoundationHealthDashboard` showing:
- Severity counters: open critical / warning / info (single query, `is('resolved_at',null)`).
- Last successful `foundation-health-alerts` heartbeat timestamp + duration_ms (existing heartbeats table).
- Failed replay count last 24h (`foundation_replay_outcomes` where `matched=false`).

All queries bounded; reuse existing fetch pattern.

---

### 5. Notification scaffolding (NOT enabled)

New file `supabase/functions/_shared/notificationAdapters.ts`:

```ts
export interface NotificationDispatch {
  key: string; severity: 'info'|'warning'|'critical';
  title: string; detail?: Record<string, unknown>;
}
export interface NotificationAdapter {
  name: string;
  send(d: NotificationDispatch): Promise<{ok:boolean; error?:string}>;
}
export const slackAdapter: NotificationAdapter = { name:'slack', send: async()=>({ok:true}) };
export const emailAdapter: NotificationAdapter = { name:'email', send: async()=>({ok:true}) };

export async function dispatch(d: NotificationDispatch) {
  if (Deno.env.get('FOUNDATION_NOTIFICATIONS_ENABLED') !== 'true') return { skipped: true };
  // future: fan out to enabled adapters
  return { skipped: true };
}
```

`foundation-health-alerts` calls `dispatch()` only on **newly opened** alerts (not refreshes/resolves). Default flag off → no-op. No webhook secrets requested in this phase.

---

### 6. Regression automation

Vitest suites under `src/lib/__tests__/`:

| Test file | Covers |
|---|---|
| `foundationTraceInspector.pagination.test.ts` | cursor pagination contiguity (mock supabase chain, assert `lt('created_at', cursor)` and dedup) |
| `foundationTraceInspector.csvExport.test.ts` | chunk size, cap at `TRACE_EXPORT_MAX`, `(capped)` toast branch |
| `foundationTraceInspector.actions.test.ts` | replay/recompute state machine: idle→pending→ok/error, double-submit guard |
| `foundationHealthAlerts.lifecycle.test.ts` | open→refresh→auto-resolve, no duplicate-key insert, system-user excluded from suppression rate |
| `foundationCronSeverity.test.ts` | `statusFor()` mapping at `<max`, `>max`, `>2×max` |
| `foundationThresholds.parity.test.ts` | snapshot of canonical constants (catches any drift if the shared module is touched) |

Deno test under `supabase/functions/foundation-alert-retention/index.test.ts`:
- seeds one resolved (35d old) + one open alert in a stub client; asserts only the resolved one is targeted.

All tests are pure (mocked supabase clients) — no live DB writes.

---

### 7. Production verification gate

Before declaring done:
1. Harness build (auto) — read result; no manual `tsc`.
2. `bunx vitest run` for the new + existing foundation suites.
3. `supabase--test_edge_functions` for the retention function test.
4. JSX/operator audit grep across all touched files (same patterns as Phase H stabilization).
5. `supabase--read_query` spot checks: row counts on new table indexes (`EXPLAIN` not required — index presence verified via `pg_indexes`).
6. Live invoke `foundation-health-alerts` once and confirm `replay_mismatch_high` evaluator returns `fired=false` on empty data (no crash).

---

### Files changed (planned)

**New:**
- `supabase/functions/_shared/foundationThresholds.ts`
- `supabase/functions/_shared/notificationAdapters.ts`
- `supabase/functions/foundation-alert-retention/index.ts`
- `supabase/functions/foundation-alert-retention/index.test.ts`
- `supabase/migrations/<ts>_foundation_replay_outcomes.sql`
- `src/lib/__tests__/foundationTraceInspector.pagination.test.ts`
- `src/lib/__tests__/foundationTraceInspector.csvExport.test.ts`
- `src/lib/__tests__/foundationTraceInspector.actions.test.ts`
- `src/lib/__tests__/foundationHealthAlerts.lifecycle.test.ts`
- `src/lib/__tests__/foundationCronSeverity.test.ts`
- `src/lib/__tests__/foundationThresholds.parity.test.ts`

**Edited:**
- `src/lib/foundationThresholds.ts` → re-export forwarder
- `supabase/functions/foundation-health-alerts/index.ts` → import shared, add replay-mismatch evaluator, dispatch hook
- `supabase/functions/foundations-replay/index.ts` → persist outcomes
- `src/pages/owner/FoundationHealthDashboard.tsx` → add metrics summary + replay drift cards (additive)
- `.lovable/plan.md` → updated phase log

**Cron (via `supabase--insert`):**
- `foundation-alert-retention-daily` `30 4 * * *`

---

### Sequencing

1. Migration for `foundation_replay_outcomes` → user approves.
2. Create shared thresholds module + forwarder + edge import refactor.
3. Implement replay-outcome persistence + new evaluator + dispatch hook.
4. Implement retention function + cron.
5. Add dashboard cards.
6. Add vitest + Deno tests; run and report.
7. Final verification + concise diffs + risk list.

### Out of scope (deferred, listed only)

- Live Slack/email delivery (adapters are stubs)
- Drill-down filtering on alerts panel
- Threshold tuning UI
- Replay scheduling / automated periodic replays
- FORCE RLS rollout
