

# Phase 7 — Experience Perfection + System Hardening + Infinite Scale Moat

Strictly additive. Eight parts. Sequenced so each leaves the system in a working state. No core engine logic touched.

---

## Pre-Flight Verification (read-only, during execution)

1. `code--view src/components/hammer/EliteModePanel.tsx` (already in context — confirmed structure)
2. `code--view src/pages/EngineHealthDashboard.tsx` to find the right insertion point for new section
3. `supabase--read_query`: `SELECT proname FROM pg_proc WHERE proname='cleanup_old_function_logs'` to avoid duplicate function
4. `code--list_dir supabase/functions` to enumerate every function that needs the logging wrapper
5. `code--view supabase/functions/extract-patterns/index.ts` (in context) to understand current pattern shape before extending

---

## Architectural Principle

Two new tables (`engine_function_logs`, plus 2 columns on `anonymized_pattern_library`). One new TypeScript contract file. One new edge function (`engine-auto-recovery`), one new SQL-only daily check (`engine-data-integrity-check`), one new hook, one new dashboard section. **Every existing edge function gets a thin observability wrapper** — try/catch + duration logging + 30s timeout. Wrapper is non-blocking: if logging insert fails, function still returns its real response.

The Elite UI upgrade is purely visual polish (typography, spacing, micro-animation) on `EliteModePanel` plus a global "errorless states" sweep — **no behavior change**.

---

## PART 1 — Elite UI/UX Perfection

### Modify `src/components/hammer/EliteModePanel.tsx`
Additive enhancements only:

1. **Gradient top border**: Replace solid `border-t-2 border-t-primary` with gradient via inline style:
   ```tsx
   style={{
     borderImage: `linear-gradient(90deg, ${stateColor}, transparent) 1`,
     borderTop: '2px solid'
   }}
   ```
   Color map: prime=`hsl(var(--primary))`, ready=emerald, caution=amber, recover=rose.

2. **Micro-animation**: Replace `animate-in fade-in duration-200` with custom keyframes for opacity 0→1 + translateY 4px→0 over 200ms (use `motion-safe:animate-[elite-fade-in_200ms_ease-out]` and add `@keyframes elite-fade-in` to `index.css`).

3. **Typography hierarchy**:
   - `elite_message`: `font-semibold tracking-tight text-[15px] leading-snug`
   - `micro_directive`: `text-xs text-foreground/70` (current is `text-muted-foreground`, this is higher contrast)
   - constraint chip: add `gap-1.5` (was `gap-1`), align icon vertically at center

4. **Confidence indicator** (new, top-right, only when `confidence >= 70`):
   ```tsx
   {layer.confidence >= 70 && (
     <span className="text-[10px] text-muted-foreground/80 tabular-nums">
       Confidence: {layer.confidence}%
     </span>
   )}
   ```
   Sits inline with `windowBadge` if both present (gap-1.5).

5. **Trajectory stagger**: Wrap trajectory line in 150ms delayed fade-in (`style={{ animationDelay: '150ms' }}` on the same fade-in keyframe).

### Add CSS keyframes to `src/index.css`
```css
@keyframes elite-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Performance:
- `useEliteLayer` and `usePrediction` already memoize state; verify no re-render leak by wrapping the panel body in `React.memo` if not already.
- All realtime channels in both hooks already clean up on unmount (verified in source).

### Errorless states sweep (audit, not rewrite):
- Confirm `EliteModePanel` returns null gracefully when `layer === null` (already does)
- Confirm `useSystemHealth` returns `{ score: null }` gracefully when no rows (verified earlier)
- No changes required to other panels for this phase — keeping scope tight.

---

## PART 2 — Engine Observability 2.0

### Migration (1 new table + 1 cleanup function)
```sql
CREATE TABLE public.engine_function_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','fail','timeout')),
  duration_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_function_logs_name_created ON engine_function_logs(function_name, created_at DESC);
