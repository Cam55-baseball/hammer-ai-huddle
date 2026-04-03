

# Pitching ABS Guess Mandatory + Baserunning Drill Type to Session Setup + Remove Pitching Velocity Band

## Changes

### 1. `src/components/practice/RepScorer.tsx` — ABS Guess mandatory in Quick Log

**Current**: ABS Guess is gated behind `mode === 'advanced'` (line 1241) and only required when `pitch_location` is set.

**Fix**:
- Remove `mode === 'advanced' &&` from ABS Guess render condition (line 1241) — show in Quick Log
- Change validation: ABS Guess is mandatory for ALL pitching reps regardless of pitch_location. Update line 349-352:
  ```
  const needsAbsGuess = isPitching;
  const absGuessValid = !needsAbsGuess || !!current.abs_guess;
  ```
- This means ABS Guess shows always for pitching (not gated behind pitch_location existing), and blocks submission if missing

### 2. `src/components/practice/SessionConfigPanel.tsx` — Add Baserunning Drill Type + Remove Pitching Velocity Band

**A. Add `baserunning_drill_type` to `SessionConfig` interface** (line 25-44):
- Add `baserunning_drill_type?: string`

**B. Add drill type selector for baserunning** in the setup UI:
- When `isBaserunning`, show the drill type grid (reuse the same options from `BaserunningRepFields.tsx`: `home_to_1st`, `1st_to_3rd`, etc.)
- Make it mandatory: update `canConfirm` (line 167) to: `!!repSource && (!isBaserunning || !!baserunningDrillType)`
- Include custom drill description text field when `baserunningDrillType === 'custom'`

**C. Remove Velocity Band for pitching**:
- Change `showVelocityBand` (line 118) to exclude pitching: `(isHitting || isBunting) && !HIDES_VELOCITY.includes(repSource)`
- Velocity Band remains for hitting/bunting setup only

**D. Pass `baserunning_drill_type` in `onConfirm`** payload

### 3. `src/components/practice/RepScorer.tsx` — Baserunning: Remove per-rep drill_type requirement

**Current**: `baserunningDrillValid` (line 377) requires `current.drill_type` per rep, and `BaserunningRepFields` shows drill type in quick mode.

**Fix**:
- Remove `baserunningDrillValid` from `canConfirm` chain
- Auto-populate `drill_type` from `sessionConfig.baserunning_drill_type` in `commitRep` so every rep inherits the session-level value
- Remove the per-rep drill_type error message from validation hints

### 4. `src/components/practice/BaserunningRepFields.tsx` — Remove Drill Type from rep fields

- Remove the Drill Type `SelectGrid` from this component entirely (it's now session-level)
- Remove the custom drill description conditional that was tied to `value.drill_type === 'custom'`
- Keep all other fields (goal, jump grade, read grade, time to base, exact time, exact steps) as advanced-only

### 5. Error messages update (RepScorer line 2062-2081)

- Update ABS Guess error: ensure it shows for pitching without requiring pitch_location first
- Remove `baserunningDrillValid` error line
- Reorder as needed

## Files

| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | ABS Guess: remove advanced gate, make mandatory for pitching always. Baserunning: remove per-rep drill_type validation, auto-inherit from session config |
| `src/components/practice/SessionConfigPanel.tsx` | Add baserunning drill type selector (mandatory), remove velocity band for pitching, add `baserunning_drill_type` to SessionConfig |
| `src/components/practice/BaserunningRepFields.tsx` | Remove drill type selector and custom description from rep-level fields |

## No DB Changes
All data stored in `drill_blocks` JSONB. `baserunning_drill_type` will be stored at session config level and inherited per rep.

