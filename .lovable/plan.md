# Phase X.1 — Final Hardening Layer

Make the follower report pipeline fully fault-isolated, retryable, and deterministic. Each unit of work fails or succeeds independently; failures converge to success via a retry worker.

## 1. Database migration

New migration adds:
- `CREATE UNIQUE INDEX IF NOT EXISTS follower_reports_unique_key ON follower_reports (follower_id, player_id, report_type, period_start);` (belt-and-suspenders alongside the existing UNIQUE constraint — safe no-op if constraint already produced this index).
- `ALTER TABLE follower_report_logs ADD COLUMN IF NOT EXISTS retryable boolean NOT NULL DEFAULT true;`
- Partial index for the retry worker:  
  `CREATE INDEX IF NOT EXISTS idx_follower_report_logs_retry ON follower_report_logs (created_at) WHERE status = 'failed' AND retryable = true;`

## 2. `supabase/functions/generate-follower-reports/index.ts` — fault isolation

- **Per-follower timeout**: remove the single global `AbortController`. Inside `generateForFollower`, create a fresh `AbortController` with a **5s** timeout and pass `signal` into the Lovable AI `fetch` only. Bulk DB pre-fetch stays outside this scope.
- **Bounded retry wrapper** for AI calls:
  ```
  callAIWithRetry(payload, { retries: 2, baseDelayMs: 400 })
  ```
  Retries on: network error, abort, non-2xx, JSON parse failure. Backoff: 400ms → 800ms. After 2 retries, fall back to deterministic headline (already implemented) and log `status='failed', retryable=true, reason='ai_exhausted'`.
- **Snapshot validation guard** before processing each pair:
  - If `!Array.isArray(sessions)` or `!Array.isArray(games)` → skip, log `status='skipped', reason='invalid_snapshot', retryable=false`.
- **Idempotency**: keep `upsert(..., { onConflict: 'follower_id,player_id,report_type,period_start' })` — backed by the new unique index.
- **Mark `retryable=false`** for permanent skips (`invalid_role`, `invalid_snapshot`, missing player). Mark `retryable=true` for transient failures (AI exhausted, DB write timeout, unexpected exception).

## 3. New retry worker — `supabase/functions/retry-follower-reports/index.ts`

- Service-role function. No JWT required (cron-only).
- Query: `follower_report_logs` where `status='failed' AND retryable=true AND created_at < now() - interval '5 minutes'`, limit 50.
- Group by `(follower_id, player_id, report_type, period_start)` to deduplicate.
- For each, re-invoke the same generator path (extract `generateForFollower` into a shared helper inside the generator's `index.ts` and import, OR call `generate-follower-reports` with a `retry_targets` body parameter — preferred: add `{ retry_targets: [{follower_id, player_id, report_type, period_start}] }` body to the existing function so we don't fragment logic).
- On success, mark prior failed log rows as `retryable=false` (so they aren't picked up again) and let the new success log stand.
- Schedule via `pg_cron` every 5 minutes (insert via DB tool, not migration, since URL + anon key are project-specific).

## 4. `supabase/functions/generate-follower-reports/index.ts` — accept retry targets

- If request body has `retry_targets: Array<{follower_id, player_id, report_type, period_start}>`, skip the normal "find all due pairs" discovery and process exactly those targets through the same per-follower pipeline.
- Same upsert + log behavior; same per-follower 5s timeout.

## 5. `src/hooks/useFollowerReports.ts` — drop per-request session fetch

- `useFollowerReport(id)` currently calls `await supabase.auth.getSession()` on every fetch. Replace with `supabase.functions.invoke('get-follower-reports', { body: { id } })` so the SDK reuses the cached session and auto-injects auth.
- Update `get-follower-reports/index.ts` to read `id` from JSON body when present (fallback to query param for compatibility).

## 6. Verification (post-implementation, via `supabase--read_query`)

- Duplicate check: `SELECT follower_id, player_id, report_type, period_start, COUNT(*) FROM follower_reports GROUP BY 1,2,3,4 HAVING COUNT(*) > 1;` → empty.
- Retry queue health: `SELECT status, retryable, COUNT(*) FROM follower_report_logs WHERE created_at > now() - interval '1 hour' GROUP BY 1,2;`
- Force a failure (temporarily bad AI key) → confirm `failed, retryable=true` row → wait 5 min → cron run → success row appears, original marked `retryable=false`.

## Acceptance — FAULT-PROOF

- [ ] One slow follower cannot abort the batch (per-call 5s timeout)
- [ ] AI transient failures retry 2× before falling back
- [ ] Bad snapshots are skipped, not crashed
- [ ] Failed reports automatically retry within ~5 min and converge to success
- [ ] Unique index prevents duplicates even under concurrent invocations
- [ ] Client hook makes 1 network request per report load (no extra session fetch)

## Out of Scope

- No new report types, no UI changes, no schedule changes for the primary weekly/monthly cron.
- No changes to `mark-follower-report-viewed`.
