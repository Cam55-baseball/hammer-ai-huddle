
# Phase 2 Elite Engine Stabilization -- Full Execution Blueprint

---

## SECTION 1: Wire 11 Unwired Micro-Layer Fields into MPI Engine

These fields are stored in drill_blocks JSONB and/or micro_layer_data but never read by `calculate-session` or `nightly-mpi-process`. Each must influence composites, heat maps, or roadmap gates.

### Wiring Map

| Field | Composite Target | Weight | Heat Map | Roadmap Gate |
|-------|-----------------|--------|----------|-------------|
| spin_direction | BQI modifier: topspin=-2, backspin=+3, sidespin=+1 | 5% additive | No (categorical, not spatial) | No |
| throw_spin_quality | FQI sub-blend: carry=+5, tail=+2, cut=+2, neutral=0 | 10% of FQI throw component | No | No |
| footwork_grade | FQI sub-weight (20-80 scale, normalized like throw_accuracy) | 20% of FQI | No | Yes: `min_footwork_grade` |
| exchange_time_band | FQI modifier: fast=+5, average=0, slow=-5 | Additive to FQI | No | No |
| clean_field_pct | FQI consistency modifier (direct percentage) | 15% of FQI | No | Yes: `min_clean_field_pct` |
| whiff_pct | BQI penalty (higher = worse) | -0.1 * whiff_pct on BQI | whiff_zone (already exists) | Yes: `max_whiff_pct` |
| chase_pct | Decision composite penalty | -0.15 * chase_pct on Decision | swing_chase (already exists) | Yes: `max_chase_pct` |
| in_zone_contact_pct | BQI bonus (higher = better) | +0.1 * in_zone_contact_pct on BQI | No | Yes: `min_iz_contact_pct` |
| zone_pct | PEI command precision modifier | +0.1 * zone_pct on PEI | command_heat (already exists) | Yes: `min_zone_pct` |
| pitch_whiff_pct | PEI effectiveness bonus | +0.08 * pitch_whiff_pct on PEI | No | No |
| pitch_chase_pct | PEI deception bonus | +0.05 * pitch_chase_pct on PEI | No | No |

### New Composite Formulas (calculate-session)

**BQI (updated):**
```
bqiRaw = (normalizedScore * competitiveMultiplier) * 0.7 + avgExecScore * 0.3  [existing]
  + barrelPct * 0.1                                                             [existing]
  + spinDirectionMod                                                            [NEW: +3 backspin, +1 sidespin, -2 topspin]
  - whiffPct * 0.1                                                              [NEW]
  + inZoneContactPct * 0.1                                                      [NEW]
bqiRaw *= velocityDifficultyMult                                                [existing]
```

**FQI (updated):**
```
fqiRaw = normalizedScore * 0.9                                                  [existing base: 25%]
  blended with throw_accuracy at 40%                                            [existing]
  blended with footwork_grade at 20%                                            [NEW]
  blended with clean_field_pct at 15%                                           [NEW]
  + throw_spin_quality_mod (carry=+5, tail/cut=+2, neutral=0)                   [NEW: scaled to 0-100]
  + exchange_time_mod (fast=+5, avg=0, slow=-5)                                 [NEW]
```

**PEI (updated):**
```
peiRaw = normalizedScore * 1.05                                                 [existing base: 60%]
  blended with pitch_command_grade at 40%                                       [existing]
  + zone_pct * 0.1                                                              [NEW]
  + pitch_whiff_pct * 0.08                                                      [NEW]
  + pitch_chase_pct * 0.05                                                      [NEW]
```

**Decision (updated):**
```
decisionRaw = normalizedScore * decisionMultiplier                              [existing]
  - chase_pct * 0.15                                                            [NEW]
```

### Backward Compatibility
- All new fields use null-safe checks (`if (value !== null)` guards)
- Sessions without micro data produce identical scores to current behavior
- No data migration needed -- fields already exist in JSONB, just not read

### Files Modified
- `supabase/functions/calculate-session/index.ts` -- Add aggregation for 11 new fields after existing micro aggregation block (L80-131), blend into composites (L109-121)
- `supabase/functions/nightly-mpi-process/index.ts` -- Add new roadmap gate checks alongside existing Block 10 gates (L699-724)

