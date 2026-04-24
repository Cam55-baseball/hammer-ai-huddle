

# Phase 7 — True Final Closeout Plan (TypeScript-First)

The system cannot be declared stable until **TypeScript compiles cleanly across ALL edge functions**. Build is currently broken in 4+ files with errors that block deployment of ANY function in the same workspace check pass. Fix order: types → deploy → wake → validate → report.

---

## Pre-Flight Verification (read-only)

Already gathered from prior context + the build error log:
- **Known broken files** (from build log): `check-render-status` (npm dep resolution), plus any remaining files I missed in the prior pass.
- **Baseline health**: 89 (last known)
- **Pattern moat**: 1 row at confidence=95 after extract-patterns redeploy (last known)

I will re-verify with `code--exec deno check` style scoping by reading each error-flagged file before any edit.

---

## PART A — Build Stabilization (BLOCKING — no deploy until clean)

### A1. `check-render-status/index.ts` — npm dependency resolution

**Error**: `Could not find a matching package for 'npm:@remotion/lambda-client@4.0.445'`

**Root cause**: Deno edge runtime can't resolve the npm package without `nodeModulesDir: "auto"` in `deno.json`, OR the function needs to use a different import strategy.

**Fix options** (decide based on `deno.json` inspection):
- **Option 1**: Add `"nodeModulesDir": "auto"` to root `deno.json` if it exists
- **Option 2** (preferred — least invasive): Add a function-local `supabase/functions/check-render-status/deno.json` with `{ "nodeModulesDir": "auto" }` so this only affects that one function
- **Option 3** (if both fail): Replace `npm:@remotion/lambda-client@4.0.445` with `https://esm.sh/@remotion/lambda-client@4.0.445` per the edge-function-deploy-errors guidance preferring stable specifiers

**Recommendation**: Option 2 first, fallback to Option 3 if deploy still fails. This is purely a build config fix; the function source logic stays untouched.

### A2. Re-scan all edge functions for residual TypeScript errors

The prior pass fixed the explicit errors in the build log, but the user's framing suggests more may exist. Action:

1. `code--exec` to find all remaining `.catch(` chained on Postgrest builders project-wide:
   ```
   rg -n "from\([^)]+\)\.[a-z]+\([^)]*\)[\s\S]{0,200}\.catch\(" supabase/functions
   rg -n "rpc\([^)]+\)[\s\S]{0,200}\.catch\(" supabase/functions
   rg -n "\.then\([^)]+\)\.catch\(" supabase/functions
   ```
2. `rg -n "getClaims" supabase/functions` — find any remaining `auth.getClaims()` calls
3. `rg -n "error\.message" supabase/functions/*/index.ts` where `error` is in a typed `unknown` catch block
4. For each hit: apply the same try/catch refactor pattern already used in `calculate-session/index.ts`

### A3. Strict-typing relaxation (only where blocking)

For any remaining `SupabaseClient<...>` type-mismatch errors in cross-file function signatures: alias param type to `any` (matches the pattern already applied in `engine-adversarial`). No behavior change.

### A4. Verification gate

After all edits:
- `code--exec cd /dev-server && npx -y supabase functions check 2>&1 | head -200` (or equivalent local TS check)
- If any function still errors → fix and re-run. **No deploy until zero errors.**

---

## PART B — Mass Redeploy

Once TypeScript is clean:
- `supabase--deploy_edge_functions` with the full list of touched functions:
  - `check-render-status` (build fix)
  - `extract-patterns` (re-confirm clean deploy)
  - Any additional files modified in Part A
- `project_debug--sleep 5` for propagation

---

## PART C — Wake & Validation

### C1. Wake all wrapped engine functions
Sequential POSTs (already invoked in prior pass; re-invoke to refresh the 30-min window):
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
14. `compute-hammer-state`

`project_debug--sleep 5`

### C2. Validation queries (mandated 8-step chain from spec)

