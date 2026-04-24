

# Phase 7 — Continuation: Wrapper Rollout, Moat Logic & Validation

The 5 net-new artifacts (tables, hooks, badges, auto-recovery function, integrity function, contract file) are deployed. This continuation completes the remaining 3 deferred items from the approved Phase 7 plan, with no scope expansion.

---

## Pre-Flight Verification (read-only)

1. `code--view supabase/functions/extract-patterns/index.ts` — confirm current bucketing logic before extending with outcome scoring (already in context partially; confirm full shape)
2. `supabase--read_query`: `SELECT function_name, COUNT(*) FROM engine_function_logs GROUP BY function_name` — see which functions are already self-logging (engine-auto-recovery already does)
3. `supabase--read_query`: `SELECT score FROM engine_system_health ORDER BY created_at DESC LIMIT 1` — record baseline for post-rollout comparison
4. `code--view supabase/functions/compute-hammer-state/index.ts` — confirm current shape, find safest `EdgeRuntime.waitUntil` insertion point

---

## Architectural Principle

Every wrapped function gets the **same minimal additive shell**:
- Inline `logRun()` helper at top of file (~10 lines, copy-paste)
- 30s timeout via `Promise.race`
- Try/catch around the existing `serve()` body
- One INSERT to `engine_function_logs` per execution
- For `compute-hammer-state` only: use `EdgeRuntime.waitUntil(logRun(...))` to keep zero added latency on the user-facing path

**Existing logic inside each function is untouched.** The wrapper is structurally outside the business code. If logging insert fails, the function still returns its real response.

---

## PART A — Observability Wrapper Rollout (14 functions)

### Wrap each function with this template:

```ts
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: '<FN_NAME>',
      status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent */ }
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const work = (async (): Promise<Response> => {
    try {
      // ===== existing function body unchanged =====
      const result = /* existing logic */;
      await logRun(supabase, 'success', startMs, undefined, { /* useful metadata */ });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      await logRun(supabase, 'fail', startMs, String(err));
      return new Response(JSON.stringify({ error: String(err), fallback: true }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  })();

  const timeout = new Promise<Response>((resolve) => setTimeout(async () => {
    await logRun(supabase, 'timeout', startMs);
    resolve(new Response(JSON.stringify({ error: 'timeout', fallback: true }), {
      status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
    }));
  }, 30000));

  return Promise.race([work, timeout]);
});
```

### Special case: `compute-hammer-state`
Replace `await logRun(...)` with `EdgeRuntime.waitUntil(logRun(...))` so the response payload returns to the browser BEFORE the logging insert runs. Zero added latency. Same pattern is already used for the snapshot_versions insert from Phase 6.

### Functions to wrap (14 total — the remaining ones not yet wrapped):
1. `compute-hammer-state` (uses `EdgeRuntime.waitUntil` — zero latency)
2. `engine-heartbeat`
3. `engine-sentinel`
4. `engine-adversarial`
5. `engine-weight-optimizer`
6. `evaluate-advice-effectiveness`
7. `extract-patterns` (also gets Part B logic update in same edit)
8. `update-user-engine-profile`
9. `predict-hammer-state`
10. `generate-interventions`
11. `engine-regression-runner`
12. `evaluate-predictions`
13. `compute-system-health`
14. `engine-reset-safe-mode` + `engine-chaos-test` (admin functions — keep verify_jwt; wrapper goes inside the auth-passing block)

`engine-auto-recovery` and `engine-data-integrity-check` are NEW from Phase 7 and already log via the same `logRun()` pattern (verified in source).

### Deployment strategy:
- Single batch deploy via `supabase--deploy_edge_functions` with all 14 names. If one fails, others succeed independently.
- Edit one function, deploy, smoke-test with `supabase--curl_edge_functions`, then move to the next batch.
- Group order: cron-only (low risk) → user-facing `compute-hammer-state` last (highest scrutiny).

---

## PART B — Pattern Moat Logic Update

### Modify `supabase/functions/extract-patterns/index.ts`
The migration already added `performance_outcome_score` and `confidence` columns (default 0). This phase populates them.

After bucketing patterns, for each bucket:

