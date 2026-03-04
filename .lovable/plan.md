

# Hitting Session & Practice Hub Fixes

## Changes

### 1. Expand Solo Work hitting sources (`RepSourceSelector.tsx`)
The `VALID_HITTING_SOURCES.solo_work` array currently only allows `['tee', 'soft_toss', 'machine_bp']`. Update to include all thrown and live sources:
```
solo_work: ['tee', 'soft_toss', 'machine_bp', 'front_toss', 'flip', 'coach_pitch', 'live_bp', 'regular_bp']
```

### 2. Restore pitch location for Tee reps (`RepScorer.tsx`)
Currently lines 613-633 show an either/or: Tee shows `TeeDepthGrid` only, non-Tee shows `PitchLocationGrid`. Fix: when rep source is Tee, show **both** the `TeeDepthGrid` AND the `PitchLocationGrid` (the 5×5 grid) so users can log pitch location alongside tee depth.

### 3. Remove sleep question from readiness (`FeelingsPrompt.tsx`)
- Remove the entire `ReadinessRow` block for "How did you sleep last night?" (lines 97-102)
- Remove `sleepOptions` array (lines 33-39)
- Remove `sleep` from the `FeelingState` interface
- Update all references to `FeelingState.sleep` (initialization in `PracticeHub.tsx` where `feelings` state is created with `sleep: 3`)

### 4. Remove duplicate opponent fields in Game sessions (`PracticeHub.tsx`)
Lines 275-286 render `GameSessionFields` in Step 3 (Configure Session) **before** `SessionConfigPanel` — but `SessionConfigPanel` also renders its own `GameSessionFields` at line 192-198. Remove the outer one in `PracticeHub.tsx` (lines 275-286) to eliminate the duplication.

| File | Change |
|------|--------|
| `src/components/practice/RepSourceSelector.tsx` | Add thrown + live sources to `solo_work` |
| `src/components/practice/RepScorer.tsx` | Show PitchLocationGrid alongside TeeDepthGrid for Tee |
| `src/components/practice/FeelingsPrompt.tsx` | Remove sleep question + `sleep` from interface |
| `src/pages/PracticeHub.tsx` | Remove duplicate GameSessionFields, update FeelingState init |

