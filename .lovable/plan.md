

# Integrated Full System Correction + Sport-Aware Velocity Bands

This plan merges the approved 13-block Full System Correction Spec with proper sport-separated velocity ranges. Baseball goes up to 110+. Softball gets league-equivalent bands matching its actual velocity ceiling (~75 mph elite).

---

## Velocity Band Definitions

### Baseball
**Machine velocity bands (hitting/machine BP):**
40-50, 50-60, 60-70, 70-80, 80-90, 90-100, 100-110, 110+

**Pitching velocity bands:**
<60, 60-70, 70-80, 80-90, 90-100, 100-110, 110+

### Softball
**Machine velocity bands (hitting/machine BP):**
30-35, 35-40, 40-45, 45-50, 50-55, 55-60, 60-65, 65-70, 70-75, 75+

**Pitching velocity bands:**
<40, 40-45, 45-50, 50-55, 55-60, 60-65, 65-70, 70-75, 75+

---

## Architecture Change: Sport-Aware Velocity Data

### New data files for velocity bands

**`src/data/baseball/velocityBands.ts`**
```typescript
export const baseballMachineVelocityBands = [
  { value: '40-50', label: '40-50' },
  { value: '50-60', label: '50-60' },
  { value: '60-70', label: '60-70' },
  { value: '70-80', label: '70-80' },
  { value: '80-90', label: '80-90' },
  { value: '90-100', label: '90-100' },
  { value: '100-110', label: '100-110' },
  { value: '110+', label: '110+' },
];

export const baseballPitchingVelocityBands = [
  { value: '<60', label: '<60' },
  { value: '60-70', label: '60-70' },
  { value: '70-80', label: '70-80' },
  { value: '80-90', label: '80-90' },
  { value: '90-100', label: '90-100' },
  { value: '100-110', label: '100-110' },
  { value: '110+', label: '110+' },
];
```

**`src/data/softball/velocityBands.ts`**
```typescript
export const softballMachineVelocityBands = [
  { value: '30-35', label: '30-35' },
  { value: '35-40', label: '35-40' },
  { value: '40-45', label: '40-45' },
  { value: '45-50', label: '45-50' },
  { value: '50-55', label: '50-55' },
  { value: '55-60', label: '55-60' },
  { value: '60-65', label: '60-65' },
  { value: '65-70', label: '65-70' },
  { value: '70-75', label: '70-75' },
  { value: '75+', label: '75+' },
];

export const softballPitchingVelocityBands = [
  { value: '<40', label: '<40' },
  { value: '40-45', label: '40-45' },
  { value: '45-50', label: '45-50' },
  { value: '50-55', label: '50-55' },
  { value: '55-60', label: '55-60' },
  { value: '60-65', label: '60-65' },
  { value: '65-70', label: '65-70' },
  { value: '70-75', label: '70-75' },
  { value: '75+', label: '75+' },
];
```

### Wire into `useSportConfig`

Add `machineVelocityBands` and `pitchingVelocityBands` to the hook's returned config object, selecting baseball or softball data based on sport context. This follows the existing pattern used for pitchTypes, drills, etc.

---

## File Changes (Merged with Full System Correction Spec)

### 1. `src/data/baseball/velocityBands.ts` -- NEW
Baseball machine + pitching velocity band definitions (8 and 7 bands respectively, up to 110+).

### 2. `src/data/softball/velocityBands.ts` -- NEW
Softball machine + pitching velocity band definitions (10 and 9 bands respectively, up to 75+).

### 3. `src/hooks/useSportConfig.ts` -- MODIFY
Import both velocity band files. Add `machineVelocityBands` and `pitchingVelocityBands` to the returned config object.

### 4. `src/components/practice/AdvancedRepFields.tsx` -- MODIFY
- Add `useSportConfig()` hook
- **Machine velocity section**: Replace hardcoded 5-option list with `machineVelocityBands` from sport config. Use 4-column grid layout.
- **Pitching velocity section**: Replace hardcoded 4-option list with `pitchingVelocityBands` from sport config. Use 4-column grid layout.
- **Batch Apply Mode** (Block 8): Add toggle + count input: "Apply to next X reps"
- **One-Tap Presets**: Add preset buttons ("Game BP", "Machine Drill", "Damage Mode")
- **BP Distance**: Replace `<Input type="number">` with `<Slider>` (range 30-450 ft baseball, 30-250 ft softball, step 10)

### 5. `src/components/micro-layer/PitchingMicroInput.tsx` -- MODIFY
- Already uses `useSportConfig()` for pitch types
- Replace hardcoded `velocityBands` constant with `pitchingVelocityBands` from `useSportConfig()`
- Renders dynamically based on sport

### 6. `supabase/functions/calculate-session/index.ts` -- MODIFY (Blocks 2, 3, 11, 12)
**Retroactive recalculation path** (Block 2): When `retroactive: true` + `date` is passed, query all sessions for that user on that date and recalculate each.

