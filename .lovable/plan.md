

# Corrected Plan: Fix Shoulder Position Formula for Throwing & Baseball Pitching

## Understanding the Correct Mechanics

Based on your clarification, here's the CORRECT formula for baseball pitching and all throwing:

**At the moment of foot landing (before rotation begins):**

| Body Part | Correct Position | What This Means |
|-----------|------------------|-----------------|
| **Shoulders** | LATERAL to home plate (sideways) | Glove-side shoulder points at target, throwing shoulder faces away |
| **Hips** | Forward-facing toward home plate | Hips are squared up, ready to rotate |
| **Chest** | NOT facing home plate | Chest faces third base (RHP) or first base (LHP) |
| **Upper body** | Resisted - no rotation yet | Stay closed until foot plants |

**The key insight:** "Shoulders in line with target" means the shoulder LINE points at the target (like an arrow), NOT that the chest faces the target. The chest should be SIDEWAYS at landing.

## Current Problem

The current formula says:
- "Shoulders IN LINE WITH TARGET at landing" (line 384)
- Kid-friendly translation: "Your chest wasn't pointing at home plate" (line 535)

This is being interpreted as "chest should face home plate at landing" - which is **WRONG**. If the chest already faces home plate when the foot lands, the shoulders have ALREADY rotated (which is the early rotation violation).

## Files to Update

| File | Changes |
|------|---------|
| `supabase/functions/analyze-video/index.ts` | Fix baseball pitching + throwing prompts |
| `supabase/functions/analyze-realtime-playback/index.ts` | Fix baseball pitching + throwing prompts |

**Note:** Softball pitching will NOT be changed (per your instruction).

## Detailed Changes

### Change 1: Rewrite Shoulder Position Requirement (Baseball Pitching)

**Current (WRONG):**
```
3. Shoulders → IN LINE WITH TARGET (pitcher-catcher alignment) ⭐⭐
...
SHOULDER-TARGET ALIGNMENT REQUIREMENT:
- Shoulders MUST be in line with target at the moment of landing
- Think: draw a line from throwing shoulder through front shoulder to catcher
```

**Corrected:**
```
3. Shoulders → LATERAL TO TARGET (sideways, glove shoulder points at catcher) ⭐⭐
4. Hips → FORWARD-FACING toward home plate (squared up) ⭐
5. Chest → NOT facing home plate (stay closed) ⭐⭐

SHOULDER POSITION REQUIREMENT AT LANDING:
- Shoulders MUST be SIDEWAYS (lateral) at foot landing
- Glove-side shoulder POINTS at the catcher
- Throwing shoulder faces AWAY from catcher (toward second base)
- Chest does NOT face home plate yet - it faces third base (RHP) or first base (LHP)
- Hips are forward/squared to home plate, creating the separation

WHY THIS MATTERS:
- This "separation" between closed shoulders and open hips creates rotational power
- If chest already faces home plate at landing → shoulders have ALREADY rotated → EARLY ROTATION
- Resist upper body rotation until foot plants → maximize velocity, accuracy, and arm health
```

### Change 2: Remove "shoulders_not_aligned" Violation

This violation is being triggered incorrectly and conflicts with the early rotation check. If the chest ISN'T facing home plate, that's actually CORRECT. 

**Solution:** Replace "shoulders_not_aligned" with a new check: "shoulders_already_rotated" or simply merge it with "early_shoulder_rotation" since they describe the same problem from different angles.

### Change 3: Fix Kid-Friendly Language (Baseball Pitching & Throwing)

**Current (WRONG):**
```
Instead of: "Shoulders not aligned with target at landing"
Say: "When your front foot touched down, your chest wasn't pointing at home plate - aim your belly button at the catcher"
```

**Corrected:**
```
CORRECT POSITION AT LANDING:
- Your chest should NOT face home plate yet when your foot lands
- Your glove shoulder (front shoulder) should point at home plate like an arrow
- Your hips should face home plate, but your shoulders stay sideways
- After your foot lands, THEN your shoulders can turn

WHAT TO SAY IF SHOULDERS ROTATED TOO EARLY:
"Your chest was already facing home plate when your foot landed - stay sideways longer, 
let your front shoulder point at the catcher, and only turn your chest AFTER your foot plants"
```

### Change 4: Update Violation Keyword Detection

**Remove these misleading keywords from "shoulders_not_aligned":**
- "chest wasn't pointing"
- "not aligned with target"
- "shoulders not aligned"

**Add new detection for the ACTUAL problem:**
```javascript
early_shoulder_rotation: [
  // existing keywords...
  "chest already facing", "chest was facing", "shoulders already turned",
  "shoulders were open", "upper body rotated early", "chest facing home plate at landing"
]
```

### Change 5: Update Violation Detection Logic

**Current problem:** 3 violations detected → score capped at 55
- `shoulders_not_aligned: true` (wrongly flagged because chest isn't facing home plate)
- `back_leg_not_facing_target: true`
- `early_shoulder_rotation: true`

**Fix:** Remove "shoulders_not_aligned" as a separate violation for baseball pitching and throwing. Merge the concept into early_shoulder_rotation since:
- If shoulders are "not aligned" (chest facing home plate) at landing → that IS early rotation
- If shoulders are correctly lateral → no violation

### Change 6: Update the Throwing Module Prompt

Apply the same corrections to the throwing prompt:
- Shoulders LATERAL at landing (glove shoulder points at target)
- Hips forward-facing
- Chest does NOT face target until AFTER foot plants
- Upper body resists rotation until ground contact

## Summary of Mechanical Formula

### Correct Position at Foot Landing (Baseball Pitching + All Throwing)

```text
+------------------+--------------------------------------------+
| HIPS             | Forward-facing toward home plate           |
| CHEST            | Sideways (NOT facing home plate yet)       |
| GLOVE SHOULDER   | Points at home plate like an arrow         |
| THROWING SHOULDER| Faces away from home plate                 |
| BACK LEG         | Knee/hip pointing toward home plate        |
+------------------+--------------------------------------------+

Timeline:
1. Stride toward home plate
2. Front foot LANDS → Hips squared, shoulders STILL sideways (closed)
3. THEN shoulders rotate (chest turns to face home plate)
4. Arm follows shoulder rotation
5. Release
```

### What Constitutes Early Shoulder Rotation

If ANY of these are true at foot landing, it's early rotation:
- Chest is already facing home plate
- Glove shoulder has moved past pointing at target
- Upper body has started turning before foot contact

## Expected Outcomes After Fix

| Issue | Resolution |
|-------|------------|
| Contradicting feedback | Eliminated - one clear concept: "stay sideways until foot lands" |
| "Chest wasn't pointing" confusion | Removed - this was wrong advice |
| Everyone getting 55 | Fixed - false "shoulders_not_aligned" violations won't trigger |
| Violation keyword false positives | Fixed - updated detection keywords |
| Consistent with your formula | Yes - lateral shoulders, forward hips, resist upper body |

## Modules NOT Changed (Per Your Request)

- **Softball pitching** - No changes (different mechanics with arm circle)
- **Hitting** - No changes (different mechanics)

