

# Phase 5 — Predictive Engine + Behavioral Control Layer

Strictly additive. The predictive layer reads from existing snapshots and writes only to new tables. Engine, optimizer, sentinel, adversarial, and elite layer remain untouched.

---

## Architectural Principle

`predict-hammer-state` runs on a schedule, builds a forward trajectory from the last 72h of snapshots + activity logs, and writes one row per user per run. `generate-interventions` reads predictions and emits directives only when confidence ≥ 60 AND no duplicate in last 12h. UI surfaces a single muted trajectory line in `EliteModePanel`. All loops feed `evaluate-advice-effectiveness`, which gets one extra column to track intervention compliance.

---

## PART 1 — Predictive State Engine

### Schema (1 migration)
```sql
engine_state_predictions
  id uuid pk default gen_random_uuid()
  user_id uuid not null
  base_snapshot_id uuid references hammer_state_snapshots(id) on delete cascade
  predicted_state_24h text not null    -- 'prime'|'ready'|'caution'|'recover'
  predicted_state_48h text not null
  predicted_state_72h text not null
  confidence_24h int not null          -- 0..100
  confidence_48h int not null
  confidence_72h int not null
  risk_flags text[] default '{}'       -- ['overload_risk','underload','instability']
  input_vector jsonb default '{}'      -- snapshot of features used
  created_at timestamptz default now()
```
Indexes: `(user_id, created_at desc)`, `(created_at desc)`.
RLS: user reads own; service role writes; admin reads all.
Retention: 60 days via `cleanup_old_predictions()`.

### Edge function: `predict-hammer-state` (new)
Schedule: every 2h at `:17` (offset from heartbeat :00, sentinel :07, adversarial :23, advisory :31, optimizer :43).
Auth: `verify_jwt = false`.

Logic per user (only users with ≥3 snapshots in last 7d):
1. Pull last 10 `hammer_state_snapshots` (ordered desc)
2. Pull last 72h `custom_activity_logs` (filter out `notes LIKE 'heartbeat%'` and `notes LIKE 'adversarial:%'`)
3. Pull `user_engine_profile` if exists
4. Compute trajectory features:
   - `loadSlope24h` = linear regression slope of (count + duration_minutes) per 6h bucket over last 24h
   - `recoveryDelta` = latest.recovery_score − snapshots[3].recovery_score
   - `arousalDelta` = same for arousal
   - `volatility` = number of state transitions in last 3d / 30 (normalized 0..1)
   - `freshness6h` = whether last activity was >6h ago
5. Simulate forward (deterministic rule-based, not ML — auditable):
   ```
   24h:
     if loadSlope24h > +threshold AND recoveryDelta < -10  → 'recover'
     elif loadSlope24h > +threshold                         → 'caution'
     elif current=prime AND volatility<0.3                  → 'prime'
     elif current=recover AND loadSlope24h < threshold      → 'ready'
     else current
   48h: apply decay (volatility reduces forward confidence; trend dampened by 0.6)
   72h: further dampen by 0.4; default to user's modal state if confidence too low
   ```
6. Confidence formula:
   ```
   conf24h = clamp(60 + (sample_size × 4) − (volatility × 50), 30, 95)
   conf48h = conf24h × 0.75
   conf72h = conf24h × 0.5
   ```
   If `user_engine_profile.sample_size >= 10`, +10 confidence boost.
7. Risk flags:
   - `overload_risk` if loadSlope24h > +threshold AND recoveryDelta < -10
   - `underload` if loadSlope24h ≤ 0 AND no logs in 48h AND current=ready/prime
   - `instability` if volatility > 0.5
8. INSERT one row, link to base snapshot.

---

## PART 2 — Preemptive Intervention Engine

### Schema (same migration)
```sql
engine_interventions
  id uuid pk default gen_random_uuid()
  user_id uuid not null
  prediction_id uuid references engine_state_predictions(id) on delete cascade
  trigger_reason text not null           -- 'predicted_recover_24h' etc.
  intervention_type text not null        -- 'reduce_load'|'increase_intensity'|'recover'|'stabilize'
  directive text not null                -- short user-facing line
  priority int not null default 3        -- 1 (low) .. 5 (urgent)
  executed boolean default false
  created_at timestamptz default now()
```
Indexes: `(user_id, created_at desc)`, `(executed, created_at desc)`.
RLS: same pattern.
Retention: 90 days via `cleanup_old_interventions()`.

