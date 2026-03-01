
# Phase 1 Completion Spec -- Implementation Plan

## Confirmed Critical Gaps

After code inspection, these issues are verified:

1. **Double release penalty** -- Lines 229 and 289 of `nightly-mpi-process/index.ts` both apply release penalty (once to MPI score, once to pro probability independently)
2. **HoF counts AUSL for baseball** -- Line 301: `(proStatus.mlb_seasons_completed || 0) + (proStatus.ausl_seasons_completed || 0)` with no sport filter
3. **No daily status/rest engine** -- No table exists. Only `calendar_skipped_items` with binary skip days
4. **No granular drill types** -- No machine BP, front toss, or distance tracking in drill definitions
5. **Coach immutability trigger** -- Function `prevent_override_modification` exists but is NOT attached to any table (no triggers in DB)

## Implementation Order (5 Streams)

---

### Stream 1: MPI Integrity Fixes (Immediate)

**A. Fix double release penalty** in `supabase/functions/nightly-mpi-process/index.ts`

Remove lines 288-289 (the second application of contract penalties to proProbability). The penalty is already applied to the MPI score via `contractMod` at line 233. Pro probability is derived FROM the score, so applying it again is compounding.

Change:
```text
// Lines 287-289: Remove the second penalty application
let proProbability = calcProProb(finalScore);
// DELETE: if (proStatus?.contract_status === 'free_agent') proProbability *= 0.95;
// DELETE: if (proStatus?.contract_status === 'released') proProbability *= (1 - getReleasePenalty(...));
```

**B. Fix HoF MLB-only enforcement** in same file

Line 301 currently sums MLB + AUSL seasons. For baseball, only count MLB:
```text
const totalProSeasons = sport === 'baseball'
  ? (proStatus.mlb_seasons_completed || 0)
  : (proStatus.mlb_seasons_completed || 0) + (proStatus.ausl_seasons_completed || 0);
```

Also fix `src/hooks/useHoFEligibility.ts` (line 12) and `src/data/hofRequirements.ts` to match.

**C. Attach coach immutability trigger**

Database migration to attach existing `prevent_override_modification` function:
```sql
CREATE TRIGGER prevent_coach_override_modification
  BEFORE UPDATE OR DELETE ON public.coach_grade_overrides
  FOR EACH ROW EXECUTE FUNCTION public.prevent_override_modification();
```

**D. Align scout weighting** -- real-time hook should average all scout grades (matching nightly). Verify `useMPIScores` or equivalent hook uses averaged scout data, not just latest.

---

### Stream 2: Rest + Load Engine (New Architecture)

**A. Database Migration -- `athlete_daily_log` table**