CREATE INDEX idx_function_logs_status_created ON engine_function_logs(status, created_at DESC);
ALTER TABLE engine_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/owner read function logs" ON engine_function_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));
CREATE POLICY "Service role writes function logs" ON engine_function_logs
  FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION cleanup_old_function_logs() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  DELETE FROM engine_function_logs WHERE created_at < now() - interval '30 days';
$$;
```
Retention: 30 days. ~50k rows/day for 30 active functions × 4 runs/hr. Trivial.

### Logging wrapper — applied to all 18 edge functions
Create a tiny inline helper (no shared module, since we can't share across functions without copy-paste):
```ts
async function logRun(supabase: any, fn: string, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: fn,
      status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent — logging must never break the function */ }
}
```

Wrap each function's `serve()` body:
```ts
serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const timeout = new Promise<Response>((resolve) => 
    setTimeout(() => resolve(new Response(JSON.stringify({ error: 'timeout' }), { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })), 30000)
  );
  const work = (async () => {
    const supabase = createClient(...);
    try {
      // ...existing logic...
      await logRun(supabase, '<fn-name>', 'success', startMs, undefined, { /* useful metadata */ });
      return new Response(...);
    } catch (err) {
      await logRun(supabase, '<fn-name>', 'fail', startMs, String(err));
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  })();
  return Promise.race([work, timeout.then(async (r) => {
    const supabase = createClient(...);
    await logRun(supabase, '<fn-name>', 'timeout', startMs);
    return r;
  })]);
});
```

**Functions to wrap** (18 total — only existing engine + governance functions, NOT Stripe/auth/render functions):
1. `compute-hammer-state`
2. `engine-heartbeat`
3. `engine-sentinel`
4. `engine-adversarial`
5. `engine-weight-optimizer`
6. `evaluate-advice-effectiveness`
7. `extract-patterns`
8. `update-user-engine-profile`
9. `predict-hammer-state`
10. `generate-interventions`
11. `engine-regression-runner`
12. `evaluate-predictions`
13. `compute-system-health`
14. `engine-reset-safe-mode`
15. `engine-chaos-test`
16. (NEW) `engine-auto-recovery`
17. (NEW) `engine-data-integrity-check`
18. `compute-hammer-state` cron variants (none — same function)

**Critical**: For `compute-hammer-state`, the `await logRun(...)` at the end runs AFTER the response payload is built. To guarantee zero added latency on the user-facing path, use fire-and-forget `EdgeRuntime.waitUntil(logRun(...))` instead of `await`. Same pattern for snapshot_versions insert added in Phase 6.

### New hook: `src/hooks/useFunctionHealth.ts`
- Fetches per-function aggregates from last 24h
- Returns array: `[{ function_name, total_runs, success_rate, avg_duration_ms, last_error_at, last_error_message }]`
- One read on mount + realtime subscription on `engine_function_logs` INSERTs

### Modify `src/pages/EngineHealthDashboard.tsx`
Add new section "Function Reliability" (collapsible card):
- Table: function name | success % | avg duration | last error timestamp
- Row highlight: red if `success_rate < 95`, amber if `< 99`, default otherwise
- Empty state: "No function activity yet" if zero rows
- Sortable by success rate (worst first)

---

## PART 3 — Auto-Recovery Layer

### New edge function: `engine-auto-recovery`
Schedule: every 10 min at `:09`.
Auth: `verify_jwt = false`.

Logic:
1. Read latest `engine_system_health.score`
2. **If score < 70**: fire-and-forget invoke `engine-weight-optimizer`, then wait 5s, then `compute-system-health`, then `evaluate-predictions`. Log `audit_log` with `action='auto_recovery_triggered'` + score that triggered it.
3. **Function instability check**: Query `engine_function_logs` last 1h, group by `function_name`. For any function with `(fails / total) > 0.20` AND `total >= 5` → log `audit_log` with `action='function_instability_detected'` + the offending function name + failure rate.
4. **Stuck-state check**: Query `MAX(created_at)` on `hammer_state_snapshots`. If `> 30 min ago` AND there's at least one user with activity in last 24h (`SELECT DISTINCT user_id FROM custom_activity_logs WHERE created_at > now() - interval '24h' LIMIT 10`), invoke `compute-hammer-state` for those users (POST per user). Log `action='stuck_state_recovery'` + user count.
5. **Never** modify engine tables directly. All recovery is via existing function invocations.

### Cron schedule (insert tool):
```sql
SELECT cron.schedule('engine-auto-recovery-10min', '9 */10 * * * *', $$
  SELECT net.http_post(
    url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/engine-auto-recovery',
    headers := '{"Content-Type":"application/json","apikey":"<ANON>"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
$$);
```
*(Schedule typo correction: cron uses 5-field, so `9-59/10 * * * *` = at :09, :19, :29, :39, :49, :59. Acceptable; spec says "every 10 min at :09".)*

Actually — to be precise, true "every 10 min starting at :09" requires `9,19,29,39,49,59 * * * *`. Will use that exact form.

---

## PART 4 — Real-Time System Stability Guard

This is implemented inline as part of PART 2's wrapper — every wrapped function gets:
- Try/catch around all logic
- 30s timeout via `Promise.race`
- Safe fallback response (`{ error, fallback: true }` with status 500 or 504)
- Logged to `engine_function_logs` with appropriate status

No separate work needed. Bundled with Part 2.

---

## PART 5 — Data Integrity Enforcement

### New edge function: `engine-data-integrity-check`
Schedule: daily at 06:15.
Auth: `verify_jwt = false`.

Logic (all SAFE actions only — repairs, no aggressive deletes on user data):
1. **Orphan check 1**: `predictions` without snapshots
   ```sql
   SELECT id FROM engine_state_predictions
   WHERE base_snapshot_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM hammer_state_snapshots WHERE id = base_snapshot_id)
   ```
   Action: NULL out `base_snapshot_id` (don't delete prediction — the prediction itself is still valid data, just orphaned reference).

2. **Orphan check 2**: `interventions` without predictions
   ```sql
   SELECT id FROM engine_interventions
   WHERE prediction_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM engine_state_predictions WHERE id = prediction_id)
   ```
   FK already cascades on delete — should never happen. If found, log only.

3. **Invalid state**: `SELECT id FROM hammer_state_snapshots WHERE overall_state IS NULL OR overall_state NOT IN ('prime','ready','caution','recover')`. Log count to audit_log. Do NOT delete (could be in-flight write).

4. **Missing joins**: `SELECT id FROM hammer_state_explanations_v2 WHERE NOT EXISTS (SELECT 1 FROM hammer_state_snapshots WHERE user_id = explanations.user_id)`. Log.

5. Single audit_log entry per run with full summary: `{ orphan_predictions_repaired, orphan_interventions_found, null_states_count, orphan_explanations_count, run_duration_ms }`.

### Cron schedule (insert tool):
```sql
SELECT cron.schedule('engine-data-integrity-check-daily', '15 6 * * *', $$ ... $$);
```

---

## PART 6 — Scalability Moat

### Migration: extend `anonymized_pattern_library`
```sql
ALTER TABLE public.anonymized_pattern_library
  ADD COLUMN IF NOT EXISTS performance_outcome_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence numeric DEFAULT 0;
