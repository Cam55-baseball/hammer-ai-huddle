

# Phase 4 — Self-Healing + Elite Layer + Moat Architecture

This is a large, four-part build. To respect the "additive only / no breaking changes" rule, I'm sequencing it as **5 deployable subphases** that each leave the system in a working state. You can approve all-at-once or step-by-step.

---

## Architectural Principle (applies to every part)

`compute-hammer-state` gets exactly **one** new behavior: at the very end of `computeForUser`, before INSERT, it consults two optional read-only sources (`engine_dynamic_weights`, `user_engine_profile`) and applies a bounded modifier to the blended scores. **If either table is empty or the read fails → fall through to current static logic, identical output.** Zero-risk additive hook.

All other new systems (optimizer, elite layer, pattern extraction, advisory) are **separate edge functions on separate cron schedules** that only read engine outputs and write to their own tables. The engine never depends on them being present.

---

## PART 1 — Self-Healing Weight Adjustment Layer

### Schema (1 migration)
```
engine_weight_adjustments
  id uuid pk default gen_random_uuid()
  created_at timestamptz default now()
  source text not null         -- 'sentinel' | 'adversarial'
  scenario text                -- nullable (sentinel has none)
  drift_score int              -- 0..100
  affected_axis text not null  -- 'arousal' | 'recovery' | 'motor' | 'cognitive' | 'dopamine'
  suggested_delta numeric not null  -- bounded ±0.05 per run
  applied boolean default false
  metadata jsonb default '{}'

engine_dynamic_weights
  axis text primary key        -- one row per axis (5 axes total)
  weight numeric not null      -- multiplier, clamped 0.5..1.5
  updated_at timestamptz default now()
  last_run_id uuid             -- correlates to optimizer run
  metadata jsonb default '{}'
```
RLS: read = owner/admin; write = service role only. Indexes on `(created_at desc)` and `(applied, created_at desc)`.

### Edge function: `engine-weight-optimizer` (new)
Schedule: every 6h at `:43` (after adversarial runs at `:23`).

Logic (additive only, never edits engine code):
1. Read last 24h of `engine_sentinel_logs WHERE drift_flag=true` and `engine_adversarial_logs WHERE pass=false`
2. Aggregate by `(scenario, expected→actual transition)` → identify systematic bias
3. Map failures to axis adjustments using a static rule table:
   ```
   overload_spike (engine said prime/ready)        → dopamine -= 0.02
   fake_recovery (engine said prime)               → recovery -= 0.02
   stale_dominance (engine still recover)          → recovery += 0.02
   low_load_high_readiness (engine said caution)   → arousal += 0.02
   noise_chaos (engine said extreme)               → cognitive += 0.01
   sentinel drift on recovery axis                 → recovery ±0.01 toward truth model
   ```
4. **Bounds**: max ±0.05 per axis per run, weight clamped to `0.5..1.5` cumulatively
5. Insert one row per adjustment to `engine_weight_adjustments` with `applied=true`
6. UPSERT to `engine_dynamic_weights`
7. Log summary to `audit_log`

### compute-hammer-state surgical hook (the only engine edit)
Add ~12 lines just before the INSERT:
```ts
const { data: weights } = await supabase
  .from('engine_dynamic_weights')
  .select('axis,weight');
const w = Object.fromEntries((weights ?? []).map(r => [r.axis, Number(r.weight)]));
const blended = (
  arousalScore * 0.3 * (w.arousal ?? 1) +
  recoveryScore * 0.4 * (w.recovery ?? 1) +
  (100 - cognitiveLoad) * 0.2 * (w.cognitive ?? 1) +
  (100 - dopamineLoad) * 0.1 * (w.dopamine ?? 1)
);
```
If `engine_dynamic_weights` is empty → all `?? 1` defaults → byte-identical to current behavior. **Zero breaking change.**

---

## PART 2 — Elite Athlete Experience Layer

### Schema
```
hammer_state_explanations_v2
  id uuid pk
  user_id uuid not null
  snapshot_id uuid references hammer_state_snapshots(id) on delete cascade
  state text not null
  elite_message text not null
  micro_directive text not null
  constraint_text text not null   -- "constraint" is reserved-ish; rename column
  confidence int                  -- 0..100, mirrors snapshot confidence × 100
  created_at timestamptz default now()
```
RLS: user reads own rows; service role writes.

### Edge function: `generate-elite-layer` (new)
Triggered immediately at the end of `compute-hammer-state` via fire-and-forget `fetch()` — non-blocking, so engine latency stays untouched. If the call fails, snapshot is still written; explanation just won't exist for that snapshot.

Maps state → message using the exact copy block in your spec (prime/ready/caution/recover). Confidence pulled from snapshot. One row per snapshot.

### Hook: `useEliteLayer.ts`
Reads latest explanation joined to latest snapshot. Subscribes to `hammer_state_explanations_v2` realtime channel for the user.