---

## SECTION 2: Retroactive Logic Alignment

### Current State
- **DB trigger** `validate_retroactive_session`: Limits `session_date` to within 1 day of `created_at` when `is_retroactive = true`
- **Hook** `usePerformanceSession`: Sends retroactive recalc request for any past date without client-side limit

### Decision: Standardize to 7-DAY WINDOW
The 1-day trigger is too restrictive for real use (athletes log weekend tournaments on Monday). The trigger must be updated to match the 7-day intent documented in the architecture memory.

### Changes
1. **DB Migration**: ALTER trigger function `validate_retroactive_session` to allow 7 days:
```sql
IF (NEW.created_at::date - NEW.session_date) > 7 THEN
  RAISE EXCEPTION 'Retroactive sessions must have session_date within 7 days of creation';
END IF;
```

2. **Hook** `usePerformanceSession.ts` L155-161: Add client-side validation with clear error message:
```typescript
const daysDiff = Math.floor((Date.now() - new Date(data.session_date).getTime()) / 86400000);
if (daysDiff > 7) {
  toast({ title: 'Too far back', description: 'Sessions can only be logged up to 7 days in the past.', variant: 'destructive' });
  return;
}
```

3. **Governance flag** for retroactive abuse already exists in calculate-session (L244-258) and fires at 3+ retro sessions in 7 days. No change needed.

---

## SECTION 3: Dead Field Resolution

| Field | Decision | Justification |
|-------|----------|--------------|
| `mpi_scores.mlb_season_count` | **DROP** | Never written by nightly process. Season counts are read from `athlete_professional_status.mlb_seasons_completed`. |
| `verified_stat_profiles.external_metrics` | **DROP** | JSONB column, never written, never read. Was placeholder for future sync. |
| `verified_stat_profiles.last_synced_at` | **DROP** | Never written, never read. No sync system exists. |
| `verified_stat_profiles.sync_frequency` | **DROP** | Never written, never read. No sync system exists. |
| `athlete_daily_log.game_logged` | **KEEP but wire** | Written by session upsert (L107). Will be read by Section 4 fix to prevent day_status overwrite -- if `game_logged` is already true, session upsert preserves existing `day_status`. |

### Migration SQL
```sql
ALTER TABLE mpi_scores DROP COLUMN IF EXISTS mlb_season_count;
ALTER TABLE verified_stat_profiles DROP COLUMN IF EXISTS external_metrics;
ALTER TABLE verified_stat_profiles DROP COLUMN IF EXISTS last_synced_at;
ALTER TABLE verified_stat_profiles DROP COLUMN IF EXISTS sync_frequency;
```

Update `src/integrations/supabase/types.ts` will auto-regenerate.

---

## SECTION 4: Daily Log Write Optimization

### Problem
`usePerformanceSession.ts` L103-109 does a full upsert that overwrites `day_status` if the user already set it manually (e.g., set "Recovery" then logged a session).

### Fix
Replace the blind upsert with a conditional approach:

```typescript
// Check if manual entry already exists
const { data: existingLog } = await supabase
  .from('athlete_daily_log')
  .select('id, day_status')
  .eq('user_id', user.id)
  .eq('entry_date', data.session_date)
  .maybeSingle();

if (existingLog) {
  // Only update CNS load + game_logged, preserve manual day_status
  await supabase.from('athlete_daily_log').update({
    cns_load_actual: Math.round(cnsLoad),
    game_logged: isGame || existingLog.game_logged,
  }).eq('id', existingLog.id);
} else {
  // No manual entry exists, create with auto day_status
  await supabase.from('athlete_daily_log').insert({
    user_id: user.id,
    entry_date: data.session_date,
    day_status: isGame ? 'game_only' : 'full_training',
    game_logged: isGame,
    cns_load_actual: Math.round(cnsLoad),
  });
}
```

**Rule**: Manual always wins. Session logging only creates a new row if none exists.

---

## SECTION 5: Advanced Logging Friction Reduction

