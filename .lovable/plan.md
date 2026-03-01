

# Phase 1 Zero-Assumption Integrity Sweep

---

## SECTION 1 -- DATABASE FIELD USAGE VALIDATION

### `athlete_daily_log` (17 columns)

| Column | Written To? | Read by Computation? | Indexed? | Validated? | Influences MPI? |
|--------|------------|---------------------|----------|-----------|----------------|
| id | Auto (uuid) | No | PK | Yes | No |
| user_id | Yes (session save, DayStatusSelector) | Yes (nightly MPI query L265) | Unique composite | Yes | Yes (dampening) |
| entry_date | Yes | Yes (nightly MPI query L265) | Unique composite | Yes | Yes (dampening) |
| day_status | Yes (DayStatusSelector) | Yes (nightly MPI L281) | No | No enum constraint | Yes (missed count) |
| rest_reason | Yes (DayStatusSelector) | No | No | No | **Dead Field -- never read by any computation** |
| coach_override | Yes (default false) | No | No | No | **Dead Field** |
| coach_override_by | Never written by UI | No | No | No | **Unreachable Field** |
| injury_mode | Yes (DayStatusSelector sets true for injury_hold) | Yes (nightly MPI L274) | No | No | Yes (freeze trigger) |
| injury_body_region | Never written by UI | No | No | No | **Unreachable Field** |
| injury_expected_days | Never written by UI | No | No | No | **Unreachable Field** |
| game_logged | Yes (usePerformanceSession) | No | No | No | **Dead Field** |
| cns_load_actual | Yes (usePerformanceSession) | No | No | No | **Dead Field -- never read by any computation** |
| consistency_impact | Default 0, never written | No | No | No | **Dead Field** |
| momentum_impact | Default 0, never written | No | No | No | **Dead Field** |
| notes | Never written by UI | No | No | No | **Unreachable Field** |
| created_at | Auto | No | No | No | No |
| updated_at | Auto | No | No | No | No |

**Critical findings:**
- `cns_load_actual`: Written by `usePerformanceSession` but **never read** by nightly MPI, load calculation, or any analytics. **Dead Field.**
- `rest_reason`: Written by UI but **never read** by any computation. **Cosmetic / No Functional Impact.**
- `coach_override`, `coach_override_by`, `injury_body_region`, `injury_expected_days`, `notes`: Schema exists, **no UI writes, no logic reads**. **Unreachable Fields.**
- `consistency_impact`, `momentum_impact`: Default 0, **never written, never read**. **Dead Fields.**

### `performance_sessions` -- `drill_blocks` JSONB

Expected keys per DrillBlock interface:
- `drill_type`, `intent`, `volume`, `execution_grade`, `outcome_tags`, `notes`
- `batter_side`, `pitcher_hand`
- Hitting micro: `bp_distance_ft`, `machine_velocity_band`, `batted_ball_type`, `spin_direction`, `swing_intent`, `goal_of_rep`, `actual_outcome`, `execution_score`, `hard_contact_pct`, `whiff_pct`, `chase_pct`, `in_zone_contact_pct`
- Fielding micro: `throw_included`, `footwork_grade`, `exchange_time_band`, `throw_accuracy`, `throw_spin_quality`, `clean_field_pct`
- Pitching micro: `velocity_band`, `spin_rate_band`, `spin_efficiency_pct`, `pitch_command_grade`, `zone_pct`, `pitch_whiff_pct`, `pitch_chase_pct`

**UI writes these keys?** Only through AdvancedRepFields which writes to `ScoredRep` (per-rep micro_layer_data), NOT to drill_blocks. The DrillBlock-level micro fields (`hard_contact_pct`, `whiff_pct`, `chase_pct`, `in_zone_contact_pct`, `clean_field_pct`, `zone_pct`, `pitch_whiff_pct`, `pitch_chase_pct`) are **never written by any UI**. **Unreachable Fields.**

**Nightly process reads these keys?** No. Nightly MPI reads `composite_indexes` (pre-computed by `calculate-session`), not raw `drill_blocks` JSONB. The `drill_blocks` micro fields have **no influence on MPI**. The only reader is heat map computation which reads `micro_layer_data` (per-rep data), not `drill_blocks`.

### `performance_sessions` -- `micro_layer_data` JSONB

