

# Fix Hitting Rep Logger: ABS Guess + Swing Decision

## Problem
1. **ABS Guess** is not available for hitting reps at all — there's only a comment placeholder. It needs to be visible in both Quick Log and Advanced modes as an **optional** field.
2. **Swing Decision** only has "Correct / Incorrect" — needs real baseball options: Best A-Swing, Swung, Good Take, Chased, Bunt
3. **Swing Intent** and **Approach Quality** are unnecessary and should be removed

## Changes — File: `src/components/practice/RepScorer.tsx`

### 1. Add ABS Guess grid for hitting (always visible, optional)
- **After** the tee depth grid (line ~881) and **before** the `mode === 'advanced'` block (line 883), insert an ABS Guess `PitchLocationGrid` labeled "ABS Guess (Optional)" — visible in both Quick Log and Advanced modes
- **Line 338**: Change `needsAbsGuess` to `false` so it never blocks rep confirmation

### 2. Replace Swing Decision options
- **Lines 1328-1337** (pitcher hitter outcome details): Replace `correct`/`incorrect` with:
  - `best_a_swing` → "Best A-Swing"
  - `swung` → "Swung"
  - `good_take` → "Good Take"
  - `chased` → "Chased"
  - `bunt` → "Bunt"
- Use `cols={3}` for the 5-option grid
- Also add a Swing Decision selector in the **hitting advanced** section (inside lines 936-1082) with the same options

### 3. Remove Swing Intent and Approach Quality
- **Delete lines 992-1005** (Swing Intent block)
- **Delete lines 1039-1050** (Approach Quality block)

### 4. Clean up
- Remove the dangling comment on line 896 ("ABS Guess moved to advanced block below")

## Summary
One file, four changes: ABS Guess becomes always-visible + optional for hitting, Swing Decision gets proper baseball options in both hitting and pitching advanced sections, and two unused fields are removed.

