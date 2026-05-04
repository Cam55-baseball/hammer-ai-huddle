## Phase X.2 Integrity Lock — Status & Final Guard

### Audit results (already correct)

**Fix 1 — math operator**: Already correct. Line 408 reads `(mode === 'weekly_digest' ? 7 : 30) * 86400000`. No silent bug present; nothing to change.

**Fix 3 — `periodFor()` not in retry path**: Confirmed via `rg`. `periodFor()` is defined at line 347 and called only at line 459 (non-retry / scheduled path). The retry block (lines 365–443) never references it and has no fallback recompute.

### Fix 2 — Add explicit invalid-date guard (the only real change)

In `supabase/functions/generate-follower-reports/index.ts`, retry block, replace lines 405–409:

```ts
const periodStart = t.period_start;
const periodEnd = new Date(
  new Date(periodStart).getTime() +
  (mode === 'weekly_digest' ? 7 : 30) * 86400000,
).toISOString().slice(0, 10);
```

with:

```ts
const periodStart = t.period_start;
const startMs = new Date(periodStart).getTime();
if (Number.isNaN(startMs)) {
  await logResult(
    supabase,
    { follower_id: t.follower_id, player_id: t.player_id, follower_role: role },
    mode,
    'skipped',
    'invalid_period_start',
    null,
    0,
    false,
    null,
  );
  skipped++;
  continue;
}
const periodEnd = new Date(
  startMs + (mode === 'weekly_digest' ? 7 : 30) * 86400000,
).toISOString().slice(0, 10);
```

This prevents a malformed `period_start` (e.g. corrupted log row) from producing `"Invalid Date"` → throw inside `.toISOString()` and aborting the retry batch. Bad rows are logged non-retryable and skipped.

### Out of scope
No schema, cron, UI, or other function changes. No edits to `mark-follower-report-viewed`. `logResult` signature unchanged.

### Post-deploy verification
1. Duplicates query → 0 rows.
2. `follower_report_logs` last 10 min → failed converges to success; no lingering `retryable=true` past 5 min.
3. `period_start`/`period_end` on retried reports match original failed log windows (no drift).
