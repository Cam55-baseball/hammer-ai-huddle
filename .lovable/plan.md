## Phase X.2 — Strict Period Determinism in Retry Mode

Close the last gap: retries must regenerate the **same period window** as the original failure, never recompute from "now".

### Change 1 — `supabase/functions/generate-follower-reports/index.ts` (retry block, ~lines 380–421)

Replace the fallback period derivation with a hard requirement:

- If `t.period_start` is missing → log `skipped / missing_period_start` (non-retryable) and `continue`. Do NOT call `periodFor()`.
- Compute `periodEnd` strictly from `periodStart`:
  ```ts
  const periodStart = t.period_start;
  const periodEnd = new Date(
    new Date(periodStart).getTime() +
    (mode === 'weekly_digest' ? 7 : 30) * 86400000
  ).toISOString().slice(0, 10);
  ```
- Drop the `t.period_end` fallback entirely (period_end is always derived from period_start).

### Change 2 — Tighten retry-cleanup window (same file, line 420)

Replace the meaningless `Date.now() - 1000` cutoff with the worker's 5-minute boundary:
```ts
const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
// ...
.lt('created_at', cutoff);
```
Hoist `cutoff` to the top of the retry block so all log-flip queries reuse it.

### Change 3 — Logger comment style (line 60)

Change `/* never throw from logger */` → `// never throw from logger` per spec (cosmetic, but requested).

### Out of scope
No UI, no schema changes, no cron changes, no `mark-follower-report-viewed`, no AI-fallback logging behavior change (kept as-is by design).

### Verification (post-deploy)
1. **Determinism**: invalidate `LOVABLE_API_KEY` → run generator → restore key → wait for cron retry → confirm `period_start`/`period_end` on the resulting `follower_reports` row matches the original failed log.
2. **Convergence**: `SELECT status, retryable, COUNT(*) FROM follower_report_logs WHERE created_at > now() - interval '10 minutes' GROUP BY 1,2;` — expect failed→success, no lingering `retryable=true`.
3. **No drift under concurrency**: duplicates query returns 0.
