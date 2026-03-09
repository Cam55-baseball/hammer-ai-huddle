

# Baseball Pick-Off Trainer (Manual) — Implementation Plan

## Overview

Build a manual pick-off decision trainer for baseball pitchers. Mirrors the Softball Stealing Trainer architecture (same rep system, signal flow, session save pattern) but simplified: no timing inputs, only correct/incorrect decision logging. Includes a 14-second randomized signal window with distraction flashes.

## New Files

### 1. `src/components/pickoff-trainer/PickoffSetup.tsx`
Setup screen with:
- **Base Target**: 1st / 2nd / 3rd (dropdown)
- **Who Is Covering**: Dynamic options based on base (1B: `1B`, `P`; 2B: `SS`, `2B`; 3B: `3B`, `SS`)
- Instructions card explaining signal colors (Green=Pitch, Red=Pick-Off, Blue/Yellow/Purple=distraction)
- "Begin Session" button

### 2. `src/components/pickoff-trainer/PickoffRepRunner.tsx`
Rep flow (state machine: `idle → countdown → signal_window → real_signal → decision`):
1. **Idle**: Rep # badge, "Start Rep" button, "Save Session & Exit" if reps > 0
2. **Countdown**: 10→0 timer
3. **Signal Window**: 14-second window. 1-2 fake flashes (Blue/Yellow/Purple, ~1s each) at random times, then real signal at random point in remaining window
4. **Real Signal**: Green (Pitch) or Red (Pick-Off) — tap "Continue"
5. **Decision**: "Did you make the correct decision?" → Correct / Incorrect
6. Rep complete → back to idle. Delete Rep discards.

No data entry fields (no timing, no stopwatch). Only decision logging.

### 3. `src/components/pickoff-trainer/PickoffSummary.tsx`
Pre-save summary:
- Total Reps, Correct count, Incorrect count
- Decision Accuracy %
- Pick-Off Accuracy (correct when Red appeared)
- Pitch Commitment Accuracy (correct when Green appeared)
- Rep-by-rep list with signal + result
- "Save Session" button

### 4. `src/components/pickoff-trainer/PickoffAnalysis.tsx`
Post-save analytics cards:
1. **Decision Accuracy** — overall %
2. **Pick-Off vs Pitch Breakdown** — accuracy split by signal type
3. **Decision Consistency** — accuracy trend across reps (e.g., "dropped after rep 12")
4. **Base Target Comparison** — if multiple sessions exist, compare accuracy by base
5. **Key Insight** — auto-generated text (e.g., "Hesitation on pick-off signals", "Accuracy drops after 10+ reps")

### 5. `src/pages/PickoffTrainer.tsx`
Page orchestrator: `setup → live_rep → summary → analysis`
- Sport guard: redirect if not baseball
- Auth guard: redirect if not logged in
- Saves via `usePerformanceSession` with `session_type: 'pickoff_training'`, `module: 'pitching'`, `sport: 'baseball'`
- Micro layer per rep: `{ base_target, covering_position, final_signal, decision_correct, rep_timestamp }`
- Drill block: type `pickoff_training`, intent `decision`

## Existing Files to Edit

### `src/App.tsx`
- Add lazy import for `PickoffTrainer`
- Add route: `<Route path="/pickoff-trainer" element={<PickoffTrainer />} />`

### `src/components/AppSidebar.tsx`
- In the **Complete Pitcher** section (line ~188-193), add to `subModules`:
  ```
  ...(selectedSport === 'baseball' ? [{ title: 'Pick-Off Trainer', url: '/pickoff-trainer', icon: Target, description: 'Pick-off decision training' }] : [])
  ```
- In the **Golden 2Way** section (line ~222-232), add the same baseball-only entry to `subModules`

## Data Storage

No new tables. Uses existing `performance_sessions` with:
- `session_type: 'pickoff_training'`
- `module: 'pitching'`
- `sport: 'baseball'`
- `drill_blocks[0]`: `{ drill_type: 'pickoff_training', intent: 'decision', volume: repCount, execution_grade: accuracyScore }`
- `micro_layer_data`: array of rep objects

## Signal Randomization

The 14-second signal window works as follows:
1. Window starts after 10s countdown
2. 1-2 fake signals flash at random intervals (each ~1s display)
3. Real signal appears at a random point in the remaining window (minimum 1s after last fake)
4. ~55% Pitch (Green), ~45% Pick-Off (Red) distribution
5. Real signal stays until user taps "Continue"

## Analytics Engine

Pure client-side calculations (no edge function needed):
- `calcDecisionAccuracy(reps)` — correct / total
- `calcPickoffAccuracy(reps)` — correct when signal was Red
- `calcPitchAccuracy(reps)` — correct when signal was Green
- `calcConsistencyTrend(reps)` — rolling 3-rep accuracy window, detect dropoff
- `generateInsight(reps)` — auto-generated coaching text based on patterns