Expected keys per rep: `pitch_location`, `contact_quality`, `exit_direction`, `pitch_type`, `pitch_result`, `swing_decision`, `intent`, `in_zone`, `batted_ball_type`, `spin_direction`, `swing_intent`, `execution_score`, `machine_velocity_band`, `bp_distance_ft`, `velocity_band`, `spin_efficiency_pct`, `pitch_command_grade`, `throw_included`, `footwork_grade`, `exchange_time_band`, `throw_accuracy`, `throw_spin_quality`

**UI writes?** Yes -- RepScorer merges AdvancedRepFields into each rep via `commitRep()` (RepScorer.tsx L76).

**Nightly reads?** Partially. Heat map reads: `pitch_location`, `contact_quality` (barrel/miss/error), `pitch_result`, `in_zone`, `throw_accuracy`. The following micro fields are **stored but never read by any computation**:
- `batted_ball_type`: **Stored, never read. Used But Not Weighted.**
- `spin_direction`: **Stored, never read. Used But Not Weighted.**
- `swing_intent`: **Stored, never read. Used But Not Weighted.**
- `execution_score`: **Stored, never read. Used But Not Weighted.**
- `machine_velocity_band`: **Stored, never read. Used But Not Weighted.**
- `bp_distance_ft`: **Stored, never read. Used But Not Weighted.**
- `velocity_band`: **Stored, never read. Used But Not Weighted.**
- `spin_efficiency_pct`: **Stored, never read. Used But Not Weighted.**
- `pitch_command_grade`: **Stored, never read. Used But Not Weighted.**
- `footwork_grade`: **Stored, never read. Used But Not Weighted.**
- `exchange_time_band`: **Stored, never read. Used But Not Weighted.**
- `throw_spin_quality`: **Stored, never read. Used But Not Weighted.**

### `verified_stat_profiles` -- governance columns

| Column | Written? | Read? | Status |
|--------|---------|-------|--------|
| confidence_weight | Yes (AdminVerification page) | Yes (nightly MPI L220) | **Fully Integrated** |
| admin_verified | Yes (AdminVerification page) | No (nightly only checks `verified = true`) | **Cosmetic / No Functional Impact** |
| verified_by | Yes (AdminVerification page) | No | **Dead Field** |
| verified_at | Yes (AdminVerification page) | No | **Dead Field** |
| rejection_reason | Yes (AdminVerification page) | No | **Dead Field** |

`admin_verified` is written but nightly process filters by `verified = true` (L145), not `admin_verified`. These are two different columns. **Admin approval does not gate boost application.** A profile marked `verified=true` but `admin_verified=false` still receives full boost.

---

## SECTION 2 -- MPI MATHEMATICAL TRACE

**Example: Varsity HS baseball, 3 sessions, 1 coach override, 1 scout eval, 1 verified stat at 80% confidence, 2 missed in 7 days, not injured, no contract.**

Assume composite_indexes per session average: bqi=55, fqi=50, pei=48, decision=52, competitive=45.

### Step 1: Raw composite averages
```
bqi = 55, fqi = 50, pei = 48, decision = 52, competitive = 45
```

### Step 2: Weighted raw score (L195-196)
```
rawScore = 55*0.25 + 50*0.15 + 48*0.20 + 52*0.20 + 45*0.20
         = 13.75 + 7.50 + 9.60 + 10.40 + 9.00
         = 50.25
```

### Step 3: Tier multiplier (L199)
```
hs_varsity = 0.85
adjusted = 50.25 * 0.85 = 42.71
```

### Step 4: Age multiplier
Assume age 17 (baseball curve: 16-18 = 0.92)
```
adjusted = 42.71 * 0.92 = 39.29
```

### Step 5: Position weight
Assume SS = 1.06
```
adjusted = 39.29 * 1.06 = 41.65
```

### Step 6: Verified stat boost (L214-224)
Profile type assumed `ncaa_d1` (competitiveBoost = 12), confidence = 80%
```
verifiedBoostTotal = 12 * (80/100) = 9.6
adjusted = 41.65 + 9.6 = 51.25
```

### Step 7: Contract modifier (L227-237)
No contract/pro status. `contractMod = 1.0`. No change.
```
adjusted = 51.25
```

### Step 8: Scout blending (L240-244)
1 scout eval, overall_grade = 60
```
adjusted = 51.25 * 0.8 + 60 * 0.2 = 41.0 + 12.0 = 53.0
```

