## Phase X.1 — Final Hardening Execution Lock

After auditing the current code against your 10-point spec, **most items are already in place from the prior phase**. Only two real changes remain, plus verification of the rest.

### Audit results

| # | Item | Status |
|---|---|---|
| 1 | Syntax/operators/comments/generics | ✅ Already correct in `generate-follower-reports/index.ts` (lines 58, 188, 384 verified — no missing `*`, comments are `//`, generics valid) |
| 2 | Per-follower `AbortController`, no shared state | ✅ Created fresh inside `callAIWithRetry` each attempt (5s) |
| 3 | AI retry contract: 3 attempts, 400→800ms, returns `null` on exhaustion | ✅ `AI_RETRIES=2`, loop `while (attempt <= AI_RETRIES)` = 3 total; never throws |
| 4 | Deterministic single-outcome logging | ✅ Each path logs exactly once with correct `retryable` flag |
| 6 | Retry mode matches normal pipeline (`bulkFetchSnapshots` → `generateForFollower` → upsert → log) | ✅ Verified |
| 7 | Idempotency — `onConflict` + DB unique index `follower_reports_unique_key` | ✅ Index confirmed via `pg_indexes` |
| 8 | Client hook uses `supabase.functions.invoke` only, no `getSession()` | ✅ Verified in `useFollowerReports.ts` |
| 10 | Verification queries — 0 duplicates, 0 stale failed logs | ✅ Already clean |

### Required changes

#### Change 1 — `supabase/functions/retry-follower-reports/index.ts`: include `period_start` in dedup key and forwarded targets

The current worker selects only `(follower_id, player_id, report_type)` and forwards the same. The generator's retry-mode then derives `period_start` from "now", which can re-target a different period than the one that originally failed. Fix by selecting `period_start` from logs and forwarding it.

- Add `period_start` to the failed-log SELECT (it does not currently exist on `follower_report_logs`, so we must also add the column).
- Migration: `ALTER TABLE follower_report_logs ADD COLUMN IF NOT EXISTS period_start date;`
- Update `generateForFollower`'s logger call to pass `periodStart` and have `logResult` write it (small signature extension).
- In retry worker, dedup key becomes `${follower_id}|${player_id}|${report_type}|${period_start ?? ''}` and target objects include `period_start`.

#### Change 2 — Schedule `retry-follower-reports` via `pg_cron` every 5 minutes

Not yet scheduled. Use the data-insert path (not a migration) since it embeds the project-specific URL + anon key:

```sql
SELECT cron.schedule(
  'retry-follower-reports-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/retry-follower-reports',
    headers := '{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

Ensure `pg_cron` and `pg_net` are enabled (they are — `trigger_render_on_queue_insert` already uses `net.http_post`).

#### Change 3 (verification only — no code) — Forced failure test

After deploy: temporarily invalidate `LOVABLE_API_KEY` → invoke generator → confirm a `failed/retryable=true/reason=ai_exhausted` row appears (note: row also gets created with deterministic headline, by spec) → wait 5 minutes → confirm cron run produces a `success` row and prior log row is flipped to `retryable=false`.

### Out of scope
No UI changes, no new report types, no changes to primary cron schedule, no changes to `mark-follower-report-viewed`.

### Acceptance gate
- Duplicates query returns 0 rows
- Retry worker forwards correct `period_start` for each failed pair
- Cron job visible in `cron.job` and firing every 5 minutes
- Failed reports converge to `success` automatically