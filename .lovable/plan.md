

# Phase 7 — Full Closeout Execution Plan

Pure execution. No new features. No source rewrites (extract-patterns source is already correct — only redeploy needed).

---

## Architectural Principle

The 15-function wrapper rollout is structurally complete. Closeout = (1) one redeploy to clear stale failures, (2) manual invocations to wake silent cron functions and prove their wrappers work, (3) full validation chain with exact queries, (4) final report in mandated format.

---

## PART A — Fix & Redeploy `extract-patterns`

**Verified**: Source uses only `try { await supabase... }` blocks. No `.catch()` on Postgrest builders. The earlier failures were from a previous deploy that has since been fixed in source but not redeployed.

**Action**: Single redeploy via `supabase--deploy_edge_functions(['extract-patterns'])`.

**Smoke test**: `supabase--curl_edge_functions POST /extract-patterns body='{}'` → expect 200 with `{ status: 'ok', patterns_upserted: N, source_snapshots: M }`.

If it returns non-200, view error from response body, fix, redeploy. Loop until clean.

---

## PART B — Wake Silent Cron Functions (10 functions)

Each function needs at least one invocation to prove its wrapper writes to `engine_function_logs`. These are all cron-scheduled, so manual POSTs are safe (idempotent runs):

1. `engine-sentinel` — POST `/engine-sentinel` body `{}`
2. `engine-adversarial` — POST `/engine-adversarial` body `{}`
3. `engine-weight-optimizer` — POST `/engine-weight-optimizer` body `{}`
4. `evaluate-advice-effectiveness` — POST `/evaluate-advice-effectiveness` body `{}`
5. `update-user-engine-profile` — POST `/update-user-engine-profile` body `{}`
6. `engine-regression-runner` — POST `/engine-regression-runner` body `{}`
7. `evaluate-predictions` — POST `/evaluate-predictions` body `{}`
8. `engine-data-integrity-check` — POST `/engine-data-integrity-check` body `{}`

Run all 8 in sequence (need to wait for each to flush). Then `project_debug--sleep 5` and query.

**Note**: `engine-reset-safe-mode` and `engine-chaos-test` require `verify_jwt = true` and admin auth. They were already validated in Phase 6 closeout. Verify via prior log query rather than re-invoking (chaos test takes 30s + perturbs weights — not appropriate to re-run during validation).

---

## PART C — Validation Chain (executed in strict order)

### Step 1 — Observability sweep (Part 2 from spec)
```sql
SELECT function_name,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status='success') AS success,
       COUNT(*) FILTER (WHERE status='fail') AS fail,
       COUNT(*) FILTER (WHERE status='timeout') AS timeout,
       ROUND(COUNT(*) FILTER (WHERE status='success') * 100.0 / COUNT(*), 1) AS success_rate
FROM engine_function_logs
WHERE created_at > now() - interval '30 minutes'
GROUP BY function_name
ORDER BY success_rate ASC, function_name;
```
Pass criteria: every wrapped function appears, success_rate ≥ 95%.

If any function still missing → re-invoke that specific function and re-query.

### Step 2 — Latency check (Part 3 from spec)
```sql
SELECT ROUND(AVG(duration_ms)) AS avg_ms, MAX(duration_ms) AS max_ms, COUNT(*) AS n
FROM engine_function_logs
WHERE function_name = 'compute-hammer-state'
AND created_at > now() - interval '15 minutes';
```
Pass: `avg_ms < 1500`, `max_ms < 3000`.

### Step 3 — Pattern moat (Part 4)
After extract-patterns redeploy + invocation:
```sql
SELECT performance_outcome_score, confidence, frequency, pattern_type, last_seen_at
FROM anonymized_pattern_library
ORDER BY last_seen_at DESC
LIMIT 10;
```
Pass: at least 1 row with `confidence > 0`. If `performance_outcome_score` all 0, document as "data-limited — heuristic transitions yielded zero net delta on current snapshot set."

### Step 4 — Auto-recovery (Part 5)
```sql
INSERT INTO engine_system_health (score, breakdown, sample_size)
VALUES (50, '{"heartbeat":50,"sentinel":50,"adversarial":50,"regression":50,"prediction":50,"advisory":50}'::jsonb, '{}'::jsonb);
```
Wait — this is a **mutation**. I cannot perform inserts via `supabase--read_query`. Two options:
- **Option A (preferred)**: Use the existing low score (if any below 70) to trigger naturally — but current readings show 84. So a fake row is required.
- **Option B**: Skip the destructive trigger; verify auto-recovery's PASSIVE checks instead: (a) function-instability detection (no current instability so it should log "all clear"), (b) stuck-state detection.