### Step 9: Integrity score (L248-261)
No governance flags, 0 coach-graded sessions (example has coach override but override is in `coach_grade_overrides` table, not `performance_sessions.coach_grade`).
```
integrityScore = 100 + 0 = 100
```
Wait -- the rebuild logic (L259) checks `sessions.filter(s => s.coach_grade != null)`. The coach override is stored separately; sessions may not have `coach_grade` populated. If 0 coach-graded sessions: `integrityScore = 100`.

### Step 10: Consistency dampening (L264-294)
2 missed in last 7 days.
```
missed7 = 2 --> dampingMultiplier = 0.95
```
Then consistency check: If only 5 days logged out of 30 (3 training + 2 missed = only 5 entries in table):
```
loggedDays = 3 (non-missed), injuryDays = 0
consistencyScore = 3 / 30 * 100 = 10%
10% < 80%, so dampingMultiplier stays at 0.95
```

### Step 11: Final score (L299)
```
finalScore = 53.0 * (100/100) * 0.95 = 50.35
```

### Step 12: Pro probability (L326)
Score 50.35 falls in tier `{ minS: 45, maxS: 54.99, minP: 8, maxP: 19 }`
```
ratio = (50.35 - 45) / (54.99 - 45) = 5.35 / 9.99 = 0.535
proProbability = 8 + 0.535 * (19 - 8) = 8 + 5.89 = 13.89%
```
Not verified pro, so capped at 99%. Already below. Final: **13.89%**

### Variables NOT influencing MPI in code:
- `batted_ball_type`: **Ignored in current implementation**
- `spin_direction`: **Ignored in current implementation**
- `swing_intent`: **Ignored in current implementation**
- `execution_score`: **Ignored in current implementation**
- `machine_velocity_band`: **Ignored in current implementation**
- `bp_distance_ft`: **Ignored in current implementation**
- `cns_load_actual`: **Ignored in current implementation**
- `rest_reason`: **Ignored in current implementation**
- `momentum_impact`: **Ignored in current implementation**

---

## SECTION 3 -- CONTRACT & PROBABILITY EDGE CASES

### MiLB player with 92 MPI
Line 330: `if (!isVerifiedPro) proProbability = Math.min(99, proProbability);`
MiLB player would need `roster_verified === true` AND `current_league === 'mlb'` to exceed 99%.
MiLB league = 'milb', not 'mlb'. So `isVerifiedPro = false`. Cap enforced at 99%.
Score 92 maps to tier `{minS:80, maxS:100, minP:75, maxP:99}`:
```
ratio = (92-80)/(100-80) = 0.6
prob = 75 + 0.6*24 = 89.4% -- capped at 99 but already below.
```
**Verified: Cannot exceed 99%. Correct.**

### MLB player released
`contract_status = 'released'`, `release_count = 1`. 
L232: `contractMod = 1.0 - 12/100 = 0.88`
L236: `adjusted *= 0.88`
Score drops by 12%.
L326: `proProbability = calcProProb(finalScore)` -- finalScore already penalized.
If pre-release `proProbability = 100%`, post-release the score drops, so probability recalculates lower.
**But**: `isVerifiedPro` checks `roster_verified === true`. If released, does `roster_verified` update? **Not automatically. Spec Violation -- release event does not set `roster_verified = false`.** The 99% cap would still not apply because `roster_verified` might remain `true`.

### MLB player released then re-signed
No re-sign logic exists. `contract_status` must be manually updated. When changed back to `active`, `contractMod = 1.0`. Score restores.
**But**: `release_count` persists. If `release_count = 1` and re-signed, next nightly run still sees `release_count = 1` unless contract_status changes. When `contract_status = 'active'` (not in the penalty conditions), `contractMod = 1.0`.
**Partially correct -- restoration works but `roster_verified` is not managed by release/re-sign events. Spec Violation.**

### MLB player with 4 seasons
L339-342: `proProbability >= 100` AND `totalProSeasons >= 5`. With 4 seasons, HoF inactive.
**Verified: Correct.**

### MLB player with 5 seasons
If `proProbability >= 100` and 5 MLB seasons: `hofActive = true`.
**Verified: Correct.**

