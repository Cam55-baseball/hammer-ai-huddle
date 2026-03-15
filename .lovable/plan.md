

# Practice Module Fixes & Enhancements

## Changes Overview

### 1. Remove Intent & Outcome from Bunting (`BuntRepFields.tsx`)
Remove the "Intent" and "Outcome" sections (lines 218-228) from the bunt rep form. The bunt type (Base Hit, Sacrifice, Squeeze) already captures intent, and Hit/Out already captures outcome.

### 2. Custom Pitch Type Input for All Sessions (`RepScorer.tsx`)
Add a "Custom" option to the pitch type selector in both **hitting** (line ~741) and **pitching** (line ~1065) sections. When selected, show a text input for the user to type a custom pitch name. Store as `custom_pitch_type` on `ScoredRep`. Also add the same in `BuntRepFields.tsx`.

### 3. Steal Home for Baseball Baserunning (`BaserunningRepFields.tsx`)
Add `{ value: 'steal_home', label: 'Steal Home' }` to `baseballDrills` array (line ~49, before `custom`). Softball already has it.

### 4. Bunt Option in Hitting Swing Decision (`RepScorer.tsx`)
In the hitting "Swing Decision" SelectGrid (line ~880), add `{ value: 'bunt', label: '🤲 Bunt' }` for both baseball and softball.

### 5. Bunt Option in Pitching Swing Result (`RepScorer.tsx`)
In the pitching "Swing Result" section (line ~1220, under `ctx.showLiveAbHitterFields`), add `{ value: 'bunt', label: 'Bunt' }` option to the live_ab_swing_result SelectGrid.

### 6. Bunting Rep Source = Hitting Rep Source (`RepSourceSelector.tsx`)
In the `RepSourceSelector` component (line ~238), add `module === 'bunting'` to the hitting branch so bunting uses the same grouped rep sources (Machine, Thrown, Live, Other) as hitting. Also in `SessionConfigPanel.tsx`, treat `isBunting` the same as `isHitting` for `showPitchDistance`, `showVelocityBand`, `showLeagueLevel`, etc.

### 7. Mound Distance: Text Input Instead of Band Selector (`SessionConfigPanel.tsx`)
Replace the dot-slider mound distance selector (lines 222-262) with a simple numeric text input. The input stores the same `pitch_distance_ft` value. League level selection still auto-fills the value. This applies to all sessions (baseball + softball, hitting + pitching + bunting).

### 8. Unique Bunting Icon (`PracticeHub.tsx`)
Replace `Target` icon for bunting with a distinct icon. Use `Hand` from lucide-react (represents the bunt grip/hand positioning) to differentiate from hitting's `Target`.

## Files to Edit

| File | Change |
|------|--------|
| `src/components/practice/BuntRepFields.tsx` | Remove Intent + Outcome sections, add custom pitch type option |
| `src/components/practice/RepScorer.tsx` | Add `custom_pitch_type` to ScoredRep, add custom pitch option to hitting/pitching pitch type selectors, add bunt to swing decision + swing result |
| `src/components/practice/BaserunningRepFields.tsx` | Add steal_home to baseball drills |
| `src/components/practice/RepSourceSelector.tsx` | Route `bunting` module to HITTING_SOURCES |
| `src/components/practice/SessionConfigPanel.tsx` | Treat bunting like hitting for config; replace mound distance dots with numeric input |
| `src/pages/PracticeHub.tsx` | Change bunting icon from Target to Hand |