```sql
CREATE TABLE public.athlete_daily_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL,
  day_status text NOT NULL DEFAULT 'full_training',
    -- full_training, game_only, light_work, recovery_only,
    -- travel_day, injury_hold, voluntary_rest, missed
  rest_reason text,
    -- recovery, travel, game_day_only, minor_soreness, personal,
    -- coach_directed, weather, injury
  coach_override boolean DEFAULT false,
  coach_override_by uuid,
  injury_mode boolean DEFAULT false,
  injury_body_region text,
  injury_expected_days integer,
  game_logged boolean DEFAULT false,
  cns_load_actual numeric DEFAULT 0,
  consistency_impact numeric DEFAULT 0,
  momentum_impact numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

ALTER TABLE public.athlete_daily_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily log"
  ON public.athlete_daily_log FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**B. Consistency Index calculation** -- New utility `src/utils/consistencyIndex.ts`

- Query last 30 days from `athlete_daily_log`
- Calculate: logged_days / 30 (excluding injury_hold days from denominator)
- Track consecutive logged streak and consecutive missed streak
- Output: `{ consistencyScore: number, loggedStreak: number, missedStreak: number }`

**C. Development Dampening logic** -- Added to nightly MPI process

- 2+ missed in 7 days: multiply development velocity by 0.95
- 4+ missed in 14 days: multiply by 0.85
- Injury hold: freeze MPI (no growth or decline)
- Once consistency improves above 80%, dampening lifts automatically

**D. Dual Streak System** -- Stored in `athlete_daily_log` queries

- Performance Streak: broken only by unmarked skip (status = 'missed')
- Discipline Streak: broken by no input at all (no row for date)
- Both preserved by rest days, game days, coach-directed rest

**E. Push Schedule Logic** -- New component `src/components/calendar/RestDayScheduler.tsx`

When marking rest day:
- Show options: Move planned work forward, drop session, auto-reschedule
- Detect mandatory events (coach-scheduled, games) and protect them
- Recalculate CNS load for affected days
- Show overload warning if stacking occurs

**F. Retroactive Logging** -- Allow editing past 7 days in `athlete_daily_log`

- On retroactive entry, trigger recalculation of consistency index
- Update heat map snapshots for affected dates
- Recalculate weekly load balance

**G. Abuse Protection** -- Flag in governance system

- 5+ sessions in one day: flag "volume_spike"
- 14 consecutive heavy sessions: flag "overload_risk"
- Frequent "voluntary_rest" (5+ in 14 days): internal flag for admin review

**H. Calendar UX** -- Update `CalendarDaySheet.tsx`

Add day-status selector at top of each day view:
```text
[ Complete Plan ] [ Light Work ] [ Take Rest Day ] [ Log Game ] [ Mark Missed ]
```
Single tap. Evening reminder if no input.

---

### Stream 3: Micro-Level Session Logging

**A. Expand drill definitions** in `src/data/baseball/drillDefinitions.ts` and `src/data/softball/drillDefinitions.ts`

Add missing practice types:
- `machine_bp` -- Machine Batting Practice (separate from live BP)
- `front_toss` -- Front Toss
- `flip_drill` -- Flips/Short Toss
- `tee_work` -- Tee Work (already exists as `tee_work`)
- `live_bp` -- Live BP (overhand)

**B. New data fields** for `DrillBlock` interface in `usePerformanceSession.ts`

Add optional fields:
```typescript
bp_distance_ft?: number;
machine_velocity_band?: string; // '40-50' | '50-60' | '60-70' | '70-80' | '80+'
batted_ball_type?: 'ground' | 'line' | 'fly' | 'barrel';
spin_direction?: 'topspin' | 'backspin' | 'sidespin';
swing_intent?: 'mechanical' | 'game_intent' | 'situational' | 'hr_derby';
goal_of_rep?: string;
actual_outcome?: string;
execution_score?: number; // 1-10 per rep
```

Fielding additions:
```typescript
throw_included?: boolean;
footwork_grade?: number; // 20-80
exchange_time_band?: 'fast' | 'average' | 'slow';
throw_accuracy?: number; // 20-80
throw_spin_quality?: 'carry' | 'tail' | 'cut' | 'neutral';
```

Pitching additions:
```typescript
velocity_band?: string;
spin_rate_band?: string;
spin_efficiency_pct?: number;
pitch_command_grade?: number; // 20-80
```

**C. Quick Log vs Advanced Log UI** -- `src/components/practice/PracticeSessionLogger.tsx`

- Quick Log (default): Type, drill, volume, grade slider = under 30 seconds
- Advanced toggle: reveals all micro fields above
- Smart defaults: pre-fill from last session of same type
- Last-session memory: store in localStorage per drill type

**D. Performance data stored in `drill_blocks` JSONB** -- no schema change needed, fields are already flexible JSONB

---

### Stream 4: Heat Map Architecture Expansion

**A. Upgrade to 5x5 grid option** -- `src/components/micro-layer/PitchLocationGrid.tsx`

- Add toggle: 3x3 (standard) vs 5x5 (advanced)
- 5x5 stores `{ row: 0-4, col: 0-4 }` -- backward compatible
- Gate 5x5 behind advanced data density level

**B. Practice vs Game separation** in nightly heat map computation

- Add `session_type` filter when computing heat map snapshots
- Store separate snapshots: `pitch_location_practice`, `pitch_location_game`
- Display tabs in analytics: "Practice" | "Game" | "Combined"

**C. Add missing heat map types** to nightly process

Currently computes 3: `pitch_location`, `swing_chase`, `barrel_zone`
Add: `throw_accuracy`, `miss_tendency`, `whiff_zone`, `error_location`, `command_heat`

**D. Blind zone detection** -- New utility

- Compare zone-level contact % against player's global average
- If any zone is 20%+ below average: flag as blind zone
- Feed into roadmap recommendations
- Store in `heat_map_snapshots` as `blind_zones: [{row, col, deficit_pct}]`

**E. Add `in_zone` field** to micro layer data capture for chase tracking accuracy

---

### Stream 5: Governance + Verified Stats Layer

**A. Admin verification dashboard** -- New page `src/pages/AdminVerification.tsx`

- Queue of pending `verified_stat_links` submissions
- Each entry shows: player name, link URL, claimed source, submitted date
- Admin actions: Approve (with confidence weight 0-100%), Reject (with reason), Request More Info
- Audit trail: all actions logged to `audit_log` table

**B. Database additions**

```sql
ALTER TABLE public.verified_stat_links
  ADD COLUMN IF NOT EXISTS admin_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS confidence_weight numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS rejection_reason text;
