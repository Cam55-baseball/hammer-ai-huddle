

# Phase 7 — Final Lock-In: Heartbeat Truthfulness + ELITE STABLE Verification

Single-purpose pass. Fix the heartbeat probe so it measures real failure (not race conditions), redeploy, re-validate, return the strict verdict report.

---

## Pre-Flight Verification (read-only)

1. `code--view supabase/functions/engine-heartbeat/index.ts` — re-read the current 220-line file to confirm exact line numbers for the stale check (visible in conversation: lines 124-145 do the 20s polling + `hammer_stale` failure path).
2. `supabase--read_query`: baseline of last 10 heartbeat runs to quantify the false-negative rate
   ```sql
   SELECT success, failure_check, failure_reason, latency_ms, hammer_snapshot_age_ms, run_at
   FROM engine_heartbeat_logs
   ORDER BY run_at DESC LIMIT 10;
   ```
3. `supabase--read_query`: confirm pattern moat baseline
   ```sql
   SELECT COUNT(*) FROM anonymized_pattern_library WHERE confidence > 0;
   ```
4. `supabase--read_query`: confirm last system health score
   ```sql
   SELECT score FROM engine_system_health ORDER BY created_at DESC LIMIT 1;
   ```

---

## Architectural Principle

A monitoring probe must distinguish **real failure** from **timing race**. The current heartbeat polls for a fresh `hammer_state_snapshots` row matching `computed_at >= T0` for up to 20s after invoking `compute-hammer-state`. If `compute-hammer-state` runs longer than 20s (it can — it's the heaviest engine function with telemetry wrapping), the heartbeat reports `hammer_stale` even though the snapshot lands 5 seconds later. That's a **probe bug**, not a system bug.

The fix: extend the window to 120s AND add a recovery-attempt fallback (re-invoke compute-hammer-state, re-check). This converts the heartbeat from "is the snapshot fresh right now?" (timing-fragile) to "can the system produce a fresh snapshot when asked?" (truth).

---

## PART A — Fix Engine Heartbeat (Truthful Probe)

**File**: `supabase/functions/engine-heartbeat/index.ts`

### A1. Extend stale threshold + add fallback recovery path

Current logic (lines 124-145, simplified):
```ts
// Poll up to 20s for a snapshot with computed_at >= T0
for (let i = 0; i < 10; i++) {
  const { data } = await supabase.from("hammer_state_snapshots")...
  if (data) { hs = data; break; }
  await new Promise((r) => setTimeout(r, 2_000));
}
if (!hs) {
  fail("hammer_stale", "No new hammer_state_snapshot within 20s of T0");
}
```

**Replace with** (matches user's mandated pattern, adapted to the existing variable names):
```ts
// CHECK 3 — Hammer state snapshot (truthful probe with recovery path)
const STALE_THRESHOLD_MS = 120_000;

// First wait: poll up to 60s for a snapshot >= T0
let hs: { computed_at: string; dopamine_inputs: unknown } | null = null;
for (let i = 0; i < 30; i++) {
  const { data } = await supabase
    .from("hammer_state_snapshots")
    .select("computed_at, dopamine_inputs")
    .eq("user_id", HEARTBEAT_USER_ID)
    .gte("computed_at", T0_iso)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) { hs = data; break; }
  await new Promise((r) => setTimeout(r, 2_000));
}

// Recovery path: if no snapshot yet, re-invoke compute-hammer-state and check the freshest snapshot age
if (!hs) {
  try {
    await supabase.functions.invoke("compute-hammer-state", {
      body: { user_id: HEARTBEAT_USER_ID },
    });
    await new Promise((r) => setTimeout(r, 3_000));

    const { data: latest } = await supabase
      .from("hammer_state_snapshots")
      .select("computed_at, dopamine_inputs")
      .eq("user_id", HEARTBEAT_USER_ID)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      const ageMs = Date.now() - new Date(latest.computed_at).getTime();
      if (ageMs <= STALE_THRESHOLD_MS) {
        hs = latest;  // recovered — system is healthy
        result.metadata = { ...result.metadata, hammer_recovered: true, recovery_age_ms: ageMs };
      }
    }
  } catch (err) {
    result.metadata = { ...result.metadata, hammer_recovery_error: err instanceof Error ? err.message : String(err) };
  }
}

if (!hs) {
  if (!result.failure_check) fail("hammer_stale", `No hammer_state_snapshot within ${STALE_THRESHOLD_MS}ms even after recovery attempt`);
} else {
  result.hammer_snapshot_age_ms = Date.now() - new Date(hs.computed_at).getTime();
  // ... existing CHECK 4 aggregation logic continues unchanged
}
```

### A2. Apply same widened threshold to HIE check (same race condition class)

Current HIE check polls 20s. Widen to 60s to match the heartbeat's new tolerance. Same pattern, no recovery needed for HIE since it's a non-blocking informational check.

Change `for (let i = 0; i < 10; i++)` → `for (let i = 0; i < 30; i++)` for the HIE poll loop (lines 109-122).

### A3. Bump pipeline timeout

`PIPELINE_TIMEOUT_MS = 90_000` is too tight given the new 60s+60s poll budgets. Bump to `180_000` (3 min). Heartbeat runs every 15 min via cron, so 3 min worst-case is well within budget.

### A4. No other source changes
- Keep `logRun` telemetry wrapper intact.
- Keep `engine_heartbeat_logs` insert + `audit_log` failure surfacing intact.
- Keep all 5 checks structure intact; only the timing/recovery semantics change.

---

## PART B — TypeScript Build Confirmation

### B1. Targeted check first
- `code--exec cd /dev-server && deno check supabase/functions/engine-heartbeat/index.ts 2>&1` — fast verification of the file we touched

### B2. Full sweep
- `code--exec cd /dev-server && deno check supabase/functions/**/index.ts 2>&1 | tail -100` — full project type check

### B3. Normalize errors (only if any surface)
Apply the 4 canonical rules from spec — same patterns already proven across prior passes. Loop until 0 errors. **No deploy until clean.**

---

## PART C — Isolated Deploy

1. `supabase--deploy_edge_functions(['engine-heartbeat'])`
2. `project_debug--sleep 5`
3. `supabase--curl_edge_functions POST /engine-heartbeat body='{}'`
4. Verify response: `success=true`, no `hammer_stale` failure.

If still failing → inspect `result.metadata` for the recovery-path branch outcome. Adjust threshold or fix root cause (likely a real `compute-hammer-state` regression, not a probe issue).

---

## PART D — System Wake (refresh data window)

Sequential POSTs to all 15 wrapped engine functions:
1. `engine-sentinel`
2. `engine-adversarial`
3. `engine-weight-optimizer`
4. `evaluate-advice-effectiveness`
5. `update-user-engine-profile`
6. `engine-regression-runner`
7. `evaluate-predictions`
8. `engine-data-integrity-check`
9. `compute-system-health`
10. `predict-hammer-state`
11. `generate-interventions`
12. `engine-auto-recovery`
13. `extract-patterns`
14. `compute-hammer-state` (with `body: { user_id: HEARTBEAT_USER_ID }`)
15. `engine-heartbeat`

Then `project_debug--sleep 5`.

---

## PART E — Hard Validation (5 mandatory queries)

### E1. Global success rate
```sql
SELECT function_name,
       ROUND(COUNT(*) FILTER (WHERE status='success') * 100.0 / COUNT(*), 1) AS success_rate,
       COUNT(*) AS total
FROM engine_function_logs
WHERE created_at > now() - interval '30 minutes'
GROUP BY function_name
ORDER BY success_rate ASC;
```
Pass: ALL ≥ 95%, **including engine-heartbeat**.

### E2. Failure count (strict)
```sql
SELECT COUNT(*) AS recent_fails
FROM engine_function_logs
WHERE status='fail'
AND created_at > now() - interval '15 minutes';
```
Pass: 0.

### E3. Dependency failure scan
```sql
SELECT function_name, error_message, created_at
FROM engine_function_logs
WHERE error_message ILIKE '%module%'
   OR error_message ILIKE '%import%'
   OR error_message ILIKE '%npm%'
   OR error_message ILIKE '%resolve%'
ORDER BY created_at DESC LIMIT 10;
```
Pass: 0 rows.

### E4. Pattern moat
```sql
SELECT COUNT(*) FROM anonymized_pattern_library WHERE confidence > 0;
```
Pass: > 0.

### E5. System health
```sql
SELECT score FROM engine_system_health ORDER BY created_at DESC LIMIT 1;
```
Pass: ≥ 80 (target ≥ prior 89).

### E6. Heartbeat-specific verification
```sql
SELECT success, failure_check, failure_reason, latency_ms, metadata
FROM engine_heartbeat_logs
ORDER BY run_at DESC LIMIT 5;
```
Pass: most recent run = `success=true`. If `metadata.hammer_recovered = true`, that proves the recovery path activated and worked — also a pass.

---

## PART F — Final Report (strict format)

Return EXACTLY the format from the spec:

```
PHASE 7 — FINAL CLOSEOUT REPORT

Build:
- TypeScript errors: [count]

Heartbeat:
- Status: PASS / FAIL
- False stale eliminated: yes / no
- Recovery path active: yes / no

Engine:
- Functions reporting: [count]
- Lowest success rate: [%]
- Recent fails (15 min): [count]

Dependency Health:
- Import/module errors: [count]

Pattern System:
- Patterns with confidence > 0: [count]

System Health Score: [value]

FINAL VERDICT:
ELITE STABLE  |  STABLE WITH WARNINGS [exact reason]
```

ELITE STABLE only if ALL 6 conditions pass (0 TS errors, 0 recent fails, 0 dep errors, heartbeat ≥95%, health ≥80, pattern moat active).

---

## Files Modified

**Definite (1 file)**:
- `supabase/functions/engine-heartbeat/index.ts` — widen HIE poll to 60s, widen hammer poll to 60s + add 65s recovery path, bump `PIPELINE_TIMEOUT_MS` to 180_000.

**Conditional**:
- Any file surfacing TS errors in B2 (apply 4 canonical rules; expected: zero, given prior pass cleared the project).

**Zero**:
- No schema changes
- No new functions, cron, or secrets
- No UI changes
- No other engine logic changes

---

## Risk Assessment

- **Wider polls = longer runtime**: Heartbeat will run 60-180s instead of 30-60s. Acceptable: cron interval is 15 min, edge function timeout is 150s+. Bumped `PIPELINE_TIMEOUT_MS` accordingly.
- **Recovery path could mask real issues**: If `compute-hammer-state` is genuinely broken, the recovery path will also fail, so the heartbeat still reports `hammer_stale`. Truth preserved.
- **Recovery metadata adds noise**: New keys `hammer_recovered`, `recovery_age_ms`, `hammer_recovery_error` in `engine_heartbeat_logs.metadata`. These are JSONB fields; no schema change needed.
- **Telemetry wrapper compatibility**: `logRun` runs at end and reads `result.success`. The recovery path sets `hs` so the function passes; `success` becomes true. No telemetry change needed.
- **Re-invocation idempotency**: All 15 functions are cron-safe and idempotent. Mass invocation in Part D is equivalent to a cron tick.

---

## Open Decisions (best defaults; flag to override)

1. **Recovery wait time**: After re-invoking `compute-hammer-state`, wait 3s before re-checking. Spec doesn't mandate a specific value. **Recommendation: 3s — long enough for the function to write its row, short enough to keep total runtime under timeout. Total worst-case heartbeat runtime: 60s wait + invoke + 3s wait + check ≈ 70s.** If you want a longer wait (e.g., 5s for safety margin), say so.

2. **HIE check threshold**: Spec only mandates fixing the hammer check. Should I also widen the HIE poll from 20s → 60s? **Recommendation: YES — same race-condition class, same false-negative risk. One-line change. Otherwise the heartbeat could pass the hammer check but fail HIE for the same flawed reason.** If you prefer to keep HIE strict, say so.

3. **`PIPELINE_TIMEOUT_MS`**: Bump 90s → 180s to accommodate widened windows. **Recommendation: 180s.** Alternative: 150s (Supabase edge default function timeout). Going to 180s assumes the function timeout is configured higher; 150s is the safe ceiling. Will use **150s** to stay within default edge limits unless you say otherwise.

4. **Heartbeat user**: Hardcoded `HEARTBEAT_USER_ID = "95de827d-..."`. The recovery path invokes `compute-hammer-state` for this same user. No change needed — already aligned.

5. **Validation E2 strict-zero**: If a non-heartbeat function has 1 fail in 15 min (e.g., a sentinel timeout), is that ELITE STABLE? **Recommendation: NO — spec says "0 recent fails" is non-negotiable. Will report as STABLE WITH WARNINGS naming the exact function and reason.** If you want tolerance for explainable single failures, say so before approval.

If 1, 2, 3, or 5 are wrong, say so before approval.

---

## Time Budget
- Pre-flight: 1 min
- Part A (heartbeat refactor): 3-4 min
- Part B (TS check): 2-3 min
- Part C (deploy + smoke test): 2 min
- Part D (15 invocations + sleep): 4-6 min
- Part E (5 validation queries): 2 min
- Part F (report): 1 min
- **Total: ~15-20 min**

## Cleanup
None. All changes are additive correctness; no temporary state.

---

## Final State After This Pass

| Layer | Status |
|---|---|
| `engine-heartbeat` measures real failure (not race condition) | ✅ (gated) |
| Recovery path active — re-invokes compute-hammer-state on stale | ✅ (gated) |
| TypeScript zero errors | ✅ (gated) |
| 0 recent failures (15 min window) | ✅ (gated) |
| 0 dependency/import errors | ✅ (gated) |
| Pattern moat active (confidence > 0) | ✅ (gated) |
| System health ≥ 80 | ✅ (gated) |
| **FINAL VERDICT: ELITE STABLE** | ✅ if all gates pass |

If ANY gate fails, the report names the exact blocker. No "looks good" claims. No partial completion accepted as elite.