```

### Modify `extract-patterns/index.ts`
After bucketing, for each bucket compute:
- `performance_outcome_score`: For each pattern, look at the next snapshot in time order for matching anonymized feature signature. Score = `+10` if next state is "better" (recover→caution=+5, caution→ready=+10, ready→prime=+10, same=0), `-10` if worse. Aggregate per bucket as average.
- `confidence`: `min(95, sqrt(frequency) * 10)` — more occurrences = higher confidence in the outcome score.

Update INSERT/UPDATE in `extract-patterns` to include both new columns. Existing rows get default 0/0 until next run rewrites them.

### Internal ranking
Add a new admin-only view (no UI yet, just the data model):
```sql
CREATE OR REPLACE VIEW public.pattern_library_ranked AS
SELECT *, (performance_outcome_score * confidence / 100.0) AS rank_score
FROM anonymized_pattern_library
WHERE confidence >= 30
ORDER BY rank_score DESC;
```
Future v2 model trains on this. Not exposed to users.

---

## PART 7 — Future-Proof Engine Interface

### New file: `src/lib/engine/EngineInputContractV2.ts`
```ts
/**
 * Engine Input Contract V2 — the canonical input shape for any future engine.
 * All future features that compute or read engine state MUST normalize their
 * inputs to this shape. Direct DB column coupling in feature code is forbidden.
 */