### Baseball player with AUSL seasons only
L339-341: `totalProSeasons = sport === 'baseball' ? mlbSeasons : mlbSeasons + auslSeasons`
For baseball, only MLB counts. AUSL-only = 0 MLB seasons. HoF inactive.
**Verified: Correct.**

### Retired player
L234: `contractMod = 0`. L237: `adjusted = adjusted` (frozen, keeps last score).
Score stays same but `contractMod = 0` is stored, and the score IS still upserted (L396).
Wait -- L236: `if (contractMod > 0) adjusted *= contractMod; else adjusted = adjusted;`
So final score = pre-contract adjusted * integrity * dampening. The score IS updated but without contract penalty. Then it's upserted.
**Spec says MPI should freeze (no growth or decline). But score IS recalculated from fresh session data. If new sessions are added, MPI changes. Spec Violation -- retired MPI is not truly frozen.**

---

## SECTION 4 -- REST ENGINE TRACE

**Scenario: 7-day window**
- Day 1: Full Training
- Day 2: Missed
- Day 3: Full Training
- Day 4: Missed
- Day 5: Light Work
- Day 6: Injury Hold (injury_mode=true)
- Day 7: Game Only

### Consistency Index %
Nightly process L291-292:
```
loggedDays = 5 (full_training x2, light_work, injury_hold, game_only -- all non-missed)
injuryDays = 1
consistencyScore = 5 / max(1, 30 - 1) * 100 = 5/29 * 100 = 17.2%
```
But this is calculated over 30 days, not 7. With only 7 entries total, 25 days have no row at all. Those are NOT counted as missed by the nightly process (it only counts rows WHERE `day_status = 'missed'`).
**Critical flaw: Days with no `athlete_daily_log` row are invisible to dampening. Only explicitly marked 'missed' days trigger dampening.**

### Dampening multiplier
L277-287:
```
missed7 count: Day 2 + Day 4 = 2 rows with day_status='missed' in last 7 days
missed7 = 2 --> dampingMultiplier = 0.95
```
Then consistency check: `17.2% < 80%`, dampening stays at 0.95.
**Dampening is connected to MPI.** Applied at L299: `finalScore = adjusted * (integrityScore/100) * 0.95`
**Partially Integrated** -- dampening works but only for explicitly-marked missed days, not for absent rows.

### Injury freeze
L274: `injuryHoldActive = dailyLogs.some(l => l.injury_mode === true && l.entry_date >= sevenDaysAgo)`
Day 6 has `injury_mode = true` and is within 7 days. `injuryHoldActive = true`.
L296: `if (injuryHoldActive) continue;` -- skips athlete entirely. No MPI upsert.
**Injury Freeze: Connected.** MPI genuinely frozen (no new row written to `mpi_scores`).

### Streak updates
`DualStreakDisplay` queries `athlete_daily_log` and calls `computeStreaks()`.
Performance streak: Day 7 (game_only) = active. Day 6 (injury_hold) = active. Day 5 (light_work) = active. Day 4 (missed) = **breaks streak**. Performance streak = 3.
Discipline streak: All 7 days have rows, so discipline streak = 7.
**Streaks calculate correctly IF rows exist.**
**But** `DualStreakDisplay` is **never imported or mounted anywhere**. Search confirms: only defined in its own file.
**DualStreakDisplay: Not Mounted. Cosmetic / No Functional Impact.**

### Roadmap velocity changes
Dampening multiplier is applied to MPI score but NOT to roadmap progress calculation. Roadmap (L589-613) uses `sessionsCount`, `score`, `streak`, and `trend` -- none of which incorporate dampening as a separate velocity factor.
**Roadmap velocity: Not Connected to dampening. Dampening only affects MPI score, not roadmap progression speed.**

---

## SECTION 5 -- SESSION LOGGING FIELD TRACE

