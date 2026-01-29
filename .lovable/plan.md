
# Fix Plan: Tighten Softball Pitching Standards to Elite Professional Level

## Research Summary

Based on peer-reviewed biomechanics research (Friesen et al. 2025, Werner et al. 2006, Oliver et al.), elite softball windmill pitching has specific mechanical requirements that the current prompts partially address but need tightening:

### Key Elite Standards from Research

1. **Stride Foot Contact (SFC) is the Critical Checkpoint**
   - All mechanical assessments should be evaluated at this moment
   - The body lands in a closed kinetic chain position (both feet on ground)
   - This is when shoulder distraction forces peak (~100% body weight)

2. **Kinetic Chain Sequencing**
   - Energy flows proximal-to-distal: lower body → lumbopelvic-hip → trunk → arm
   - Disruptions in this sequence cause arm-dominant deliveries and injury risk
   - Early trunk rotation toward pitching arm side inhibits forward force generation

3. **Critical Position Requirements at SFC**
   - Trunk and pelvis rotated toward pitching arm side (but not excessively)
   - Stride foot angled 0-45° toward pitching arm side
   - Stride foot ON the power line (direct line from rubber to home plate)
   - Arm circle perpendicular to ground, close to body
   - Extended position (minimal trunk/hip/knee flexion collapse)

4. **Arm Circle Integrity**
   - Must remain in a straight path toward home plate
   - Should not cross body's midline (horizontal adduction)
   - Oblique arm path = power leak and shoulder stress

5. **Drive Leg Requirements**
   - Must stay close to power line during drag phase
   - Inside of big toe should touch ground during drag
   - Straying off power line = excessive trunk flexion and reduced rotation

---

## Current Gaps in Softball Pitching Prompts

The existing prompts are missing several elite-level checkpoints:

| Missing Element | Research Basis |
|-----------------|----------------|
| Stride foot angle (0-45° toward pitching arm) | Friesen et al. 2025 |
| Stride foot on power line | Friesen et al. 2025 |
| Drive leg close to power line during drag | Friesen et al. 2025 |
| Front side collapse detection | Friesen et al. 2025 |
| Arm circle path perpendicularity | Friesen et al. 2025 |
| Trunk lean/tilt assessment at SFC | Multiple studies |
| STRICT score caps matching pitching/throwing | User requirement |

---

## Changes Required

### 1. Update Score Caps in `analyze-video/index.ts` (Softball Pitching Prompt)

**Current (lines 594-598):**
```text
SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 70
- If shoulders NOT aligned with target at landing → MAX SCORE: 75
- If arm circle breaks or stalls → MAX SCORE: 75
- If TWO OR MORE critical violations → MAX SCORE: 60
```

**Updated:**
```text
SCORE CAPS (NON-NEGOTIABLE):
- If shoulders NOT aligned with target at landing → MAX SCORE: 60
- If early trunk rotation toward pitching arm side → MAX SCORE: 60  
- If arm circle breaks, stalls, or crosses midline → MAX SCORE: 60
- If front side collapse (excessive trunk/hip flexion at SFC) → MAX SCORE: 65
- If stride foot NOT on power line → MAX SCORE: 70
- If TWO OR MORE critical violations → MAX SCORE: 55
```

### 2. Add Elite Checkpoints to Softball Pitching Prompt

Add these research-backed mechanical checkpoints:

