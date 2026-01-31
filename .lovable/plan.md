
# Fix Plan: Correct Hitting Mechanics - Back Hip Rotates AFTER Landing

## Problem Summary

The current analysis is telling hitters their back hip should be facing the target at foot landing. This is **incorrect** for hitting.

**Current (Wrong for Hitting):**
- Back hip/leg must face target at landing
- If not facing target at landing → violation flagged

**Correct for Hitting:**
1. Front foot lands and stabilizes first
2. THEN back hip rotates toward the target (AFTER landing)
3. Shoulders stay closed as long as possible
4. Having back hip already facing target at landing usually indicates excessive lateral head movement toward the pitcher

## Root Cause

Two issues in the edge functions:

| Issue | Location | Problem |
|-------|----------|---------|
| Shared multimodal check | `analyze-video/index.ts` lines 1199-1203 | "BACK LEG CHECK" is applied to ALL modules including hitting |
| Violation schema | Both edge functions | `back_leg_not_facing_target` is required for all modules |

The "back leg facing target at landing" check is correct for **pitching and throwing** (where it's part of proper hip-shoulder separation), but **wrong for hitting**.

## Correct Hitting Mechanics

```text
+------------------+------------------------------------------------+
| FRONT FOOT       | Lands FIRST, stabilizes before any rotation    |
| BACK HIP (at     | NOT facing target yet - still loaded           |
| landing)         |                                                |
| BACK HIP (after  | Rotates toward target AFTER foot plants        |
| landing)         |                                                |
| SHOULDERS        | Stay closed as long as possible                |
| HEAD             | Minimal lateral movement toward pitcher        |
+------------------+------------------------------------------------+

Timeline for Hitting:
1. Load phase (weight back)
2. Stride toward pitcher
3. Front foot LANDS & STABILIZES
4. THEN back hip rotates toward target
5. Torso rotates
6. Shoulders rotate
7. Hands/bat release
```

## Files to Update

| File | Changes |
|------|---------|
| `supabase/functions/analyze-video/index.ts` | Conditionally apply back leg check only for pitching/throwing, NOT hitting |
| `supabase/functions/analyze-realtime-playback/index.ts` | Same - exclude back leg check from hitting |

## Detailed Changes

### Change 1: Update Multimodal Instructions (analyze-video/index.ts)

**Current block (lines 1197-1212) applies to ALL modules:**
```
⭐⭐⭐ CRITICAL LANDING ALIGNMENT CHECKS:
1. BACK LEG CHECK: Is the back leg (foot, knee, AND hip) ALL facing the target?
   ...
   → If ANY of these are NOT fully facing target at landing → back_leg_not_facing_target = TRUE
```

**Fix:** Make this conditional based on module:
- For `pitching` and `throwing`: Keep the back leg check
- For `hitting`: Remove back leg check, add hitting-specific checks instead

### Change 2: Update Violation Schema (Both Functions)

Make `back_leg_not_facing_target` NOT required for hitting module:
- For pitching/throwing: Keep it required
- For hitting: Remove from required array, or set to always false

### Change 3: Update Hitting Prompt to Clarify Hip Timing

Add explicit instruction that for hitting:
- Back hip rotation happens AFTER front foot landing
- Back hip should NOT be facing target when foot lands
- Back hip facing target at landing = likely has excessive lateral head movement

### Change 4: Update Violation Keyword Detection

For hitting module specifically, don't scan for `back_leg_not_facing_target` keywords.

## Code Changes Summary

### In `analyze-video/index.ts`:

**Lines 1197-1218** - Make alignment checks conditional:
```typescript
// Add module-specific landing alignment instructions
let alignmentChecks = '';
if (module === 'hitting') {
  alignmentChecks = `
⭐⭐⭐ CRITICAL LANDING CHECKS (at EXACT frame of front foot landing):

1. FRONT FOOT CHECK: Is the front foot firmly planted and stable?
   → Front foot MUST be down before any rotation begins
   
2. BACK HIP CHECK: The back hip should NOT be facing the target yet at landing
   → Back hip rotates TOWARD target AFTER the foot lands
   → If back hip is already facing target at landing, this may indicate excessive lateral head movement
   
3. SHOULDER CHECK: Are shoulders still CLOSED (not rotating yet)?
   → Shoulders should NOT begin rotating until after foot plants
   → early_shoulder_rotation = TRUE if shoulders rotating at or before landing

4. HEAD STABILITY: Is head moving laterally toward the pitcher during swing?
   → Lateral head movement is a MAJOR contact disruptor
   → Often indicates rushed sequence timing`;
} else {
  // Pitching and throwing keep the existing checks
  alignmentChecks = `
⭐⭐⭐ CRITICAL LANDING ALIGNMENT CHECKS:
1. BACK LEG CHECK: Is the back leg (foot, knee, AND hip) ALL facing the target?
   ... (existing pitching/throwing checks) ...`;
}
```

**Violation schema** - Make back_leg_not_facing_target conditional:
```typescript
// For hitting, exclude back_leg_not_facing_target from required
required: module === 'hitting' 
  ? ['early_shoulder_rotation'] 
  : ['early_shoulder_rotation', 'shoulders_not_aligned', 'back_leg_not_facing_target']
```

### In `analyze-realtime-playback/index.ts`:

Apply the same conditional logic to exclude back leg check from hitting.

## Expected Outcomes

| Issue | Resolution |
|-------|------------|
| Hitters told back hip should face target at landing | Fixed - back hip rotates AFTER landing |
| False violations for hitting | Eliminated - back_leg_not_facing_target not checked for hitting |
| Lateral head movement | Emphasized as a hitting-specific check |
| Pitching/throwing mechanics | Unchanged - back leg check still applies |

## Modules Affected

| Module | Back Leg Check | Change |
|--------|----------------|--------|
| Hitting (baseball) | ❌ Removed | Back hip rotates AFTER landing |
| Hitting (softball) | ❌ Removed | Back hip rotates AFTER landing |
| Pitching (baseball) | ✅ Kept | Back leg facing target at landing |
| Pitching (softball) | ✅ Kept | Back leg facing target at landing |
| Throwing (all) | ✅ Kept | Back leg facing target at landing |