| Micro Field | Exposed in UI? | Validated? | Stored? | Indexed? | Read by Heat Map? | Read by MPI? | Status |
|------------|---------------|-----------|---------|----------|-------------------|-------------|--------|
| in_zone | Yes (AdvancedRepFields toggle) | No | Yes (micro_layer_data) | No | Yes (L473: chase calc) | No | **Partially Integrated** |
| batted_ball_type | Yes (AdvancedRepFields selector) | No | Yes | No | No | No | **Exposed But Not Used** |
| spin_direction | Yes (AdvancedRepFields selector) | No | Yes | No | No | No | **Exposed But Not Used** |
| swing_intent | Yes (AdvancedRepFields selector) | No | Yes | No | No | No | **Exposed But Not Used** |
| execution_score | Yes (AdvancedRepFields slider) | No | Yes | No | No | No | **Exposed But Not Used** |
| machine_velocity_band | Yes (shown when drillType=machine_bp) | No | Yes | No | No | No | **Exposed But Not Used** |
| bp_distance_ft | Yes (shown when drillType=machine_bp) | No | Yes | No | No | No | **Exposed But Not Used** |
| velocity_band | Yes (pitching AdvancedRepFields) | No | Yes | No | No | No | **Exposed But Not Used** |
| spin_efficiency_pct | Yes (pitching slider) | No | Yes | No | No | No | **Exposed But Not Used** |
| pitch_command_grade | Yes (pitching slider) | No | Yes | No | No | No | **Exposed But Not Used** |
| throw_included | Yes (fielding toggle) | No | Yes | No | No | No | **Exposed But Not Used** |
| footwork_grade | Yes (fielding slider) | No | Yes | No | No | No | **Exposed But Not Used** |
| exchange_time_band | Yes (fielding selector) | No | Yes | No | No | No | **Exposed But Not Used** |
| throw_accuracy | Yes (fielding slider) | No | Yes | No | Yes (L504-511) | No | **Partially Integrated** (heat map only) |
| throw_spin_quality | Yes (fielding selector) | No | Yes | No | No | No | **Exposed But Not Used** |

**Summary: 2 of 15 micro fields are read by any computation (in_zone, throw_accuracy). 13 are stored but never influence any output.**

### Specific confirmations:
- Machine BP velocity band: **Exposed But Not Used**
- BP distance numeric storage: **Exposed But Not Used**
- Batted ball classification: **Exposed But Not Used**
- Spin direction: **Exposed But Not Used**
- Swing intent: **Exposed But Not Used**
- In-zone flag: **Partially Integrated** (chase heat map only)
- Pitch spin efficiency: **Exposed But Not Used**
- Fielding exchange time: **Exposed But Not Used**
- Throw velocity band: **Not Implemented** (no `throw_velocity_band` field exists in UI or schema)

---

## SECTION 6 -- HEAT MAP TRUTH TEST

| Map Type | Data Source | Grid Size | Practice/Game Separated? | Batting Side? | Pitch Type? | Blind Zone Calc? | Blind Zone -> Roadmap? |
|----------|-----------|-----------|------------------------|--------------|------------|-----------------|----------------------|
| pitch_location | micro_layer_data.pitch_location | Dynamic 3 or 5 | Yes (L460) | No | No | Yes (L529-539) | Yes (L549-576) |
| swing_chase | micro_layer_data.in_zone + swing_result | Dynamic | Yes | No | No | Yes | Yes |
| barrel_zone | micro_layer_data.contact_quality=barrel | Dynamic | Yes | No | No | Yes | Yes |
| whiff_zone | micro_layer_data.contact_quality=miss | Dynamic | Yes | No | No | Yes | Yes |
| command_heat | micro_layer_data.pitch_result=strike/out | Dynamic | Yes | No | No | Yes | Yes |
| miss_tendency | micro_layer_data.pitch_result=ball | Dynamic | Yes | No | No | Yes | Yes |
| throw_accuracy | micro_layer_data.throw_accuracy (numeric) | Dynamic | Yes | No | No | Yes | Yes |
| error_location | micro_layer_data.contact_quality=error | Dynamic | Yes | No | No | Yes | Yes |

**Is any 5x5 data collapsed to 3x3?**
L431-442: Grid size detection scans all reps. If ANY rep has `row > 2` or `col > 2`, grid size = 5. Otherwise defaults to 3.
L465: Coordinates clamped to `Math.min(gs-1, ...)` -- correct for detected size.
**No data collapse IF 5x5 data exists.** However...

**Is any UI allowing 5x5 input that is later preserved?**
`PitchLocationGrid` supports `allow5x5` prop. But **no caller passes `allow5x5={true}`**. The prop defaults to `false`. RepScorer.tsx L170-173 calls `<PitchLocationGrid>` without `allow5x5`. **All user input is 3x3. 5x5 grid toggle exists but is never activated.**
**Data Integrity Issue: 5x5 UI exists but is unreachable. All data is 3x3.**