```

**C. Boost adjustment** -- Nightly MPI process uses `confidence_weight` to scale verified stat boost

Currently: flat boost per link type.
Change: `boost * (confidence_weight / 100)` so admin can reduce boost for uncertain links.

**D. Revocation** -- If admin rejects a previously approved link, boost is removed on next nightly run.

---

## File Change Summary

| File | Change Type |
|------|------------|
| `supabase/functions/nightly-mpi-process/index.ts` | Fix double penalty, fix HoF MLB-only, add consistency dampening, add confidence-weighted boosts |
| `src/hooks/useHoFEligibility.ts` | Fix to use MLB-only seasons for baseball |
| `src/data/hofRequirements.ts` | Add sport-aware season counting |
| `src/data/baseball/drillDefinitions.ts` | Add machine_bp, front_toss, flip_drill |
| `src/data/softball/drillDefinitions.ts` | Add equivalent softball drill types |
| `src/hooks/usePerformanceSession.ts` | Expand DrillBlock interface with micro fields |
| `src/components/micro-layer/PitchLocationGrid.tsx` | Add 5x5 grid option |
| `src/components/micro-layer/MicroLayerInput.tsx` | Add new fielding/pitching micro fields |
| `src/components/practice/PracticeSessionLogger.tsx` | Add Quick/Advanced toggle, smart defaults |
| `src/components/calendar/CalendarDaySheet.tsx` | Add day-status selector |
| `src/utils/consistencyIndex.ts` | New: consistency calculation |
| `src/utils/loadCalculation.ts` | Add rest-day CNS recalculation |
| `src/pages/AdminVerification.tsx` | New: admin verification dashboard |
| **DB Migration** | Create `athlete_daily_log`, alter `verified_stat_links`, attach coach override trigger |

## Implementation Priority

1. **Stream 1** first (MPI integrity) -- math fixes, low risk, high trust impact
2. **Stream 2** next (Rest engine) -- foundational, everything else depends on it
3. **Stream 3** then (Micro logging) -- depth layer, builds on existing architecture
4. **Stream 4** after (Heat maps) -- data quality improvement
5. **Stream 5** last (Governance) -- admin tooling, lower user-facing urgency

## What This Does NOT Change

- Existing Quick Log UX (preserved, only enhanced with optional advanced toggle)
- Database schema for `performance_sessions` (drill_blocks is already JSONB, new fields are additive)
- Existing tier multipliers, age curves, position weights
- Edge function architecture (calculate-load, detect-overlaps, suggest-adaptation remain)
- Folder/cycle system (recently rebuilt, working correctly)
- Sport separation logic (already enforced at schema level)