export interface EngineInputV2 {
  load_24h: number;        // 0..100, normalized cumulative load over last 24h
  recovery_score: number;  // 0..100, current recovery score
  freshness_6h: number;    // 0..100, dopamine/freshness index from last 6h activity
  volatility: number;      // 0..1, normalized state-transition rate over last 3d
}

export interface EngineOutputV2 {
  overall_state: 'prime' | 'ready' | 'caution' | 'recover';
  confidence: number;      // 0..100
  computed_at: string;     // ISO timestamp
}

/** Adapter: convert a hammer_state_snapshots row into EngineInputV2 */
export function snapshotToEngineInput(snap: {
  cognitive_load?: number | null;
  recovery_score?: number | null;
  dopamine_load?: number | null;
}): EngineInputV2 {
  return {
    load_24h: Number(snap.cognitive_load ?? 0),
    recovery_score: Number(snap.recovery_score ?? 50),
    freshness_6h: 100 - Number(snap.dopamine_load ?? 0),
    volatility: 0, // computed externally — caller fills in
  };
}

export const ENGINE_CONTRACT_VERSION = 'v2.0.0';
```

This is a **declarative contract** — no runtime impact. Documents the intent. Future engine v2 code reads/writes through these types only.

Add a memory entry: `mem://architecture/engine/input-contract-v2`.

---

## PART 8 — Final UX Polish Pass

This is a focused, surgical sweep — NOT a rewrite. Specific actions:

1. **`EliteModePanel`**: confirmed in Part 1 (gradient border, animation, typography, confidence indicator)
2. **`SystemIntegrityBadge`**: confirm modal opens cleanly on mobile (440px viewport — already current viewport)
3. **`OwnerEngineSettingsPanel` Recovery tab**: confirm dialogs scroll on small viewports
4. **`EngineHealthDashboard`**: ensure new "Function Reliability" section uses same `Card` + spacing as siblings
5. **Console errors sweep**: run `code--read_console_logs` after deploy; fix any reds
6. **Layout shift**: confirm Elite panel doesn't reflow when prediction loads (skeleton placeholder for trajectory line during initial 150ms)

No ambitious redesigns. No new components. Polish only.

---

## CRON SCHEDULE (Final, all phases)
```
:00,:15,:30,:45    Heartbeat (15min)            — Phase 3
:07                Sentinel (hourly)             — Phase 3
:09,:19,:29,:39,:49,:59  Auto-Recovery (10min)   — Phase 7 (NEW)
:11  every 12h     Regression Runner             — Phase 6
:17  every 2h      Predict Hammer State          — Phase 5
:23  every 6h      Adversarial                   — Phase 3
:31  every 4h      Advisory Eval                 — Phase 4
:37  every 4h      Evaluate Predictions          — Phase 6
:43  every 6h      Weight Optimizer              — Phase 4
:52  every 15min   Compute System Health         — Phase 6
04:53 daily        Pattern extraction            — Phase 4
05:13 Sunday       User profile update           — Phase 4
06:15 daily        Data Integrity Check (NEW)    — Phase 7
05:31, 05:38, 05:45, 05:55, 06:02, 06:25 daily   Cleanup jobs (existing + 1 new for function_logs)
```
No collisions. The :09/:19/:29/:39/:49/:59 auto-recovery slots don't overlap any existing cron.

---

## Files Created / Modified