**Micro field wiring** (Block 3):
- `execution_score` blended into BQI at 30% weight
- `batted_ball_type` aggregated for barrel%, line drive%, hard contact%
- `machine_velocity_band` difficulty multiplier: bands are now sport-specific strings but the multiplier logic works by parsing the high end numerically (e.g. `110+` -> max tier, `75+` -> max tier for softball). Both sports' top bands get equivalent difficulty boost.
- `pitch_command_grade` blended into PEI at 40% weight
- `throw_accuracy` blended into FQI at 40% weight

**JSONB validation** (Block 11): No hardcoded valid band lists. Instead, validate that velocity band strings match the pattern `\d+-\d+` or `\d+\+` or `<\d+`. Rejects arbitrary strings without needing sport-specific enums in the edge function.

**Machine BP intelligence** (Block 12): BP distance trend + high-velocity success rate computation. "High velocity" defined as top-2 bands for either sport (baseball: 100-110, 110+; softball: 70-75, 75+).

### 7. `supabase/functions/nightly-mpi-process/index.ts` -- MODIFY (Blocks 1, 4, 9, 10, 13)
**Block 1**: Add `session_type` to heat map query select. Reject records with missing session_type.

**Block 4**: Graduated overload dampening (14d=0.90, 21d=0.85, 28d=0.80). Also check `cns_load_actual` average over 7 days.

**Block 9**: Game sessions weighted 1.5x in composite averages.

**Block 10**: Roadmap micro-metric gates: `min_barrel_pct`, `max_blind_zones`, `velocity_band_mastery`, `zone_power_minimum`. Freeze roadmap during overload.

**Block 13**: 4 new heat map types. `velocity_performance` map: high-velocity success is sport-relative (top-2 bands per sport, not hardcoded baseball numbers).

### 8. Database Migrations (Blocks 5, 6, 7)

**Block 5 -- Verified stat immutability trigger**: Prevent URL/profile_type changes after `admin_verified = true`. Prevent deletion of admin-verified profiles.

**Block 6 -- Coach override write-back trigger**: `AFTER INSERT ON coach_grade_overrides` -> updates `performance_sessions.coach_grade`, sets `coach_override_applied = true`. Add two columns to `performance_sessions`: `coach_override_applied boolean DEFAULT false`, `coach_override_id uuid`.

**Block 7 -- Dead field cleanup**:
- DROP `consistency_impact` and `momentum_impact` from `athlete_daily_log` (never written, never read)
- Keep `cns_load_actual` (now wired to overload detection in Block 4)
- Keep `rest_reason` (wire to analytics)
- Keep `injury_body_region` and `injury_expected_days` (wire to DayStatusSelector UI for injury metadata)

### 9. `src/components/calendar/DayStatusSelector.tsx` -- MODIFY (Block 7b)
When user selects `injury_hold`, show optional body region picker (dropdown: arm, shoulder, elbow, back, knee, ankle, hip, hand/wrist, head, other) and expected days input (slider 1-90). Write to `injury_body_region` and `injury_expected_days` on `athlete_daily_log`.

### 10. `src/components/practice/RepScorer.tsx` -- MODIFY (Block 8)
- Accept `batchCount` and `batchMode` from AdvancedRepFields
- When batch mode on and rep committed, auto-duplicate rep with same advanced fields for `batchCount` repetitions
- Reduces 10-rep advanced session from 130+ taps to ~20 taps

---

## Execution Order

| Step | Description | Dependencies |
|------|-------------|-------------|
| 1 | Create velocity band data files (baseball + softball) | None |
| 2 | Wire velocity bands into `useSportConfig` | Step 1 |
| 3 | Update `AdvancedRepFields` with sport-aware bands + batch mode + presets + slider for BP distance | Steps 1-2 |
| 4 | Update `PitchingMicroInput` with sport-aware bands | Steps 1-2 |
| 5 | Database migrations (immutability trigger, coach write-back, dead field cleanup) | None |
| 6 | Fix heat map `session_type` select + new map types (sport-aware velocity logic) | None |
| 7 | Wire micro fields into `calculate-session` composites + retroactive path + validation | None |
| 8 | Overload dampening + CNS read + game weighting in nightly MPI | None |
| 9 | Roadmap micro-metric gates + overload freeze | Steps 7-8 |
| 10 | Wire injury metadata in DayStatusSelector | Step 5 |
| 11 | Batch apply mode in RepScorer | Step 3 |
| 12 | Deploy both edge functions | Steps 6-9 |

Steps 1-2 are sequential. Steps 3-4 depend on 1-2 but are parallel to each other. Steps 5-8 are all independent and parallel. Steps 9-11 have noted dependencies. Step 12 is final.

---

## Post-Correction Velocity Summary

| Context | Baseball | Softball |
|---------|----------|----------|
| Machine BP bands | 40-50 through 110+ (8 bands) | 30-35 through 75+ (10 bands) |
| Pitching velocity bands | <60 through 110+ (7 bands) | <40 through 75+ (9 bands) |
| "High velocity" for difficulty multiplier | 100-110, 110+ | 70-75, 75+ |
| BP distance slider range | 30-450 ft | 30-250 ft |
| Difficulty boost ceiling | +15% at top bands | +15% at top bands (equivalent weighting) |

Both sports receive equivalent analytical treatment at their respective velocity ceilings. No cross-sport data mixing. All velocity UI is driven by `useSportConfig()` -- zero hardcoded bands remain in components.
