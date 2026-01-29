

# Fix Plan: Apply Strict Alignment Caps to Throwing Analysis

## Current State

The programmatic score cap enforcement already applies to **all modules** (hitting, pitching, throwing). The code at lines 1281-1332 in `analyze-video/index.ts` enforces:
- Max 60 if `back_leg_not_facing_target` is true
- Max 60 if `shoulders_not_aligned` is true  
- Max 55 if both violations occur

**However**, the throwing-specific prompts still mention the old caps (75), which could confuse the AI into being less strict about detecting violations.

---

## Changes Required

### 1. Update Throwing Prompt in `analyze-video/index.ts` (Lines 763-767)

**Current:**
```text
SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE stride foot lands → MAX SCORE: 70
- If shoulders NOT aligned with target at landing → MAX SCORE: 75
- If back hip/leg NOT facing target at landing → MAX SCORE: 75
- If TWO OR MORE critical violations → MAX SCORE: 60
```

**Updated:**
```text
SCORE CAPS (NON-NEGOTIABLE):
- If shoulders NOT aligned with target at landing → MAX SCORE: 60
- If back hip/leg NOT facing target at landing → MAX SCORE: 60
- If TWO OR MORE critical violations → MAX SCORE: 55
- If shoulders rotate BEFORE stride foot lands → MAX SCORE: 65
```

Also update lines 807-809 to match:
```text
- **ALIGNMENT CHECK:** Flag if shoulders not aligned with target at landing (score CAPPED at 60)
- **BACK LEG CHECK:** Flag if back hip/leg not facing target at landing (score CAPPED at 60)
```

### 2. Update Throwing Prompt in `analyze-realtime-playback/index.ts` (Lines 579-583)

**Current:**
```text
SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE stride foot lands → MAX SCORE: 7
- If shoulders NOT aligned with target at landing → MAX SCORE: 7.5
- If back hip/leg NOT facing target at landing → MAX SCORE: 7.5
- If TWO OR MORE critical violations → MAX SCORE: 6
```

**Updated (1-10 scale):**
```text
SCORE CAPS (NON-NEGOTIABLE):
- If shoulders NOT aligned with target at landing → MAX SCORE: 6
- If back hip/leg NOT facing target at landing → MAX SCORE: 6
- If TWO OR MORE critical violations → MAX SCORE: 5.5
- If shoulders rotate BEFORE stride foot lands → MAX SCORE: 6.5
```

---

## Files to Modify

1. **`supabase/functions/analyze-video/index.ts`**
   - Update throwing prompt score caps (lines 763-767) to match stricter enforcement
   - Update throwing prompt flag descriptions (lines 807-809)

2. **`supabase/functions/analyze-realtime-playback/index.ts`**
   - Update throwing prompt score caps (lines 579-583) to match stricter enforcement

---

## Summary of Alignment Rule

**For pitching AND throwing (baseball & softball):**

| Violation | Max Score |
|-----------|-----------|
| Shoulders NOT aligned with target at landing | 60 (6/10) |
| Back leg NOT facing target at landing | 60 (6/10) |
| Both alignment violations | 55 (5.5/10) |
| Early shoulder rotation | 65 (6.5/10) |

This ensures the same strict mechanical standards apply whether the player is pitching or throwing.

---

## Expected Outcome

After these updates:
- Throwing videos with back leg not facing target at landing will be capped at 60
- Throwing videos with shoulders not aligned at landing will be capped at 60
- The AI prompts will match the programmatic enforcement, reducing confusion
- Consistent scoring standards across pitching and throwing for both baseball and softball