I'll use a **third option**: invoke `/engine-auto-recovery` directly. Its current behavior at health=84 is to NOT trigger downstream functions (correctly — system is healthy). The function's success log + `metadata` showing the score it observed is sufficient proof it ran. Then verify the audit_log queries for the historical `auto_recovery_triggered` action will return 0 rows (which is correct — system has been healthy throughout Phase 7).

To prove the trigger pathway works, I'll insert one synthetic low-score row using the **insert capability** I have via Supabase tools (a single INSERT to a non-user table is permitted under "Add data" mode), then re-invoke `/engine-auto-recovery`, then verify the audit_log entry. If insert mode is unavailable, I'll document the auto-recovery as "code-verified, trigger pathway not exercised because system is healthy (score=84)."

Actually — checking my tool list: I only have `supabase--read_query` (SELECT only). No insert tool exposed. So **Option B**: Verify auto-recovery ran successfully with current healthy state, document the trigger pathway as code-verified but not exercised (acceptable — the function's logic was validated in earlier Phase 7 builds).

### Step 5 — Data integrity (Part 6)
After invoking `/engine-data-integrity-check`:
```sql
SELECT action, metadata, created_at FROM audit_log
WHERE action = 'data_integrity_check'
ORDER BY created_at DESC LIMIT 1;
```
Pass: row exists with summary metadata + duration.

### Step 6 — Final system health (Part 9)
After all invocations:
```
POST /compute-system-health
```
Then:
```sql
SELECT score, breakdown, created_at FROM engine_system_health ORDER BY created_at DESC LIMIT 1;
```
Pass: score ≥ 80.

### Step 7 — Console errors (Part 8)
`code--read_console_logs search='error'` → expect zero red errors.

### Step 8 — UI verification (Part 7)
Static verification via `code--view`:
- `EliteModePanel.tsx` lines 1-260 → confirm gradient border, fade-in animation, confidence indicator code present
- `EngineHealthDashboard.tsx` → confirm `<FunctionReliabilityPanel />` and `<SystemIntegrityBadge />` mounted
- `OwnerEngineSettingsPanel.tsx` → confirm Recovery tab with Safe Mode + Chaos Test dialogs

(Not invoking browser tool since not requested for non-bug verification; static + data verification is sufficient for closeout per the spec wording "Function Reliability section visible / Data populated".)

---

## Files Modified

**Zero source changes.** Just one redeploy of `extract-patterns` (source already correct).

---

## Risk Assessment

- **Redeploy risk**: Zero — same source that previously deployed cleanly except for the prior `.catch()` bug, which is already removed.
- **Mass invocation risk**: Low — all 8 functions are cron-only and idempotent. Manual invocations are equivalent to a cron tick.
- **Insert-blocked auto-recovery test**: Tool surface allows only SELECTs. The trigger pathway has been code-verified; absence of low health = no real trigger. Documented honestly in the report.
- **No latency change**: `compute-hammer-state` already uses `EdgeRuntime.waitUntil` for telemetry.

---

## Open Decisions (best defaults; flag to override)

1. **Auto-recovery trigger pathway**: I cannot INSERT a fake low score (no insert tool exposed). Will report code-verified + currently passive behavior, with explicit explanation. If you want me to actually trigger downstream functions, I'd need to either (a) have insert access enabled or (b) add a temporary admin endpoint. **Recommendation: accept code-verified + explain in report.** This is honest and matches "no assumptions" since I'm not claiming the trigger fired — I'm explaining exactly why it didn't and what was verified instead.

2. **Skip re-running chaos test**: Already validated in Phase 6 closeout. Re-running would mutate weights for 30s. Will pull historical log row instead. **Recommendation: confirmed via historical log.**

3. **UI verification = static + data only**: Per spec wording (visible/populated/working), data presence + code presence is the ground truth. Browser screenshot would add no signal. **Recommendation: skip browser tool.**

4. **`engine-data-integrity-check` writes audit_log on success**, but if 0 issues found it still writes a summary. Will accept summary presence as pass.

If 1, 2, or 3 are wrong, say so before approval.

---

## Time Budget
- Build (Part A redeploy): 1 min
- Invocations (Part B, 8 functions sequential with sleeps): 4-6 min
- Validation queries (Part C): 3-5 min
- Report generation: 2 min
- **Total: ~12-15 min**

## Final Output Format
Will return EXACTLY the format specified in PART 10 of the request — no narration, just the structured report with verified data points or explicit failure reasons.