**Batting side separation:** Not implemented. No `batting_side` filter in heat map computation.
**Pitch type separation:** Not implemented. No `pitch_type` filter in heat map computation.

---

## SECTION 7 -- TRIGGER & ENFORCEMENT VALIDATION

| Trigger Name | Table | Event | Active? | Status |
|-------------|-------|-------|---------|--------|
| prevent_override_update | coach_grade_overrides | BEFORE UPDATE | Yes (O) | **Active, Verified** |
| prevent_override_delete | coach_grade_overrides | BEFORE DELETE | Yes (O) | **Active, Verified** |
| prevent_coach_override_modification | coach_grade_overrides | BEFORE UPDATE OR DELETE | Yes (O) | **Active, Verified** |
| prevent_scout_eval_update | scout_evaluations | BEFORE UPDATE | Yes (O) | **Active, Verified** |
| prevent_scout_eval_delete | scout_evaluations | BEFORE DELETE | Yes (O) | **Active, Verified** |
| on_auth_user_created | auth.users | AFTER INSERT | Yes (O) | Active |
| on_profile_created_subscription | profiles | AFTER INSERT | Yes (O) | Active |
| validate_sleep_quality_trigger | vault_focus_quizzes | BEFORE INSERT/UPDATE | Yes (O) | Active |
| Various update_updated_at | Multiple tables | BEFORE UPDATE | Yes (O) | Active |

**No retroactive recalculation triggers exist.** Retroactive recalculation is attempted client-side in `usePerformanceSession.ts` via `supabase.functions.invoke('calculate-session')` but there is no database trigger that fires on `athlete_daily_log` INSERT/UPDATE.

**No schedule shift triggers exist.** `RestDayScheduler` operates purely client-side.

**No integrity flagging triggers exist.** Overload detection (5+ sessions/day) is in `usePerformanceSession.ts` client-side only.

**Coach override immutability: Fully Active. Three redundant triggers (one overlaps the other two).**

---

## SECTION 8 -- DEAD CODE & COSMETIC SYSTEMS

### Components never mounted:
- `DualStreakDisplay` -- defined, never imported anywhere. **Dead Component.**
- `RestDayScheduler` -- defined, never imported in `CalendarDaySheet.tsx` or any other file. **Dead Component.**

### Utilities not meaningfully connected:
- `consistencyIndex.ts` `calculateConsistencyIndex()` -- only used by `DualStreakDisplay` (which is dead). Nightly process has its own inline consistency calc. **Client-side function is Dead Code.**
- `consistencyIndex.ts` `computeStreaks()` -- only used by `DualStreakDisplay` (dead). **Dead Code.**

### Fields never read:
- `athlete_daily_log.rest_reason` -- stored, never read
- `athlete_daily_log.cns_load_actual` -- stored, never read
- `athlete_daily_log.consistency_impact` -- never written, never read
- `athlete_daily_log.momentum_impact` -- never written, never read
- `athlete_daily_log.game_logged` -- stored, never read
- `verified_stat_profiles.admin_verified` -- stored, nightly checks `verified` not `admin_verified`
- `verified_stat_profiles.verified_by` -- stored, never read
- `verified_stat_profiles.verified_at` -- stored, never read
- `verified_stat_profiles.rejection_reason` -- stored, never read
- 13 of 15 micro-layer fields in `micro_layer_data`

### Roadmap logic not connected to performance metrics:
Roadmap milestones check: `min_sessions`, `min_streak`, `min_mpi`, `trend`. No milestone checks micro-field quality, blind zones (except the separate blind zone -> roadmap blocking logic at L549-576), or consistency dampening.

### Probability logic duplication:
None found. Single `calcProProb()` function used consistently.

---

## SECTION 9 -- FRICTION ANALYSIS

### Quick Log (Hitting)
- **Step 1**: Select session type (1 tap)
- **Step 2**: Select drill type (1 tap)
- **Step 3**: Set volume + grade slider (2 interactions)
- **Step 4**: Per-rep: tap pitch location grid (1 tap), tap contact quality (1 tap), tap exit direction (1 tap, auto-commits)
- **Step 5**: Save (1 tap)

**Minimum for 1-rep session**: 7 taps. **Estimated: 15-20 seconds.** No friction issue.