1. **Outcome scoring** (heuristic, deterministic):
   - Look at the next snapshot in time order for users who matched the pattern's anonymized signature
   - State delta scoring: `recover→ready=+10`, `caution→ready=+10`, `ready→prime=+10`, `prime→caution=-10`, `ready→caution=-10`, `caution→recover=-10`, same state=0, opposite extreme=-15
   - Aggregate per bucket as average → `performance_outcome_score`

2. **Confidence**:
   - Formula: `min(95, sqrt(frequency) * 10)`
   - frequency = count of snapshots matching this pattern in the extraction window

3. **UPDATE the existing INSERT** in `extract-patterns` to include both columns. Existing rows with default 0/0 get overwritten on next run.

The `pattern_library_ranked` VIEW (already created in Phase 7 migration) will then start showing ranked patterns once `extract-patterns` runs.

### Combine with Part A wrapper
Since `extract-patterns` is also in the wrapper rollout list, the moat logic update + observability wrapper happen in a single file edit + single deploy.

---

## PART C — Validation (10-step chain)

Run sequentially after all deploys complete:

1. **Logging present**:
   - `supabase--curl_edge_functions` POST `/compute-hammer-state` body `{}`
   - `project_debug--sleep 3`
   - `supabase--read_query`: `SELECT function_name, status, duration_ms FROM engine_function_logs WHERE function_name='compute-hammer-state' ORDER BY created_at DESC LIMIT 1`
   - Assert: row exists, `status='success'`, `duration_ms < 3000`

2. **Wrapper safety on bad input**:
   - `supabase--curl_edge_functions` POST `/predict-hammer-state` with malformed body
   - Confirm row in `engine_function_logs` with `status='fail'` (or success if function tolerates it), function returns clean JSON not crash

3. **Hook & dashboard render**:
   - `supabase--read_query`: `SELECT COUNT(DISTINCT function_name) FROM engine_function_logs WHERE created_at > now() - interval '1 hour'`
   - Expect ≥ 5 (after invocations above)
   - Visit `/engine-health` (already done previously, just confirm live data)

4. **Auto-recovery integration**:
   - `supabase--curl_edge_functions` POST `/engine-auto-recovery`
   - `supabase--read_query`: `SELECT * FROM engine_function_logs WHERE function_name='engine-auto-recovery' ORDER BY created_at DESC LIMIT 1`
   - Should be success, with `metadata` containing summary

5. **Data integrity dry run**:
   - `supabase--curl_edge_functions` POST `/engine-data-integrity-check`
   - `supabase--read_query`: `SELECT * FROM audit_log WHERE action='data_integrity_check' ORDER BY created_at DESC LIMIT 1`
   - Confirm summary metadata

6. **Pattern moat backfill**:
   - `supabase--curl_edge_functions` POST `/extract-patterns`
   - `supabase--read_query`: `SELECT pattern_signature, performance_outcome_score, confidence, frequency FROM anonymized_pattern_library WHERE confidence > 0 ORDER BY last_seen_at DESC LIMIT 5`
   - Confirm at least one row has non-zero values (will be 0 if no historical state-transition data — document if so)

7. **Stability sweep**:
   - `supabase--read_query`:
     ```sql
     SELECT function_name,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status='success') * 100.0 / COUNT(*) AS success_rate,
            ROUND(AVG(duration_ms)) AS avg_ms
     FROM engine_function_logs
     WHERE created_at > now() - interval '15 minutes'
     GROUP BY function_name
     ORDER BY success_rate ASC;
     ```
   - Assert: every function ≥ 95% success

8. **Latency check on user-facing path**:
   - `supabase--read_query`: `SELECT AVG(duration_ms), MAX(duration_ms) FROM engine_function_logs WHERE function_name='compute-hammer-state' AND created_at > now() - interval '15 minutes'`
   - Assert: avg < 1500ms (should be unchanged from baseline thanks to `EdgeRuntime.waitUntil`)

9. **System health refresh**:
   - `supabase--curl_edge_functions` POST `/compute-system-health`
   - `supabase--read_query`: `SELECT score FROM engine_system_health ORDER BY created_at DESC LIMIT 1`
   - Assert: score ≥ 80 (or document any drop with explanation)