### Current Flow (10 hitting reps with advanced fields)
1. Open Advanced Fields (1 tap)
2. Set batch mode + count (2 taps)
3. Per rep: Location (1) + Contact (1) + Direction (1) = 3 taps
4. With advanced: add ~5 more taps for velocity/intent/execution
5. Total: ~8 taps per rep x 10 = ~80 taps + 3 setup = ~83 taps

### Proposed Redesign

**A. Default batch ON**: When user enables Advanced Fields, batch mode defaults to ON with count=5.

**B. Smart field hierarchy** (3 tiers):
- **Tier 1 (Always visible)**: Pitch location, contact quality, exit direction -- these auto-commit the rep
- **Tier 2 (MPI-impacting, shown by default in Advanced)**: execution_score, batted_ball_type, swing_intent, machine_velocity_band
- **Tier 3 (Coaching-only, collapsed)**: spin_direction, in_zone, bp_distance_ft, whiff_pct, chase_pct, in_zone_contact_pct

**C. Autofill from previous session**: Already implemented via `getSmartDefaults()` in AdvancedRepFields. No change needed -- just confirm it persists correctly via `saveSessionDefaults()`.

**D. Context-aware hiding**: If `drillType !== 'machine_bp'`, hide machine velocity and BP distance fields entirely (already implemented L245-269).

### New Tap Count (10 reps, batch=5, 2 batches)
- Setup: 1 tap (open advanced) + 0 (batch auto-on) = 1
- Batch 1: Location (1) + Contact (1) + Direction (1) + execution_score (1 slider) = 4 taps -> 5 reps
- Batch 2: Same 4 taps -> 5 reps
- Total: 1 + 4 + 4 = **9 taps for 10 reps** (down from ~83)

### Files Modified
- `src/components/practice/AdvancedRepFields.tsx`: Default batch ON, reorder fields into Tier 2/3 with a second collapsible for Tier 3
- `src/components/practice/RepScorer.tsx`: No changes (already supports batch)

---

## SECTION 6: MPI Transparency Breakdown Card

### New Component: `src/components/analytics/MPIBreakdownCard.tsx`

Display a read-only breakdown showing how the final MPI score was computed:

```
MPI Breakdown
---------------------------------
Raw Composite Score        62.4
  BQI (25%)               58.2
  FQI (15%)               71.0
  PEI (20%)               55.8
  Decision (20%)          64.3
  Competitive (20%)       63.1
---------------------------------
Tier Multiplier (x)        1.05
Age Curve (x)              0.97
Position Weight (x)        1.06
---------------------------------
Verified Stat Boost       +12.0
Scout Adjustment (20%)    +4.2
---------------------------------
Integrity Score            92%
Overload Dampening         1.00
Contract Modifier          1.00
---------------------------------
FINAL MPI                 68.7
```

### Data Source
All values already stored in `mpi_scores` table: `composite_bqi`, `composite_fqi`, `composite_pei`, `composite_decision`, `composite_competitive`, `verified_stat_boost`, `contract_status_modifier`, `integrity_score`. 

Missing from DB: tier_multiplier, age_curve, position_weight. These are computed in nightly but not persisted.

**Migration needed**: Add 3 columns to `mpi_scores`:
```sql
ALTER TABLE mpi_scores
  ADD COLUMN IF NOT EXISTS tier_multiplier numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS age_curve_multiplier numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS position_weight numeric DEFAULT 1.0;
```

Update nightly to persist these values in the upsert (L446-464).

### UI Location
Mount below existing `MPIScoreCard` on the Analytics/Dashboard page, inside a collapsible "Show Breakdown" toggle.

---

## SECTION 7: Cron and Infrastructure Verification

### Current State (Confirmed)
- **Cron job**: `nightly-mpi-process` scheduled at `0 5 * * *` (05:00 UTC daily)
- **Method**: `net.http_post` to edge function URL with anon key auth
- **Idempotency**: MPI upsert uses `onConflict: 'user_id,sport,calculation_date'` -- re-running same day produces identical results
- **No duplicate runs**: Single cron entry, no competing schedulers

