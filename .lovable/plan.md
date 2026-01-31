

# Fix Plan: Remove Pitching-Style Alignment Language from Hitting Feedback

## Problem Summary

The AI is still generating pitching-style feedback for hitters, specifically in the Key Findings bullets:
- "Your back hip isn't pointing to the pitcher when you land"
- "Your shoulders are not aimed correctly when you land"

This happens because:
1. The AI prompts still allow `shoulders_not_aligned` to be flagged for hitting modules
2. The hitting prompt doesn't explicitly forbid mentioning "back hip pointing/facing" or "shoulders aligned" concepts
3. The AI is generating pitching/throwing-style alignment feedback even though we excluded the violations from score capping

**The actual correct mechanics for hitting:**
- Front foot lands and stabilizes first
- Back hip rotates toward target AFTER foot plants (not at landing)
- Shoulders stay closed (timing issue), but don't need to be "aligned with target" at landing
- Focus should be on TIMING ("too early") not DIRECTION ("not pointed at")

## Root Cause Analysis

Looking at the database results, hitting analyses are returning:
```
summary: [
  "Your back hip isn't pointing to the pitcher when you land.",
  "Your shoulders are not aimed correctly when you land."
]
violations: { back_leg_not_facing_target: false, shoulders_not_aligned: true }
```

The issue is in TWO places:

| Issue | Location | Problem |
|-------|----------|---------|
| AI still checking shoulders_not_aligned for hitting | Both edge functions | The violation schema includes it, and the AI generates alignment-focused feedback |
| Kid-friendly language uses "aim" and "pointing" | System prompts | The AI translates issues into pitching-style language |

## Files to Update

| File | Changes |
|------|---------|
| `supabase/functions/analyze-video/index.ts` | Update hitting prompt to forbid alignment language, exclude shoulders_not_aligned |
| `supabase/functions/analyze-realtime-playback/index.ts` | Same changes for real-time analysis |

## Detailed Changes

### Change 1: Update Violation Schema for Hitting (Both Functions)

**Current:** `shoulders_not_aligned` is in the schema (just not required for hitting)  
**Fix:** For hitting, update description to say "For HITTING: Always set FALSE - focus on TIMING not alignment"

```typescript
shoulders_not_aligned: {
  type: "boolean",
  description: module === 'hitting'
    ? "For HITTING: Always set FALSE - hitting does not use shoulder-target alignment checks. Focus on early rotation TIMING instead."
    : "TRUE if shoulders NOT aligned with target at moment of landing (pitching/throwing only)"
}
```

### Change 2: Add Explicit "DO NOT SAY" Rules for Hitting Prompts

Add to the hitting prompt in both functions:

```
LANGUAGE RULES FOR HITTING (DO NOT VIOLATE):

DO NOT say or reference:
- "back hip isn't pointing to the pitcher" - WRONG FOR HITTING
- "back hip not facing the target" - WRONG FOR HITTING
- "shoulders are not aimed correctly" - WRONG FOR HITTING
- "shoulders not aligned with target" - WRONG FOR HITTING
- Any language about hip/shoulder DIRECTION at landing

CORRECT language for hitting timing issues:
- "Your shoulders started turning too early" (timing)
- "Your shoulders rotated before your foot landed" (sequence)
- "Keep your shoulders closed until your foot plants" (instruction)
- "Your back hip opened up too soon" (if truly premature - timing)

For hitting, the ONLY landing checks are:
1. Is the front foot planted before rotation begins? (timing)
2. Are shoulders still closed at landing? (timing)
3. Is there excessive lateral head movement? (stability)

Do NOT check:
- Whether back hip is "facing/pointing at" the pitcher at landing
- Whether shoulders are "aligned with" or "aimed at" the target at landing
```

### Change 3: Update Alignment Checks Instruction (analyze-video/index.ts)

Current hitting alignment checks instruction (lines 1199-1235) mentions "BACK HIP CHECK" which the AI is interpreting as needing to evaluate direction.

**Update to emphasize:**
- Back hip rotation happens AFTER landing (do not evaluate its direction at landing)
- Remove any language about "facing target" or "pointing at pitcher"
- Focus only on TIMING violations (early rotation)

### Change 4: Update detectViolationsFromFeedback to Skip Hitting Keywords

Currently the keyword detector scans for "back hip not facing", etc. For hitting specifically, we should also skip `shoulders_not_aligned` keyword detection since hitting doesn't use shoulder alignment checks.

```typescript
// Skip shoulders_not_aligned for hitting - this check doesn't apply
if (violation === 'shoulders_not_aligned' && module === 'hitting') {
  detected[violation] = false;
  continue;
}
```

### Change 5: Update Summary/Bullet Generation Examples for Hitting

Remove any examples that mention alignment-style feedback for hitting. Add explicit examples of correct hitting feedback:

```
HITTING SUMMARY EXAMPLES (use these patterns):
- "Land your front foot before turning - this creates power"
- "Your shoulders started rotating too early - wait for your foot to plant"
- "Keep your head steady - don't drift toward the pitcher"
- "Your hands moved before your shoulders turned"
- "Great sequence - foot lands, then hips, then shoulders"

DO NOT USE these patterns for hitting:
- "Your back hip isn't pointing to the pitcher when you land" (WRONG)
- "Your shoulders are not aimed correctly when you land" (WRONG)
```

## Score Capping Updates

Currently the code already excludes `shoulders_not_aligned` and `back_leg_not_facing_target` from score capping for hitting modules. This is correct. The issue is that the AI is still GENERATING this feedback even though it doesn't affect the score.

## Expected Outcomes

| Issue | Resolution |
|-------|------------|
| "back hip isn't pointing to the pitcher" bullets | Eliminated - prompt forbids this language |
| "shoulders are not aimed correctly" bullets | Eliminated - shoulders_not_aligned disabled for hitting |
| AI generating alignment feedback for hitting | Fixed - explicit DO NOT SAY rules added |
| Score still capped incorrectly | Already fixed in previous changes |

## Summary of Formula Changes

### For HITTING (Baseball & Softball):

**At landing, ONLY check:**
1. Is front foot planted? (pass/fail)
2. Have shoulders already started rotating? (timing - early rotation)
3. Is head moving laterally toward pitcher? (stability)

**Do NOT check or mention:**
- Back hip direction/pointing/facing at landing
- Shoulder alignment with target at landing
- Any "aimed at" or "in line with" language

**Correct feedback language:**
- Timing-focused ("too early", "before foot landed")
- NOT direction-focused ("not pointing at", "not aimed at")