### UI: `EliteModePanel` component
- Renders **above** `HammerStateBadge` on `/index` (Today route) — minimal: state-tinted thin top border, 1-line elite_message in semibold, 1-line micro_directive in muted, 1-line constraint as a small chip with `AlertCircle` icon.
- Renders nothing if no explanation yet (graceful degrade).
- No gamification, no animation beyond a subtle 200ms fade-in.

---

## PART 3 — Competitive Moat (Pattern Library + Personalization)

### Schema
```
anonymized_pattern_library
  id uuid pk
  pattern_type text not null    -- 'overload' | 'recovery' | 'inconsistency' | 'ramp' | 'plateau'
  feature_vector jsonb not null -- {load_24h, load_3d, recovery_24h, freshness_6h, rpe_avg}
  outcome_state text not null   -- the snapshot state that followed
  frequency int default 1
  last_seen_at timestamptz default now()
  created_at timestamptz default now()
  -- NO user_id stored; truly anonymous

user_engine_profile
  user_id uuid pk
  sensitivity_to_load numeric default 1.0   -- 0.5..1.5
  recovery_speed numeric default 1.0        -- 0.5..1.5
  volatility_index numeric default 0.0      -- 0..1
  sample_size int default 0
  updated_at timestamptz default now()
```
RLS: pattern library readable only by service role + admin (anonymous, no PII risk but still locked); user_engine_profile read by owning user only.

### Edge function: `extract-patterns` (new)
Schedule: daily at `04:53 UTC`.
- Scans last 7d of `hammer_state_snapshots`
- Bucketizes feature vectors into discrete bins (load: low/med/high; recovery: low/med/high; freshness: low/med/high)
- Counts state outcomes per bucket
- UPSERTs into `anonymized_pattern_library` with `frequency = frequency + count`
- Old patterns (>180d unseen) get pruned in the same run

### Edge function: `update-user-engine-profile` (new)
Schedule: weekly Sunday `05:13 UTC`.
- For each user with ≥10 snapshots in past 30d:
  - `sensitivity_to_load` = correlation of (load_24h, drop in overall blended score)
  - `recovery_speed` = avg hours from `recover` state → `ready` state
  - `volatility_index` = stddev of state transitions / 30d
- UPSERT to `user_engine_profile`
- Bounded to safe ranges, sample_size tracked for confidence

### compute-hammer-state second hook (still additive)
After the dynamic_weights hook:
```ts
const { data: prof } = await supabase
  .from('user_engine_profile').select('*').eq('user_id', userId).maybeSingle();
if (prof && prof.sample_size >= 10) {
  // bounded ±10% modifier
  const sensMod = clamp((prof.sensitivity_to_load - 1) * 0.1, -0.1, 0.1);
  recoveryScore = clamp(recoveryScore * (1 + sensMod * -1));
  // similar for other axes — bounded
}
```
Same zero-risk fallback: missing row → no-op.

Pattern influence: skipped in v1 — too easy to amplify bad signal. Patterns are **observed only** in v1, used in admin dashboard. Pattern influence on engine deferred to v2 once we see real cluster quality. (Flag if you want it in v1 anyway.)

---

## PART 4 — Adaptive Advisory Loop

### Schema
```
advisory_feedback_logs
  id uuid pk
  user_id uuid not null
  snapshot_id uuid references hammer_state_snapshots(id) on delete cascade
  explanation_id uuid references hammer_state_explanations_v2(id)
  advice_state text not null            -- the state that was advised
  advice_directive text                 -- copy of micro_directive
  user_action_inferred text             -- 'complied' | 'partial' | 'ignored' | 'opposed'
  effectiveness_score int               -- -100..+100
  evaluation_window_hours int default 24
  created_at timestamptz default now()
  evaluated_at timestamptz
```

### Edge function: `evaluate-advice-effectiveness` (new)
Schedule: every 4h at `:31`.
- Pulls explanations from 24-30h ago that haven't been evaluated
- For each: looks at user's `custom_activity_logs` in the 24h after the advice
  - If state was `recover` and user logged ≤1 low-RPE activity → complied (+score)
  - If state was `prime` and user logged ≥2 high-RPE activities → complied (+score)
  - Inverse cases → opposed (negative score)
- Writes effectiveness_score, feeds aggregate signal back to optimizer:
  - Persistent low effectiveness on a state → flag axis adjustment in `engine_weight_adjustments` (same table reused)
  - Persistent high effectiveness → reinforce via small weight increment

---

## PART 5 — System Guarantees (preserved + extended)

The five layers now run on staggered cron offsets to prevent contention:
```
:00,:15,:30,:45  Heartbeat (15min)        — liveness
:07              Sentinel (hourly)        — truth alignment
:23  every 6h    Adversarial (6h)         — resistance
:31  every 4h    Advisory eval (4h)       — closed-loop feedback
:43  every 6h    Weight Optimizer (6h)    — learning [runs AFTER adversarial]
04:53 daily      Pattern extraction       — moat building
05:13 Sunday     User profile update      — personalization
```
No collisions. Each layer reads from previous layer's output, writes to its own table. **Engine remains the only mutator of `hammer_state_snapshots`.**

---

## Files Created / Modified