### Advanced Log (Hitting)
All Quick Log steps PLUS:
- Open Advanced toggle (1 tap)
- In-zone toggle (1 tap)
- Batted ball type (1 tap)
- Spin direction (1 tap)
- Swing intent (1 tap)
- Execution score slider (1 drag)
- If machine_bp: velocity band (1 tap) + distance input (keyboard entry = 3-5 seconds)

**Per-rep with advanced**: 13+ taps + keyboard. For 10 reps: **130+ taps.**
**Estimated: 3-5 minutes for 10-rep advanced session.**
**Flag: High Friction Risk for Advanced Log with multiple reps** -- advanced fields reset per rep but are not auto-applied from previous rep within same session.

### Daily Status
- **Step 1**: Open calendar day (1 tap)
- **Step 2**: Tap status button (1 tap)
- **Step 3**: If rest type, tap reason (1 tap)

**Total: 2-3 taps. Estimated: 5 seconds.** No friction issue.

### Verified Stat Submission
- Navigate to profile/verified section
- Enter URL (keyboard)
- Select profile type
- Submit

**Estimated: 30-45 seconds.** No friction issue.

---

## SECTION 10 -- FINAL DECLARATION

### Fully Integrated and Verified
1. Coach grade override immutability (3 active triggers)
2. Scout evaluation immutability (2 active triggers)
3. HoF MLB-only season counting for baseball (nightly L339-341 + useHoFEligibility L15-17)
4. MiLB 99% hard cap (nightly L328-331)
5. Confidence weight scaling verified stat boosts (nightly L220-221)
6. Consistency dampening applied to MPI final score (nightly L286-299)
7. Injury hold freeze (nightly L274, L296 -- skips athlete)
8. 8 heat map types with dynamic grid sizing (nightly L444-547)
9. Practice vs game heat map separation (nightly L446, L460)
10. Blind zone detection and roadmap blocking (nightly L549-576)
11. Quick Log UX under 30 seconds
12. Daily status selector with 8 status types and reason picker

### Partially Integrated
1. `in_zone` field -- captured in UI, used only in chase heat map, NOT in MPI
2. `throw_accuracy` field -- captured in UI, used only in throw_accuracy heat map, NOT in MPI
3. Advanced micro logging -- all 15 fields have UI, all are stored, but 13/15 are never read by any computation
4. CNS load -- written to `athlete_daily_log.cns_load_actual` on session save, never read
5. Overload detection -- client-side toast only, no governance flag created, no dampening effect
6. Retroactive recalculation -- `usePerformanceSession` calls `calculate-session` edge function, but no guarantee nightly process re-runs
7. Admin verification dashboard -- UI exists, `confidence_weight` works, but `admin_verified` flag does NOT gate boost application (nightly checks `verified`, not `admin_verified`)
8. 5x5 grid -- UI component supports it, nightly process supports it, but NO caller passes `allow5x5={true}` so all data is 3x3

### Spec Violations / Missing
1. **DualStreakDisplay never mounted** -- component exists, zero visibility to users
2. **RestDayScheduler never mounted** -- push schedule logic exists, unreachable from calendar
3. **5x5 grid unreachable** -- prop `allow5x5` never set to true anywhere
4. **13 of 15 micro fields have no computational impact** -- stored data is decorative
5. **Retired player MPI not frozen** -- score recalculates from fresh sessions, only contractMod=0 prevents penalty but doesn't prevent score changes
6. **Release event does not update `roster_verified`** -- released MLB player may still bypass 99% cap
7. **`admin_verified` does not gate boosts** -- unverified-by-admin profiles still receive full boost if `verified=true`
8. **Days with no `athlete_daily_log` row are invisible** -- only explicitly marked 'missed' days trigger dampening; absent days are ignored
9. **No batting side or pitch type heat map separation**
10. **No re-sign event logic** -- contract_status must be manually changed
11. **`rest_reason`, `coach_override`, `injury_body_region`, `injury_expected_days`** -- schema exists, no functional impact
12. **`consistency_impact`, `momentum_impact`** -- columns exist, never written or read
13. **`game_logged`** -- written, never read
14. **Roadmap velocity not connected to dampening** -- dampening affects MPI score only, not roadmap progression speed
15. **No abuse flagging to governance** -- overload detection is client-side toast only, no `governance_flags` row created