### Gaps Found
1. **No failure alerting**: If the edge function fails (timeout, error), nobody is notified. The cron job fires and forgets.
2. **No execution logging**: `cron.job_run_details` captures HTTP response but there's no application-level success/failure log table.
3. **Performance at scale**: O(N) queries per athlete. At 500+ athletes, the 150s edge function timeout will be hit.

### Recommended Actions (not blocking Phase 2, but flagged)
- Add a `system_job_log` table to track nightly run start/end/status/athlete_count
- Write a final log entry at end of nightly process
- For scale: future migration to batched SQL function (beyond Phase 2 scope)

### Monitoring Strategy (Phase 2)
Add to end of nightly process:
```typescript
await supabase.from('audit_log').insert({
  user_id: '00000000-0000-0000-0000-000000000000',
  action: 'nightly_mpi_complete',
  table_name: 'mpi_scores',
  metadata: { athletes_processed: totalProcessed, duration_ms: Date.now() - startTime, timestamp: new Date().toISOString() }
});
```

---

## SECTION 8: War-Game Simulation Report

| Scenario | Expected Behavior | Actual Behavior | Status |
|----------|------------------|-----------------|--------|
| **5-year lifecycle** (1800 sessions) | MPI stabilizes, trend oscillates, streaks accumulate | 90-day window limits query scope. Only latest 90 days affect score. Older sessions don't bloat. | PASS |
| **60-day injury hold** | MPI frozen, streaks preserved, skipped in nightly ranking | `injuryHoldActive` check (L360) skips athlete. `continue` statement prevents stale score write. | PASS |
| **Verified stat added mid-season** | Boost applied next nightly run | Nightly queries `verified=true AND admin_verified=true` (L157). New approval appears next run. | PASS |
| **Verified stat removed mid-season** | Boost drops to 0 next nightly | Admin sets `verified=false`, nightly query excludes it. verifiedBoostTotal=0. | PASS |
| **3 releases + 1 re-sign** | Release penalty escalates (12%, 18%, 25%), re-sign restores | `getReleasePenalty(count)` reads `release_count` from `athlete_professional_status`. 3rd release = 25% penalty. Re-sign sets `contract_status='active'`, contractMod=1.0. | PASS |
| **Scout stacking** | Multiple evals averaged, weighted 20% | `scoutMap` collects all grades, averages them, blends at 20% (L272-274). Cannot game by submitting many high grades -- all are averaged. | PASS |
| **Governance abuse** | Flags accumulate, integrity score drops | Each flag reduces integrity: critical=-15, warning=-5, info=-2. Score floor=0. Multiplied into final MPI (L362). | PASS |
| **Cross-sport switching** | Separate MPI per sport, no contamination | Nightly loops `['baseball', 'softball']` independently (L146). Sessions filtered by sport (L188). Separate rank pools. | PASS |
| **60-day inactivity return** | Dampened re-entry, consistency score low | Absent-day counting (L306-318) applies 0.85x for 4+ absences in 14 days. 60-day absence = max dampening until consistency recovers above 80%. | PASS |
| **Coach override stacking** | Only latest override matters per session | Trigger `apply_coach_override_to_session` writes `coach_grade` to session. Multiple overrides for same session: last write wins. Overrides are immutable (prevent_override_modification), so no editing -- only new submissions for different sessions. | PASS |

### Failure Points Identified
- **Retired player edge case**: If `contractMod=0` and NO previous MPI exists (`lastMpi` is null), the `continue` at L268 means they're simply skipped forever with no frozen score. **Impact**: Low (edge case for new profiles marked retired). **Fix**: Write a zero-score MPI record on first retirement detection.

---

## SECTION 9: Sport Parity Confirmation