**New migrations** (4 tables + RLS + indexes + retention functions):
1. `engine_weight_adjustments` + `engine_dynamic_weights`
2. `hammer_state_explanations_v2`
3. `anonymized_pattern_library` + `user_engine_profile`
4. `advisory_feedback_logs`

**New edge functions** (5):
1. `supabase/functions/engine-weight-optimizer/index.ts`
2. `supabase/functions/generate-elite-layer/index.ts`
3. `supabase/functions/extract-patterns/index.ts`
4. `supabase/functions/update-user-engine-profile/index.ts`
5. `supabase/functions/evaluate-advice-effectiveness/index.ts`

**New hooks + UI**:
6. `src/hooks/useEliteLayer.ts`
7. `src/components/hammer/EliteModePanel.tsx`
8. `src/hooks/useEngineLearningHealth.ts` (admin metrics for optimizer)
9. `src/pages/EngineHealthDashboard.tsx` — append "Self-Healing Optimizer" card showing adjustments today, axes modified, weight history sparkline

**Modified**:
10. `src/components/today/TodayCommandBar.tsx` — render `<EliteModePanel />` above `<HammerStateBadge />`
11. `supabase/functions/compute-hammer-state/index.ts` — **two surgical additive hooks** (dynamic weights + user profile modifier) + fire-and-forget call to `generate-elite-layer`
12. `supabase/config.toml` — add 5 `verify_jwt = false` entries

**Cron schedules** (insert tool, not migration):
- `engine-weight-optimizer-6h`
- `extract-patterns-daily`
- `update-user-engine-profile-weekly`
- `evaluate-advice-effectiveness-4h`
- 4 cleanup-daily jobs (60–180d retention per table)

---

## Validation

1. **Bypass proof**: temporarily empty `engine_dynamic_weights` → run `compute-hammer-state` → assert byte-identical snapshot to pre-deploy baseline (regression test on User A)
2. **Self-healing proof**: invoke `engine-adversarial` → confirm fail rows → invoke `engine-weight-optimizer` → confirm `engine_weight_adjustments` row created + `engine_dynamic_weights.dopamine` decremented → re-invoke adversarial → confirm same scenario now passes (or drift_score reduced)
3. **Elite layer proof**: trigger `compute-hammer-state` → within 5s confirm `hammer_state_explanations_v2` row → confirm `<EliteModePanel />` renders above badge with correct copy
4. **No latency added**: time `compute-hammer-state` p50 before vs after — must be within +20ms (the elite-layer call is fire-and-forget)
5. **Pattern extraction**: invoke once → confirm ≥5 pattern rows for User A's 7d history
6. **Advisory loop**: backdate an explanation 25h → invoke evaluator → confirm `advisory_feedback_logs` row with non-null effectiveness_score
7. **Admin UI**: all 4 layers (Heartbeat/Sentinel/Adversarial/Optimizer) render on `/engine-health` with live data

---

## Risk Assessment
- **Engine break risk**: zero — both new hooks have `?? 1` fallbacks; optional table reads
- **Latency risk**: optimizer/extract/profile run on cron, never in user request path. Elite-layer call is non-blocking
- **Storage**: ~2k advisory rows/day + ~50 weight adjustments/week + a few hundred pattern rows. Tiny.
- **Compounding error risk**: weight clamps (`0.5..1.5`) + per-run delta cap (`±0.05`) prevent runaway. If optimizer goes haywire, `DELETE FROM engine_dynamic_weights;` instantly restores baseline.
- **Privacy**: `anonymized_pattern_library` stores zero user_ids. Can be safely shared across cohort.

---

## Open Decisions (best defaults; flag to override)
1. **Pattern influence on engine = OFF in v1** (observe-only). Flip on after 2 weeks of cluster data review. Say "include pattern influence" if you want it active immediately.
2. **Effectiveness signal feeds optimizer = ON** (closes the loop). Could be observe-only.
3. **Elite Mode Panel placement** = above `HammerStateBadge` in `TodayCommandBar`. Could also be a dedicated full-width card on dashboard. Default chosen for "minimal, no clutter" per spec.
4. **Constraint column named `constraint_text`** (Postgres reserved word workaround). Spec said `constraint`; this is the safe rename.
5. **Static rule table in optimizer** vs. **ML-derived deltas**. v1 uses static rules (auditable, deterministic). v2 could derive deltas from drift magnitude. Default = static.

---

## Time Budget
- Build: ~25-35 minutes (4 migrations, 5 edge functions, 2 hooks, 1 UI component, 2 file modifications, 5 cron schedules)
- Validation: ~10 minutes (full chain test + latency benchmark + UI verification)

## Cleanup
All 4 new tables auto-rotate (60–180d windows). Zero manual maintenance.

---

## Sequencing Option
If you want to derisk, approve in 3 stages:
- **Stage A**: Part 1 (optimizer) + Part 5 (cron) — proves self-healing on existing infra
- **Stage B**: Part 2 (elite layer) — user-visible upgrade
- **Stage C**: Parts 3 + 4 (moat + advisory) — long-term compounding

Or approve all four parts together for a single ~35-min build. Default = **all-at-once** unless you say otherwise.