1. **Observability coverage** — `SELECT function_name, total, success, success_rate FROM engine_function_logs (last 30 min) GROUP BY function_name`. Pass: all wrapped functions present, success_rate ≥ 95%.
2. **Latency** — `compute-hammer-state` avg_ms < 1500, max_ms < 3000.
3. **Pattern moat** — `anonymized_pattern_library` has at least one row with `confidence > 0`.
4. **Data integrity** — `audit_log` row with action `data_integrity_check` and populated metadata.
5. **Auto-recovery** — `engine-auto-recovery` log row with `status='success'` + metadata. Document passive behavior (no fake low score).
6. **System health** — score ≥ 80.
7. **Console errors** — zero red errors.
8. **UI integrity** (static via `code--view`) — `EliteModePanel` gradient + animation + confidence; `EngineHealthDashboard` mounts `SystemIntegrityBadge` + `FunctionReliabilityPanel`; `OwnerEngineSettingsPanel` has Recovery tab.

### C3. Final guarantee query
`SELECT COUNT(*) FILTER (WHERE status='fail') FROM engine_function_logs WHERE created_at > now() - interval '15 minutes'` → near zero or explainable.

---

## PART D — Final Report (mandated format)

Return EXACTLY the structured report from the spec. Every field backed by a query result or function call output. Final verdict: ELITE STABLE / STABLE WITH WARNINGS / NOT STABLE.

---

## Files Likely Modified

**Build fix** (1-2):
- `supabase/functions/check-render-status/deno.json` (NEW — `{ "nodeModulesDir": "auto" }`) **OR**
- `supabase/functions/check-render-status/index.ts` (swap `npm:` → `https://esm.sh/` import)

**Residual TS fixes** (TBD after rg scan — likely 0-5 files):
- Any file still chaining `.catch()` on Postgrest builders
- Any file still using `auth.getClaims()`
- Any file with untyped `unknown` errors in catch blocks

**Zero source changes** to engine logic, UI, or schema. Pure build correctness pass.

---

## Risk Assessment

- **`check-render-status` fix risk**: Low. Function-local `deno.json` is the standard Supabase pattern for npm packages. If it doesn't work, esm.sh fallback is well-documented in the deploy-errors guidance.
- **Mass redeploy risk**: Low. Each function deploys independently; failure of one doesn't block others.
- **Re-invocation risk**: Zero. All target functions are idempotent and cron-scheduled — manual POSTs are equivalent to cron ticks.
- **TS scan miss risk**: The `rg` patterns cover all known footguns from the prior error log. If new patterns surface, they get fixed in the same loop.

---

## Open Decisions (best defaults; flag to override)

1. **`check-render-status` fix strategy**: Try function-local `deno.json` with `nodeModulesDir: "auto"` first. If deploy still 500s, fall back to `https://esm.sh/@remotion/lambda-client@4.0.445`. **Recommendation: try Option 2 first; document if Option 3 needed.**

2. **Auto-recovery validation**: Will NOT insert fake low score (no insert tool, and spec explicitly says "Do NOT fake low score"). Will document passive success behavior. **Recommendation: accept as documented.**

3. **TS scan depth**: Will scan ALL edge functions, not just engine ones (per spec "across edge functions, not just engine functions"). Any file with the patterns gets fixed.

4. **UI verification = static only**: Per spec ("static / no redesign"). Will use `code--view`, not browser. **Recommendation: confirmed.**

5. **Deno typecheck**: I'll attempt `deno check supabase/functions/**/*.ts` via `code--exec` if Deno is available; otherwise rely on the deploy step's type-check failure as the gate. **Recommendation: try local check first, fall back to deploy-time check.**

If 1 or 5 are wrong, say so before approval.

---

## Time Budget
- Part A (TS scan + fixes): 5-10 min
- Part B (deploy + sleep): 1-2 min
- Part C (wake + validate): 6-8 min
- Part D (report): 2 min
- **Total: ~15-22 min**

## Cleanup
None. All fixes are additive build correctness; no temporary state to roll back.

---

## Final State After This Pass

| Layer | Status |
|---|---|
| TypeScript compiles across all 80+ edge functions | ✅ (gated) |
| `check-render-status` builds and deploys | ✅ (gated) |
| All 15 wrapped engine functions logging in last 30 min | ✅ (gated) |
| `compute-hammer-state` latency < 1500ms avg | ✅ (gated) |
| Pattern moat populated | ✅ (gated) |
| System health ≥ 80 | ✅ (gated) |
| Final report with verified data points | ✅ |

Each gate must pass with a query result or it gets reported as a blocker. No "looks good" claims.

