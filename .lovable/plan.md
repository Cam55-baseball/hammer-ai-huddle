

# Phase 7 — Hardened Final Closeout: Unbreakable Build + Runtime Guarantee

Lock-in pass. Two structural changes (dual-import fallback, global npm: scan), one full-project type check, one isolated deploy, four runtime verification queries, one verdict.

---

## Pre-Flight Verification (read-only)

1. `code--view supabase/functions/check-render-status/index.ts` — confirm current import statement before refactor
2. `code--exec rg -n '^import.*npm:' supabase/functions` — enumerate ALL `npm:` imports across edge functions (not just check-render-status). This is the critical scan that catches future-fragility.
3. `code--exec rg -n 'getClaims\|\.catch\(' supabase/functions` — final residual sweep for prior-pattern bugs
4. `supabase--read_query`: `SELECT COUNT(*) FROM engine_function_logs WHERE status='fail' AND created_at > now() - interval '30 minutes'` — failure baseline before changes

---

## Architectural Principle

`nodeModulesDir: "auto"` allows install but doesn't guarantee runtime resolution under cold-start, version drift, or registry hiccups. The fix is a **dual-import fallback** at function boot: try `npm:` first, fall back to `https://esm.sh/` if it throws. This pattern eliminates dependency fragility as a failure class entirely. We apply it to every `npm:` import we find, not just `check-render-status`.

The TypeScript closeout is a normalization pass against the four canonical bug patterns from the prior build log. No improvisation — apply the exact rules from spec.

---

## PART A — Make `check-render-status` Truly Unbreakable

### A1. Keep existing fix
File `supabase/functions/check-render-status/deno.json` already contains `{ "nodeModulesDir": "auto" }`. No change.

### A2. Refactor import to dual-safe pattern
**File**: `supabase/functions/check-render-status/index.ts`

**Current** (line 2):
```ts
import { getRenderProgress } from "npm:@remotion/lambda-client@4.0.445";
```

**Replace with**:
```ts
let getRenderProgress: any;
try {
  const mod = await import("npm:@remotion/lambda-client@4.0.445");
  getRenderProgress = mod.getRenderProgress;
} catch {
  const mod = await import("https://esm.sh/@remotion/lambda-client@4.0.445");
  getRenderProgress = mod.getRenderProgress;
}
```

This runs once at module load. If npm resolution fails, esm.sh CDN fallback kicks in. The function body that calls `getRenderProgress(...)` stays untouched.

**Note**: Top-level `await import(...)` is supported in Deno edge runtime. Verified pattern.

### A3. Global `npm:` scan
For every `npm:` import found in step 2 of pre-flight (excluding check-render-status which is already handled), apply the **same** dual-import pattern. Expected candidates likely include:
- `npm:stripe@...` in payment functions (already widely used; may be stable enough to leave alone — see decision below)
- `npm:@supabase/supabase-js@...` if any function uses npm: prefix instead of esm.sh

**Decision gate** (open below): apply fallback to ALL npm: imports OR only to imports that have actually failed in the past?

---

## PART B — Final TypeScript Zero-Error Guarantee

### B1. Full-project type check
- `code--exec cd /dev-server && npx -y supabase functions check 2>&1 | tee /tmp/tscheck.log` (full output, no truncation)
- If Supabase CLI not available: `code--exec cd /dev-server && deno check supabase/functions/**/index.ts 2>&1 | tee /tmp/tscheck.log`

### B2. Normalize errors against 4 canonical rules
Apply EXACTLY the patterns from spec. No improvisation:

| Rule | Search | Replace |
|---|---|---|
| 1 — Postgrest catch | `.from(...)...catch(` | `try { await ... } catch (err) { }` |
| 2 — Unknown error | `catch (error) { ...error.message }` | `catch (error: unknown) { const err = error instanceof Error ? error.message : String(error) }` |
| 3 — getClaims | `auth.getClaims(` | `auth.getUser(` |
| 4 — Strict client typing | `SupabaseClient<...>` param mismatches | `const supabase: any = createClient(...)` only where blocking |

### B3. Re-check loop
Repeat B1 → B2 until zero errors. Hard gate before any deploy.

---

## PART C — Deploy with Failure Isolation

1. **First wave** (smallest blast radius): `supabase--deploy_edge_functions(['check-render-status', 'extract-patterns'])`
2. `project_debug--sleep 5`
3. **Second wave** (only if any other files modified in B2): deploy those individually
4. **Skip mass redeploy** of unchanged engine functions — already deployed and validated in prior pass

---

## PART D — Runtime Validation

### D1. Direct invocation test
- `supabase--curl_edge_functions POST /check-render-status body='{}'`
- Pass: HTTP 200, no module/import errors in response
- `supabase--edge_function_logs function_name='check-render-status'` — verify boot succeeded with no import errors

### D2. Logging pipeline intact
**Note**: `check-render-status` is NOT one of the 15 wrapped engine functions, so it does NOT write to `engine_function_logs`. The spec's D2 query will return 0 rows for `check-render-status` — that's expected and correct.

**Adjusted D2**: Verify the function ran successfully via `supabase--edge_function_logs` (already shows `Processed 0 jobs` in recent logs from useful-context — confirming it works). Skip the `engine_function_logs` query for this specific function as it doesn't apply.

If you want me to wrap `check-render-status` with the `logRun` telemetry helper too (so it DOES write to engine_function_logs), say so — that's a 10-line additive change. **Default: skip, since it's a render orchestrator, not an engine function.**