```text
ELITE SOFTBALL PITCHING CHECKPOINTS (AT STRIDE FOOT CONTACT):

⭐⭐⭐ CRITICAL - FEET BEFORE SHOULDERS ⭐⭐⭐
- Front foot FIRMLY PLANTED before any trunk/shoulder rotation begins
- This creates the stable base for kinetic chain energy transfer

⭐⭐ STRIDE POSITION REQUIREMENTS ⭐⭐
- Stride foot angle: 0-45° toward pitching arm side (not pointed at catcher)
- Stride foot ON the power line (imaginary line from rubber to home plate)
- Stride knee in neutral alignment (not collapsing inward/valgus)

⭐⭐ TRUNK AND PELVIS POSITION AT SFC ⭐⭐
- Pelvis and trunk should be rotated toward pitching arm side
- Trunk should remain relatively upright (minimal flexion/extension)
- NO excessive trunk lean or tilt in any direction
- Draw a vertical line from head through umbilicus - should be relatively straight

⭐ ARM CIRCLE PATH ⭐
- Arm circle perpendicular to ground throughout
- Arm should NOT cross body's midline (horizontal adduction)
- Keep arm close to power line - wide arm path = power leak
- Smooth, continuous circle without breaks or stalls

⭐ DRIVE LEG DURING DRAG ⭐
- Drive leg stays close to power line during drag phase
- Only inside of big toe should touch ground during drag
- Leg straying off power line = excessive trunk flexion

RED FLAGS TO IDENTIFY:
- ⚠️ CRITICAL: Trunk/shoulders rotate BEFORE front foot lands → MASSIVE POWER LEAK ⭐⭐⭐
- ⚠️ CRITICAL: Arm circle breaks, stalls, or crosses midline → POWER LEAK ⭐⭐
- ⚠️ Front side collapse (trunk/hip/knee flexion at SFC) → Energy leak
- ⚠️ Stride foot off power line → Directional issues
- ⚠️ Stride foot angle >45° or pointing at catcher → Hip rotation issues
- ⚠️ Drive leg strays far from power line → Trunk compensation
- ⚠️ Excessive trunk lean at SFC → Balance and control issues
- ⚠️ Stride knee valgus (collapsing inward) → Knee stress
```

### 3. Update Score Caps in `analyze-realtime-playback/index.ts` (Softball Pitching)

**Current (lines 453-457):**
```text
SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 7
- If shoulders NOT aligned with target at landing → MAX SCORE: 7.5
- If arm circle breaks or stalls → MAX SCORE: 7.5
- If TWO OR MORE critical violations → MAX SCORE: 6
```

**Updated (1-10 scale):**
```text
SCORE CAPS (NON-NEGOTIABLE):
- If shoulders NOT aligned with target at landing → MAX SCORE: 6
- If early trunk rotation toward pitching arm side → MAX SCORE: 6
- If arm circle breaks, stalls, or crosses midline → MAX SCORE: 6
- If front side collapse at SFC → MAX SCORE: 6.5
- If stride foot NOT on power line → MAX SCORE: 7
- If TWO OR MORE critical violations → MAX SCORE: 5.5
```

### 4. Add New Violation Flag for Softball

Add `arm_circle_compromised` as a tracked violation for softball pitching:

```typescript
// In violation detection for softball pitching
arm_circle_compromised: z.boolean().describe("True if arm circle breaks, stalls, or crosses midline")
```

---

## Files to Modify

1. **`supabase/functions/analyze-video/index.ts`**
   - Update softball pitching prompt (lines 515-674)
   - Tighten score caps to match pitching/throwing (max 60 for critical violations)
   - Add elite checkpoints from research
   - Add stride foot position and drive leg requirements

2. **`supabase/functions/analyze-realtime-playback/index.ts`**
   - Update softball pitching prompt (lines 376-492)
   - Tighten score caps to match (max 6 for critical violations on 1-10 scale)
   - Add matching elite checkpoints

---

## Summary of Elite Softball Pitching Standards

| Violation | Max Score (0-100) | Max Score (1-10) |
|-----------|-------------------|------------------|
| Shoulders not aligned with target at SFC | 60 | 6.0 |
| Early trunk/shoulder rotation before SFC | 60 | 6.0 |
| Arm circle breaks, stalls, or crosses midline | 60 | 6.0 |
| Front side collapse at SFC | 65 | 6.5 |
| Stride foot NOT on power line | 70 | 7.0 |
| Two or more critical violations | 55 | 5.5 |

---

## Expected Outcome

After implementation:

1. **Consistent elite standards** - Softball pitching matches the strictness of baseball pitching and throwing
2. **Research-backed checkpoints** - All mechanical assessments based on peer-reviewed biomechanics studies
3. **Injury prevention focus** - Flags the mechanical patterns linked to upper extremity pain and injury
4. **Accurate scoring** - Elite scores (85+) reserved only for near-perfect mechanics
5. **No false positives** - Clear, objective criteria for each checkpoint

---

## Technical Notes

- The programmatic score caps in lines 1281-1332 already apply to all modules
- The prompt updates ensure the AI detection aligns with the programmatic enforcement
- Softball-specific mechanics (windmill circle, release at hip) are preserved
- The kinetic chain sequencing principle is consistent with all throwing/pitching modules