### Edge function: `generate-interventions` (new)
Triggered immediately at end of `predict-hammer-state` via fire-and-forget `fetch()` (non-blocking; if it fails, prediction still written).
Auth: `verify_jwt = false`.

Per-user logic:
1. Read latest prediction + latest snapshot
2. Skip if any prediction confidence < 60 across 24h horizon
3. Dedupe: skip if any intervention exists for user in last 12h with same `intervention_type`
4. Map (current_state, predicted_24h) → intervention:
   ```
   current=prime/ready, predicted=recover  → reduce_load,  priority 5
   current=ready,        predicted=caution  → reduce_load,  priority 3
   current=caution,      predicted=recover  → recover,      priority 4
   current=recover,      predicted=ready    → stabilize,    priority 2
   current=ready,        predicted=prime    → increase_intensity, priority 4 (rare window)
   instability flag (any state)             → stabilize,    priority 2
   ```
5. Directive copy (terse, elite, no fluff):
   - reduce_load: "Cut volume 30% next session — trajectory shows fatigue building."
   - recover: "Skip intensity. Restore inputs only — full recovery in 24-48h."
   - stabilize: "Hold steady. Same load, same timing — let signal settle."
   - increase_intensity: "Window opening. Stack one quality high-intensity rep block."
6. INSERT row.

---

## PART 3 — Elite UI Upgrade (subtle)

### Hook: `usePrediction.ts` (new)
- Reads latest `engine_state_predictions` for user
- Reads latest unexecuted `engine_interventions` for user
- Realtime subscription on both tables
- Returns: `{ prediction, intervention, hasMeaningfulSignal }` where `hasMeaningfulSignal = prediction.confidence_24h >= 60 AND prediction.predicted_state_24h !== currentState`

### Modify: `src/components/hammer/EliteModePanel.tsx`
Add ONE muted line below `micro_directive`, only when `hasMeaningfulSignal`:
```
Trajectory: trending toward {predicted_state_24h} in next 24h
```
Optional badge to right of state border (only when confidence ≥ 70):
- `Window Opening` (predicted=prime, current≠prime) — green tint
- `Window Closing` (predicted=recover, current≠recover) — amber tint
No icon. No animation. Same `text-xs text-muted-foreground` styling already in panel.

If active intervention exists with priority ≥ 4, replace `constraint_text` chip with intervention.directive (priority 4-5 overrides default constraint).

No notifications. No toasts. No badges anywhere except the panel.

---

## PART 4 — Behavioral Feedback Loop

### Schema change (in same migration)
```sql
ALTER TABLE advisory_feedback_logs
  ADD COLUMN intervention_id uuid REFERENCES engine_interventions(id) ON DELETE SET NULL;
```
Index: `(intervention_id) WHERE intervention_id IS NOT NULL`.

### Modify: `supabase/functions/evaluate-advice-effectiveness/index.ts`
After existing explanation evaluation, add second pass:
1. Pull interventions 24-30h old WHERE `executed=false` AND no row in `advisory_feedback_logs` references them
2. For each, look at user's logs in 24h window AFTER intervention created_at
3. Determine compliance:
   ```
   reduce_load:        complied if avg duration/session DROPPED ≥20% vs prior 24h
   recover:            complied if total log count DROPPED ≥50% vs prior 24h
   stabilize:          complied if RPE stddev DROPPED vs prior 24h
   increase_intensity: complied if max RPE INCREASED vs prior 24h
   ```
4. Compare prediction outcome:
   - If complied AND actual snapshot 24h later matches/improves on predicted state → score +80, mark intervention `executed=true`
   - If complied AND actual worsened despite advice → score +20 (we predicted right, advice was off)
   - If ignored AND actual worsened → score -50 (proves intervention value), bump optimizer signal: insert `engine_weight_adjustments` row with `metadata.source='intervention_validation'`
   - If ignored AND state stayed stable → score -10 (false alarm), reduce future intervention priority
5. INSERT `advisory_feedback_logs` row with `intervention_id` set + score

This closes the loop: the optimizer now learns from intervention success/failure too.

---

## PART 5 — System Positioning (cron summary)

Final staggered schedule (all offsets, no collisions):
```
:00,:15,:30,:45    Heartbeat (15min)
:07                Sentinel (hourly)
:17  every 2h      Predict Hammer State (NEW)
:23  every 6h      Adversarial
:31  every 4h      Advisory eval
:43  every 6h      Weight Optimizer
04:53 daily        Pattern extraction
05:13 Sunday       User profile update
04:37, 05:21, 05:42, 05:51 daily   Cleanup jobs (existing + 2 new)
```