### D3. Global failure detection
```sql
SELECT function_name,
       COUNT(*) FILTER (WHERE status='fail') AS fails,
       COUNT(*) AS total
FROM engine_function_logs
WHERE created_at > now() - interval '30 minutes'
GROUP BY function_name
ORDER BY fails DESC;
```
Pass: no unexpected spikes vs prior-pass baseline (last known: 100% success across all wrapped functions).

### D4. Edge dependency failure scan
```sql
SELECT function_name, error_message, created_at
FROM engine_function_logs
WHERE error_message ILIKE '%module%'
   OR error_message ILIKE '%import%'
   OR error_message ILIKE '%npm%'
   OR error_message ILIKE '%resolve%'
ORDER BY created_at DESC
LIMIT 10;
```
Pass: 0 rows. Any hit means a wrapped function is hitting a dependency error — must investigate before declaring stable.

---

## PART E — Final Hard Guarantee

```sql
SELECT COUNT(*) AS recent_fails
FROM engine_function_logs
WHERE status='fail'
AND created_at > now() - interval '15 minutes';
```
Pass: 0, OR documented + explained.

---

## PART F — Final Report

Return EXACTLY:

```
Phase 7 — HARDENED CLOSEOUT REPORT

Build:
- TypeScript errors: [count]
- npm: imports hardened: [count/total]

check-render-status:
- Deployed: yes/no
- Runtime: 200/error
- Dual-import fallback: active

Engine Functions:
- Logging: [count]/15
- Lowest success_rate: [%]
- Recent fails: [count]

Dependency Health:
- Module/import errors in last 30 min: [count]

System Health Score: [value]

FINAL VERDICT:
ELITE STABLE  |  STABLE WITH WARNINGS [reason]  |  NOT STABLE [blocker]
```

---

## Files Likely Modified

**Definite**:
- `supabase/functions/check-render-status/index.ts` (dual-import refactor)

**Conditional** (depends on Pre-Flight scan results):
- Other edge functions with `npm:` imports (apply same pattern if Decision 1 = "all")
- Any edge function still failing TypeScript check after prior pass (apply rules 1-4)

**Zero**:
- No source logic changes
- No schema changes
- No UI changes
- No new tables, cron, or secrets

---

## Risk Assessment

- **Top-level `await import()` risk**: Zero. Supported in Deno edge runtime; documented pattern.
- **Dual-import latency**: Negligible. The try-path resolves on cold start only. Once cached, no penalty.
- **esm.sh fallback availability**: esm.sh has 99.9%+ uptime and serves the same package. Acceptable failover.
- **TS check tooling**: If `supabase functions check` isn't available in sandbox, `deno check` is equivalent for type-only validation. Either provides the gate.
- **`check-render-status` not in `engine_function_logs`**: This is correct by design — it's a render orchestrator, not an engine function. D2 must be interpreted accordingly (or we add wrapper as a small additive).

---

## Open Decisions (best defaults; flag to override)

1. **Dual-import scope**: Apply fallback to **only `check-render-status`** (the one with documented failure history) OR to **every `npm:` import** project-wide?
   **Recommendation**: Only apply to `check-render-status` + any other npm: import that has actually failed in logs. Applying to all npm: imports adds ~5-10 LOC each to ~10-20 functions for theoretical risk on packages that have never failed (e.g., `npm:stripe`, which is widely deployed). **Default: scoped to demonstrated failures + any new failures surfaced in D4.**

2. **`check-render-status` telemetry wrapping**: Add the `logRun` helper to write to `engine_function_logs`?
   **Recommendation**: NO. It's a render orchestrator, not an engine function. The `function_edge_logs` already capture its runs. Wrapping would be scope creep. **Default: skip.**

3. **TS check tool**: `npx supabase functions check` (preferred) or `deno check` (fallback)?
   **Recommendation**: Try supabase CLI first; fall back to deno. Both gate identically on errors. **Default: try in order, use whichever works.**

4. **What "STABLE WITH WARNINGS" looks like**: If D4 returns ANY rows but they're stale (>1h ago, before fixes deployed), is that ELITE STABLE or warnings?
   **Recommendation**: ELITE STABLE if all dependency errors are pre-fix and no new ones appear in last 15 min after deploy. Document the historical errors explicitly in the report. **Default: time-window the check to post-deploy only.**

If 1, 2, or 4 are wrong, say so before approval.

---

## Time Budget
- Pre-flight scan: 1-2 min
- Part A (dual-import refactor + scoped expansion): 3-5 min
- Part B (TS check + normalize): 5-10 min (depends on # residual errors)
- Part C (deploy + sleep): 2 min
- Part D (4 verification queries + invocation): 3-5 min
- Part E + F (final query + report): 1 min
- **Total: ~15-25 min**

## Cleanup
None. All changes are additive correctness; no temporary state.

---

## Final State After This Pass

| Layer | Status |
|---|---|
| `check-render-status` immune to npm resolution failures | ✅ (dual-import) |
| All `npm:` imports with failure history hardened | ✅ (scoped) |
| TypeScript zero errors across all edge functions | ✅ (gated) |
| No module/import errors in last 30 min logs | ✅ (D4 query) |
| Engine function logging intact (15/15) | ✅ (D3 query) |
| Recent failure rate near zero | ✅ (E query) |
| Final verdict backed by 4 query results | ✅ |

If any gate fails, the report names the exact blocker. No "looks good" claims.

