

# Make Goal of Rep & Actual Outcome Per-Rep

## Problem
Currently these fields use session-level state (`sessionGoalOfRep` / `sessionActualOutcome`) shared across all reps. They should be per-rep — each rep gets its own goal and outcome, stored on the `ScoredRep` object.

## Key Observation
`ScoredRep` already has `goal_of_rep` and `actual_outcome` fields (lines 78-79). They're just not wired up.

## Changes

### 1. `src/components/practice/RepScorer.tsx`
- **Remove** the four external props (`goalOfRep`, `onGoalOfRepChange`, `actualOutcome`, `onActualOutcomeChange`) from the interface
- Wire the two `AITextBoxField` components to the internal `current` state via `updateField`:
  - `value={current.goal_of_rep ?? ''}` / `onChange={(v) => updateField('goal_of_rep', v)}`
  - `value={current.actual_outcome ?? ''}` / `onChange={(v) => updateField('actual_outcome', v)}`
- Remove the conditional rendering (`{onGoalOfRepChange && ...}`) — always show them
- The fields will automatically be included in `commitRep` via the `...current` spread and cleared on reset

### 2. `src/pages/PracticeHub.tsx`
- Remove `sessionGoalOfRep` / `sessionActualOutcome` state variables and all references (setState calls, reset calls, passing as props to RepScorer)
- Remove the `session_goal_of_rep` / `session_actual_outcome` from the session metadata object — the data now lives on each rep
- Remove unused `AITextBoxField` import if still present

### 3. `src/components/practice/VideoRepLogger.tsx`
- Remove goal/outcome props if they were added (from the earlier plan); no longer needed since RepScorer handles it internally

### 4. `src/components/practice/VideoRepReview.tsx`
- No changes needed — its RepScorer will automatically get the per-rep fields

## Result
Each rep independently captures its own goal and outcome. Values clear after each "Confirm Rep" along with the other per-rep fields. The data is stored directly on the `ScoredRep` object for downstream analysis.