**New migration** (1):
- `engine_function_logs` table + RLS + indexes
- `cleanup_old_function_logs()` SQL function
- ALTER `anonymized_pattern_library` ADD `performance_outcome_score`, `confidence`
- `pattern_library_ranked` VIEW

**New edge functions** (2):
- `supabase/functions/engine-auto-recovery/index.ts`
- `supabase/functions/engine-data-integrity-check/index.ts`

**New files** (3):
- `src/hooks/useFunctionHealth.ts`
- `src/components/owner/FunctionReliabilityPanel.tsx` (collapsible card for the dashboard)
- `src/lib/engine/EngineInputContractV2.ts`

**Modified edge functions** (16 — observability wrapper):
- `compute-hammer-state` (uses `EdgeRuntime.waitUntil` to keep zero latency)
- `engine-heartbeat`, `engine-sentinel`, `engine-adversarial`, `engine-weight-optimizer`
- `evaluate-advice-effectiveness`, `extract-patterns`, `update-user-engine-profile`
- `predict-hammer-state`, `generate-interventions`
- `engine-regression-runner`, `evaluate-predictions`, `compute-system-health`
- `engine-reset-safe-mode`, `engine-chaos-test`
- `extract-patterns` (also gets the moat upgrade in Part 6)

**Modified UI** (3):
- `src/components/hammer/EliteModePanel.tsx` — gradient border, animation, typography, confidence indicator, trajectory stagger
- `src/index.css` — add `@keyframes elite-fade-in`
- `src/pages/EngineHealthDashboard.tsx` — add Function Reliability section (uses new component)

**Config** (1):
- `supabase/config.toml` — add 2 entries: `engine-auto-recovery` (verify_jwt=false), `engine-data-integrity-check` (verify_jwt=false)

**Cron** (insert tool):
- `engine-auto-recovery-10min`
- `engine-data-integrity-check-daily`
- `cleanup-function-logs-daily` (06:25)

**Memory** (1):
- `mem://architecture/engine/input-contract-v2`

---

## Validation

1. **Logging**: invoke `compute-hammer-state` → confirm new row in `engine_function_logs` with `status='success'`, `duration_ms < 2000`
2. **Wrapper safety**: invoke a function with bad input → confirm `status='fail'` row written, function still returns 500 cleanly
3. **Hook**: visit `/engine-health` → confirm "Function Reliability" section renders 16+ functions
4. **UI polish**: visit `/index` → confirm Elite panel has gradient border, fade-in animation, confidence indicator (if ≥70)
5. **Auto-recovery**: temporarily INSERT a fake `engine_system_health` row with score 50 → invoke `engine-auto-recovery` → confirm `audit_log` entry `auto_recovery_triggered` + downstream function logs in `engine_function_logs`
6. **Data integrity**: invoke `engine-data-integrity-check` → confirm `audit_log` entry with summary
7. **Pattern moat**: invoke `extract-patterns` → confirm new rows have non-default `performance_outcome_score` and `confidence`
8. **Stability**: query `SELECT function_name, COUNT(*) FILTER (WHERE status='success') * 100.0 / COUNT(*) AS success_rate FROM engine_function_logs GROUP BY function_name`. All wrapped functions should be ≥95% success.
9. **Latency**: time `compute-hammer-state` p50 from logs — must be unchanged from pre-Phase-7 baseline (the `EdgeRuntime.waitUntil` ensures logging is post-response)
10. **System Health Score**: invoke `compute-system-health` → confirm score still ≥80

---

