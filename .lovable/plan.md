

# Mandatory Fields + Quick/Advanced Mode Enforcement

## Current State Analysis

**RepScorer.tsx** has a Quick/Advanced toggle but the split is only implemented for **hitting** (line 961 `mode === 'advanced'`). All other modules render all fields unconditionally. The Execution Number Line (lines 633-666) shows for ALL modules including fielding.

## Changes

### 1. `src/components/practice/RepScorer.tsx` — Validation + Quick/Advanced gating

**A. Validation additions (around line 357-373)**

Add mandatory checks to `canConfirm`:
- **Bunting**: `bunt_ball_state`, `bunt_direction`, `bunt_contact_quality` all required
- **Pitching**: `pitch_location` required (currently only `pitcher_spot_intent` is enforced)
- **Fielding**: `play_type` (batted ball type) and `catch_type` required; `fielding_result` required
- **Baserunning**: `drill_type` required (currently only validated when `custom`)

New validation variables:
```
const buntMandatoryValid = !isBunting || (!!current.bunt_ball_state && !!current.bunt_direction && !!current.bunt_contact_quality);
const pitchLocationValid = !isPitching || !!current.pitch_location;
const fieldingMandatoryValid = !isFielding || (!!current.play_type && !!current.catch_type && !!current.fielding_result);
const baserunningDrillValid = !isBaserunning || !!current.drill_type;
```

Add all four to `canConfirm` chain + error messages.

**B. Hide Execution Number Line for fielding (lines 633-666)**

Wrap the execution score number line in `{!isFielding && (...)}`. Fielding uses `fielding_result` (clean/error/assist) as its execution metric — no duplicate input.

For fielding, `execution_score` should NOT be required. Update the `canConfirm` to skip `execScore` check when `isFielding`:
```
const needsExecScore = !isFielding;
// in canConfirm: (!needsExecScore || (execScore != null && execScore >= 1))
```

**C. Fielding Quick/Advanced split (lines 1472-1961)**

Quick Log (always visible — mandatory):
- FieldingPositionSelector (already required)
- Batted Ball Type (`play_type`)
- Catch Type
- Fielding Result

Advanced only (wrap in `mode === 'advanced'`):
- Hit Type Hardness (Exit Velocity)
- Diving Play
- Route Efficiency
- Glove-to-Glove Time
- Throwing Velocity
- Play Probability
- Receiving Quality
- Play Direction + Play Type (infield)
- Outfield-specific fields (relay, wall play)
- Infield-specific fields (rep type, tag play, relay)
- Catcher defense fields
- FieldingThrowFields
- Footwork Grade
- Exchange Time
- Throw Spin Quality
- Field Position Diagram

**D. Pitching Quick/Advanced split (lines 1092-1469)**

Quick Log (always visible — mandatory):
- Pitch Type (already shown)
- Pitcher Spot Intent (already required)
- Pitch Location (now mandatory — show unconditionally, not gated behind intent)
- Result

Advanced only (wrap remaining):
- Hitter Side
- Velocity Band / Exact Velocity
- ABS Guess
- Contact Type
- Live AB fields
- Pitcher Hitter Outcomes
- Hit Spot
- Pitch Command
- In Zone
- Spin Direction

Wait — Pitcher Spot Intent is currently required and Pitch Location shows only after intent. Making pitch_location mandatory while intent gates it creates a dependency. Keep the existing flow (intent → location) but ensure both are in Quick Log. Both are already visible outside `mode === 'advanced'`, so this is correct.

**E. Bunting Quick/Advanced split (lines 1974-1977)**

Currently renders `<BuntRepFields>` unconditionally with ALL fields. Need to split:

Quick Log mandatory fields rendered inline in RepScorer:
- Ball State
- Bunt Direction  
- Contact Quality (bunt_contact_quality)

Advanced: render full `<BuntRepFields>` (which already contains these + execution score, pitch type, pitch location, ABS guess, defense result, hit/out, bunt type, runner location, spin type)

To avoid duplication, pass a `mode` prop to BuntRepFields and have it conditionally show fields.

**F. Baserunning Quick/Advanced split (lines 1964-1967)**

Quick Log: Drill Type only (mandatory).
Advanced: Full BaserunningRepFields.

Pass `mode` prop to BaserunningRepFields to control visibility.

### 2. `src/components/practice/BuntRepFields.tsx`

Add `mode?: 'quick' | 'advanced'` prop. When `mode === 'quick'`, show ONLY:
- Ball State
- Bunt Direction
- Contact Quality (bunt_contact_quality)

When `mode === 'advanced'` (or undefined for backward compat), show all fields.

### 3. `src/components/practice/BaserunningRepFields.tsx`

Add `mode?: 'quick' | 'advanced'` prop. When `mode === 'quick'`, show ONLY:
- Drill Type
- Custom drill description (when drill_type === 'custom')

When `mode === 'advanced'`, show all fields.

### 4. Error message updates (lines 2028-2042)

Add validation hints:
- `!buntMandatoryValid` → "Select ball state, direction, and contact quality"
- `!pitchLocationValid` → "Select pitch location"
- `!fieldingMandatoryValid` → "Select batted ball type, catch type, and fielding result"
- `!baserunningDrillValid` → "Select drill type"

## Files

| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | Add validation, hide exec number line for fielding, implement Quick/Advanced splits for fielding/pitching/bunting/baserunning |
| `src/components/practice/BuntRepFields.tsx` | Add `mode` prop, gate non-mandatory fields behind advanced |
| `src/components/practice/BaserunningRepFields.tsx` | Add `mode` prop, gate non-mandatory fields behind advanced |

## No DB Changes
All fields already exist in the `ScoredRep` interface and are stored in `drill_blocks` JSONB. No schema migration needed.