---

## Files Created / Modified

**New migration** (1):
- `engine_state_predictions` + `engine_interventions` tables, RLS, indexes, 2 cleanup functions, ALTER `advisory_feedback_logs ADD COLUMN intervention_id`

**New edge functions** (2):
- `supabase/functions/predict-hammer-state/index.ts`
- `supabase/functions/generate-interventions/index.ts`

**New hook**:
- `src/hooks/usePrediction.ts`

**Modified** (3):
- `src/components/hammer/EliteModePanel.tsx` — append trajectory line + optional window badge + intervention override
- `supabase/functions/evaluate-advice-effectiveness/index.ts` — add intervention compliance pass
- `supabase/config.toml` — add 2 `verify_jwt = false` entries

**Cron schedules** (insert tool, not migration):
- `predict-hammer-state-2h`
- `cleanup-predictions-daily`
- `cleanup-interventions-daily`

---

## Validation

1. **Force high-load sequence**: backfill 12 high-RPE logs into `custom_activity_logs` for owner over last 18h
2. Invoke `compute-hammer-state` → confirm fresh snapshot
3. Invoke `predict-hammer-state` → confirm `engine_state_predictions` row with `predicted_state_24h IN ('caution','recover')`, `confidence_24h ≥ 60`, `risk_flags` contains `overload_risk`
4. Confirm `generate-interventions` auto-fired → `engine_interventions` row with `intervention_type='reduce_load'` or `'recover'`, priority ≥ 4
5. Visit `/index` → confirm `EliteModePanel` shows:
   - Trajectory line: "Trajectory: trending toward recover in next 24h"
   - "Window Closing" badge
   - Constraint chip replaced by intervention directive
6. Wait 24h (or backdate intervention 25h via insert tool for test) → invoke `evaluate-advice-effectiveness`
7. Confirm `advisory_feedback_logs` row with `intervention_id` set + non-null `effectiveness_score`
8. Confirm if compliance was poor + decline happened → `engine_weight_adjustments` row with `metadata.source='intervention_validation'`
9. **No latency added**: time `compute-hammer-state` p50 — must be unchanged (predictions run on cron, not in user path)
10. **No notifications fired**: confirm zero push/toast/email triggered (UI-only surface)

---

## Risk Assessment
- **Engine break risk**: zero — only reads from snapshots, writes to own tables
- **UI noise risk**: gated by `hasMeaningfulSignal` (confidence ≥ 60 AND state mismatch). If no signal, panel renders identically to today
- **Intervention spam risk**: 12h dedupe per type + confidence floor. Max ~2-4 interventions/user/day worst case
- **Storage**: ~12 predictions/user/day × 60d retention; ~2 interventions/user/day × 90d. Tiny.
- **Prediction accuracy**: rule-based + deterministic, auditable. Future v2 could swap in regression model — interface stable.
- **Compounding error**: predictions never feed back into `compute-hammer-state`. Engine remains source of truth. If predictions go haywire, `DELETE FROM engine_state_predictions; DELETE FROM engine_interventions;` instantly clears.

---

## Open Decisions (best defaults; flag to override)
1. **Prediction model = rule-based** (auditable, deterministic). v2 could use linear regression on last 30d trajectory. Default = rules.
2. **Intervention surface = panel only** (no toasts, no email, no push). Spec said "no spam"; this honors it strictly.
3. **Window badge threshold = confidence ≥ 70** (stricter than trajectory line's 60). Prevents low-confidence state flips from showing badges.
4. **Intervention directive overrides constraint chip only at priority ≥ 4**. Lower priority interventions appear nowhere — they exist only for the feedback loop. (Could surface all interventions; default is "only urgent ones reach UI".)
5. **Forecast horizon = 24/48/72h**. 72h confidence will often be low (<60) and won't surface; kept for analytics + future visualization.

If any of those four are wrong, say so before approval and I'll adjust.

## Time Budget
- Build: ~12-15 minutes (1 migration, 2 edge functions, 1 hook, 1 UI edit, 1 function patch, 1 config edit, 3 cron schedules)
- Validation: ~5 minutes (force-load sequence + invoke chain + UI check)

## Cleanup
Both new tables auto-rotate (60–90d). Zero manual maintenance.