10. **No console errors in app**:
    - `code--read_console_logs search='error'`
    - Fix any reds. Empty result = pass.

---

## Files Modified (Part A + B)

**Modified edge functions** (14 — wrapper + moat for extract-patterns):
- `supabase/functions/compute-hammer-state/index.ts`
- `supabase/functions/engine-heartbeat/index.ts`
- `supabase/functions/engine-sentinel/index.ts`
- `supabase/functions/engine-adversarial/index.ts`
- `supabase/functions/engine-weight-optimizer/index.ts`
- `supabase/functions/evaluate-advice-effectiveness/index.ts`
- `supabase/functions/extract-patterns/index.ts` (wrapper + moat logic)
- `supabase/functions/update-user-engine-profile/index.ts`
- `supabase/functions/predict-hammer-state/index.ts`
- `supabase/functions/generate-interventions/index.ts`
- `supabase/functions/engine-regression-runner/index.ts`
- `supabase/functions/evaluate-predictions/index.ts`
- `supabase/functions/compute-system-health/index.ts`
- `supabase/functions/engine-reset-safe-mode/index.ts`
- `supabase/functions/engine-chaos-test/index.ts`

(15 files; admin functions count as one batch)

**No** new files. **No** new tables. **No** new cron schedules. **No** UI changes.

---

## Risk Assessment

- **Wrapper deployment risk**: Each function is independently deployable. A bad wrapper on one function doesn't affect others. Smoke-testing per function catches issues immediately.
- **Latency on `compute-hammer-state`**: Zero — `EdgeRuntime.waitUntil` runs the insert post-response. Other functions are cron-only; +30ms for one INSERT is acceptable.
- **Wrapper bug surfaces existing bugs**: If a function was silently throwing before, it now logs `status='fail'`. This is intended observability, not a new failure. The `audit_log` will surface any newly-visible function instability.
- **`extract-patterns` outcome scoring**: Heuristic; cannot break consumers because no UI reads `performance_outcome_score` yet. Worst case = stays at 0 if no transition data exists.
- **Storage**: `engine_function_logs` retention 30d, ~50k rows/day max. Indexed. No concerns.

---

## Open Decisions (best defaults; flag to override)

1. **Wrapper template is inline per file** (not a shared module). Deno edge functions can't easily share local code without import_map gymnastics. Inline keeps each function self-contained and independently deployable. Trade-off: minor duplication.

2. **`logRun()` failures are silent** (try/catch swallowed). Logging must never break production functions. If `engine_function_logs` table is unavailable, the function still returns its real response. The dashboard will show no data for that window — acceptable degradation.

3. **`extract-patterns` outcome scoring is deterministic, not ML**. Spec explicitly says future training data — current build sets up the data shape. v2 model trains on it later.

4. **Validation step 6 (moat backfill) may show 0/0** if historical pattern data has no clear next-snapshot transitions in the extraction window. This is documented as expected, not a failure.

5. **Validation will pause 3-5 seconds after each function invocation** before querying logs (writes need to flush). Uses `project_debug--sleep`.

6. **`engine-reset-safe-mode` and `engine-chaos-test` get the wrapper** but the auth check happens FIRST (before timeout race) so unauthorized calls never reach the work block.

If any of those six are wrong, say so before approval.

---

## Time Budget
- Build (Parts A + B): ~15-20 minutes (15 file edits, 1 batch deploy)
- Validation (Part C): ~5-7 minutes (10-step chain with sleeps)

## Cleanup
None required — `engine_function_logs` already has a 30-day cleanup function and cron schedule from earlier in Phase 7.

---

## Final State After Phase 7 Completion

| Layer | Status |
|---|---|
| 14 engine functions self-log | ✅ |
| Pattern moat captures outcome data | ✅ |
| Function Reliability dashboard live | ✅ (already built) |
| Auto-recovery responds to health drops | ✅ (already built) |
| Data integrity check runs daily | ✅ (already built) |
| Elite UI polish | ✅ (already built) |
| Engine Contract V2 | ✅ (already built) |
| `compute-hammer-state` zero added latency | ✅ via `EdgeRuntime.waitUntil` |

**System verdict after validation**: ELITE STABLE (target).