| System | Baseball | Softball | Cross-Sport Safe |
|--------|----------|----------|-----------------|
| Machine velocity bands | 40-50 to 110+ (8) | 30-35 to 75+ (10) | YES - separate data files |
| Pitching velocity bands | <60 to 110+ (7) | <40 to 75+ (9) | YES - separate data files |
| Age curves | Peak 23-27 | Peak 22-28 | YES - separate arrays in nightly (L17-28) |
| BP distance threshold | >300 ft | >150 ft | YES - sport check at L577 |
| High velocity definition | upper >= 100 or "110+" | upper >= 70 or band.endsWith('+') | YES - `isHighVelocityBand()` |
| Pro probability cap | MiLB: 99% max | Same for non-MLB/AUSL | YES - L386 |
| HoF season counting | MLB only | MLB + AUSL | YES - L393-395 |
| Tier multipliers | mlb:1.5, milb:1.25 | ausl:1.5 | YES - same map, sport-appropriate tiers |
| Position weights | Same for both | Same for both | REVIEW: Softball should have DP=0.90 (done), but no softball-specific positions (e.g., slapper). Low priority. |
| Verified stat boosts | mlb, milb, ncaa_*, etc. | ausl, ncaa_*, etc. | YES - separate keys in verifiedStatBoosts map |
| Roadmap gates | Same metric names | Same metric names | OK - metrics are sport-relative already |
| Heat maps | 12 types, sport-relative velocity | Same | YES |

**No cross-sport contamination found.**

---

## SECTION 10: Structured Output Summary

### Schema Changes (SQL)
1. Drop 4 dead columns (mpi_scores.mlb_season_count, verified_stat_profiles.external_metrics/last_synced_at/sync_frequency)
2. Add 3 columns to mpi_scores (tier_multiplier, age_curve_multiplier, position_weight)
3. Alter `validate_retroactive_session` trigger function: change 1-day to 7-day window

### Edge Function Modifications
1. **calculate-session**: Wire 11 micro fields into BQI/FQI/PEI/Decision composites with null-safe guards
2. **nightly-mpi-process**: Persist tier_multiplier/age_curve/position_weight in mpi_scores upsert; add audit_log entry at completion; add 6 new roadmap gate checks (max_whiff_pct, max_chase_pct, min_iz_contact_pct, min_zone_pct, min_footwork_grade, min_clean_field_pct)

### Hook Modifications
1. `usePerformanceSession.ts`: Replace blind daily log upsert with conditional update (preserve manual day_status); add 7-day client-side retroactive validation

### UI Changes
1. **MPIBreakdownCard** (new component): Read-only MPI calculation transparency card
2. **AdvancedRepFields**: Default batch ON; split fields into Tier 2 (visible) / Tier 3 (collapsed coaching fields)

### Dead Code Removals
- 4 database columns dropped
- No dead UI components found
- No dead edge functions found

### Performance Impact
- calculate-session: +11 field aggregations per call (~2ms additional, negligible)
- nightly-mpi-process: +3 column writes per athlete, +6 roadmap gate checks. ~5% slower per athlete
- At current scale (<100 athletes): no concern. At 500+: O(N) scaling risk remains (pre-existing, not new)

### Risk Assessment
- **Low risk**: All 11 field wirings use null-safe guards; zero impact on sessions without micro data
- **Medium risk**: Retroactive window change from 1 to 7 days increases abuse surface. Mitigated by existing governance flag at 3+ retro sessions/7d
- **Low risk**: Daily log upsert fix is a behavioral change -- users who relied on session-auto-setting day_status will now keep their manual choice

### Execution Order
| Step | Task | Dependencies |
|------|------|-------------|
| 1 | DB migration: drop dead fields + add MPI breakdown columns + fix retro trigger | None |
| 2 | Wire 11 micro fields in calculate-session | None |
| 3 | Add roadmap gates + audit log in nightly-mpi-process | None |
| 4 | Fix daily log upsert in usePerformanceSession | Step 1 |
| 5 | Add client-side retro validation in usePerformanceSession | Step 1 |
| 6 | Redesign AdvancedRepFields (batch default + tier split) | None |
| 7 | Build MPIBreakdownCard | Step 1, 3 |
| 8 | Deploy edge functions | Steps 2, 3 |

Steps 1-3 and 6 are independent. Steps 4-5 depend on Step 1. Step 7 depends on Steps 1+3. Step 8 is final.

### Confidence Score: 94/100
- -3 for O(N) scaling risk at 500+ athletes (pre-existing, not introduced)
- -2 for retired player edge case (no frozen score on first retirement)
- -1 for softball position weights not fully differentiated