## Risk Assessment
- **Engine break risk**: zero — wrapper is try/catch + post-response logging. Existing logic untouched.
- **Latency risk**: zero on user-facing `compute-hammer-state` (waitUntil); ≤30ms on cron-triggered functions (single insert, fire-and-forget where possible)
- **Auto-recovery loop risk**: gated by score < 70 trigger. Cannot recursively trigger itself. All actions are idempotent (force a function run that's already scheduled).
- **Data integrity action risk**: only "safe" repair = NULL'ing orphaned FKs. No deletes. No updates to user content.
- **Pattern outcome scoring**: backfilled to 0/0 for existing rows; non-zero only after next `extract-patterns` run. Can't break consumers because no consumers read the new columns yet.
- **Wrapper deployment risk**: 16 functions get the same wrapper template. Mass deploy = 16 deploys. If one fails, others succeed independently. The wrapper itself is ~30 lines and self-contained.
- **Storage**: function_logs at 30d × ~50k/day = 1.5M rows. Indexed on `(function_name, created_at desc)`. Trivial.

---

## Open Decisions (best defaults; flag to override)

1. **Wrapper as inline template, not shared module** — Deno edge functions can't easily share local modules across folders without import_map. Inline copy keeps each function self-contained and deployable independently. Trade-off: small duplication. Worth it for resilience.

2. **`compute-hammer-state` uses `EdgeRuntime.waitUntil`** for the logging insert + snapshot_versions insert — guarantees zero added latency on the only user-facing edge function. Other functions use plain `await` since they're cron-only.

3. **Function Reliability shown to admin/owner only** — uses existing `isOwner` gate on `/engine-health`. Not exposed to athletes.

4. **`engine-auto-recovery` does NOT touch `engine-sentinel` or `engine-adversarial`** in its trigger list — those are diagnostic, not corrective. It only kicks the optimizer + health + predictions.

5. **Stuck-state recovery limited to 10 users** per run to prevent thundering-herd if everyone's snapshots are stale. Spec says "active users"; bounded to 10/run.

6. **Pattern outcome scoring is heuristic** (next-state delta) not ML. Spec explicitly says "Future training data for v2 model" — current build sets up the data shape; v2 will train on it.

7. **Engine Input Contract V2 is documentation/typing only** — no migration of existing code to use it. Future features will adopt; existing engine continues with its current snapshot-based flow.

8. **Elite UI animation respects `prefers-reduced-motion`** via `motion-safe:` Tailwind prefix. Accessibility default.

If any of those eight are wrong, say so before approval.

---

## Time Budget
- Build: ~30-40 minutes (1 migration, 2 new edge functions, 16 wrapper edits, 3 new files, 3 UI edits, 1 config edit, 3 cron schedules, 1 memory file)
- Validation: ~10 minutes (10-step test chain + 30-min stability watch)

## Cleanup
function_logs auto-rotates at 30d. Pattern extension columns persist indefinitely (intentional — moat data). Zero manual maintenance.

---

## Final State After Phase 7

| Layer | Question Answered | Phase |
|---|---|---|
| Heartbeat | Is it alive? | 3 |
| Sentinel | Is it right? | 3 |
| Adversarial | Can it be tricked? | 3 |
| Optimizer | Can it learn? | 4 |
| Predictor | Can it see ahead? | 5 |
| Interventions | Can it act early? | 5 |
| Snapshot Versioning | Can we replay any moment? | 6 |
| Regression Runner | Did learning improve or degrade? | 6 |
| Drift Guard | Can learning go runaway? | 6 |
| Prediction Outcomes | Were forecasts correct? | 6 |
| System Health | One number, full truth | 6 |
| Safe Mode | Can we instantly recover? | 6 |
| Chaos Test | Is it stable under attack? | 6 |
| **Function Logs** | **Did anything fail silently?** | **7** |
| **Auto-Recovery** | **Can it heal without humans?** | **7** |
| **Data Integrity** | **Is the data shape clean?** | **7** |
| **Pattern Moat** | **Does it get smarter with scale?** | **7** |
| **Engine Contract V2** | **Can future features plug in safely?** | **7** |
| **Elite UI** | **Does it feel generational?** | **7** |

Every layer reads from the previous, writes only to its own table. Engine remains the only mutator of `hammer_state_snapshots`. Auto-recovery only triggers existing systems; it cannot mutate the engine directly. UI degrades gracefully at every component. **Nothing can fail silently. Nothing can spiral. Everything is reproducible. Experience is elite.**

