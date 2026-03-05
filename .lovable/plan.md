

# Move "Goal of Rep" & "Actual Outcome" Above Confirm Rep Button

## Problem
The "Goal of Rep" and "Actual Outcome" text fields currently sit outside the RepScorer component, in the session-level section of PracticeHub.tsx. Users expect them directly above the "Confirm Rep" button inside the rep logging flow.

## Changes

### 1. `src/components/practice/RepScorer.tsx`
- Accept two new props: `goalOfRep`, `onGoalOfRepChange`, `actualOutcome`, `onActualOutcomeChange`
- Render two `AITextBoxField` components for "Goal of Rep" and "Actual Outcome" immediately above the `{/* CONFIRM REP */}` section (before line 1495)
- Keep them optional (minChars=0, required=false) matching current behavior

### 2. `src/pages/PracticeHub.tsx`
- Remove the "Session AI Fields" block (lines 376-393) containing the two `AITextBoxField` components
- Pass `sessionGoalOfRep`, `setSessionGoalOfRep`, `sessionActualOutcome`, `setSessionActualOutcome` as props to the `RepScorer` component

## Result
Both fields appear directly above the Confirm Rep button in every session type, keeping them visible in the rep-logging flow rather than buried in a separate section below.

