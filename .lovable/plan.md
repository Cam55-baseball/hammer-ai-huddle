
# Tightening Video Analysis Grading Standards

## Problem Statement

The video analysis system is producing inflated efficiency scores for mechanics that have clear fundamental flaws. The example shows:
- **Actual Score Given**: 85/100
- **Issues Present**: Back hip/leg not facing target at landing, front shoulder not aligned with target, arm swinging out and dragging
- **Expected Score**: Should be in the 55-65 range given these fundamental sequence violations

This is damaging customer trust across ALL analysis categories (hitting, pitching, throwing for both baseball and softball).

## Root Cause Analysis

The AI prompts contain the correct mechanical criteria and deduction rules, BUT:
1. **No explicit grading rubric** - The AI decides scores arbitrarily
2. **No baseline score anchor** - AI defaults to high scores and deducts, instead of building from a neutral baseline
3. **Positivity bias in instructions** - "Balance issues with strengths" and "encouraging" language may bias toward leniency
4. **Vague deduction instructions** - "up to 25 points" gives AI too much discretion
5. **Missing "mediocre baseline" anchor** - AI has no reference for what a 50-60 score looks like

## Solution: Professional-Grade Scoring Rubric

### Phase 1: Add Explicit Scoring Framework

Add a strict scoring rubric to ALL module prompts that establishes:

**Starting Point Philosophy:**
- Start from 50 (mediocre) and ADD points for correct mechanics
- Not: Start from 100 and deduct (current behavior)

**Scoring Bands:**
- 90-100: Elite mechanics, ALL fundamentals correct, minor polish needed
- 80-89: Advanced mechanics, ONE minor flaw, fundamentals sound
- 70-79: Good mechanics, 1-2 moderate issues OR 1 significant flaw
- 60-69: Developing mechanics, multiple moderate issues OR 1-2 major flaws
- 50-59: Foundational mechanics, several significant flaws requiring attention
- Below 50: Major fundamental breakdowns requiring complete rebuild

### Phase 2: Enforce Non-Negotiable Deductions

**Critical Violations (AUTOMATIC score caps):**

For Pitching/Throwing:
- Early shoulder rotation (before foot plants) → **Cannot score above 70**
- Shoulders not aligned with target at landing → **Cannot score above 75**
- Back hip/leg not facing target at landing → **Cannot score above 75**
- Multiple critical violations → **Cannot score above 60**

For Hitting:
- Early shoulder rotation (before foot plants) → **Cannot score above 70**
- Hands pass back elbow before shoulders rotate → **Cannot score above 70**
- Front shoulder opens early → **Cannot score above 75**
- Multiple critical violations → **Cannot score above 60**

### Phase 3: Remove Positivity Bias

Update prompt language:
- Remove: "Balance issues with strengths"
- Add: "Be honest and direct about mechanical flaws - sugar-coating hurts development"
- Remove: General encouragement language
- Add: "A score of 85+ requires near-perfect fundamental execution"

### Phase 4: Add Calibration Examples

Include explicit examples in the prompt:

**Example: What 85/100 looks like:**
- Front foot planted before ANY rotation ✓
- Shoulders perfectly aligned with target at landing ✓
- Back leg facing target at landing ✓
- Clean arm path with angle <90° ✓
- Minor timing refinement needed

**Example: What 60/100 looks like:**
- Front foot planted BUT shoulders already rotating ✗
- Shoulder alignment is off by 15+ degrees ✗
- Good arm path ✓
- Back leg facing target ✓

**Example: What the uploaded video should score (~60):**
- Front foot landing position acceptable ✓
- Back hip/leg NOT facing target ✗ (major issue)
- Shoulders NOT aligned with target ✗ (major issue)
- Arm dragging/swinging out ✗ (consequence of above)
- Result: 55-65 range due to TWO critical alignment failures

## Technical Implementation

### Files to Modify

1. **`supabase/functions/analyze-video/index.ts`**
   - Update `getSystemPrompt()` for all modules (hitting, pitching baseball, pitching softball, throwing)
   - Add scoring rubric section
   - Add score cap rules
   - Add calibration examples
   - Remove positivity bias language

2. **`supabase/functions/analyze-realtime-playback/index.ts`**
   - Apply same scoring framework changes
   - Ensure consistency between video upload and realtime analysis

### Prompt Changes (Baseball Pitching Example)

Add after RED FLAGS section:

```text
SCORING FRAMEWORK - PROFESSIONAL STANDARDS:

Base your efficiency score on THIS rubric:

STARTING POINT: Begin at 50 (mediocre baseline)
- ADD points for correct mechanics
- Scores above 80 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 70
- If shoulders NOT aligned with target at landing → MAX SCORE: 75
- If back hip/leg NOT facing target at landing → MAX SCORE: 75
- If TWO OR MORE critical violations → MAX SCORE: 60

SCORING BANDS:
- 90-100: Elite. ALL fundamentals correct. Minor refinements only.
- 80-89: Advanced. One minor flaw. All critical checkpoints pass.
- 70-79: Good. 1-2 moderate issues. Core sequence mostly correct.
- 60-69: Developing. Multiple issues OR 1-2 major sequence violations.
- 50-59: Foundational. Several significant mechanical flaws.
- Below 50: Major fundamental breakdowns.

CALIBRATION - What 85+ REQUIRES:
✓ Front foot FULLY planted before ANY shoulder rotation
✓ Shoulders PERFECTLY aligned with target at landing
✓ Back leg (foot, knee, hip) ALL facing target
✓ Glove open and facing target
✓ Arm angle under 90° at flip-up
✓ Clean sequencing through release

CALIBRATION - What 60 looks like:
✗ Front foot lands but shoulders already rotating
✗ Shoulder alignment off by 15+ degrees
✓ Some correct elements (arm path, follow-through)

BE DIRECT: Do not inflate scores to be encouraging. 
Accurate assessment is what helps players develop. 
A score of 65 with honest feedback is more valuable than 85 with false praise.
```

### Similar Changes for All Modules

Apply equivalent scoring frameworks to:
- Baseball hitting
- Softball hitting
- Softball pitching
- Baseball/softball throwing

Each with module-specific critical checkpoints and score caps.

## Expected Outcome

After implementation:
1. **The example video would score 55-65** instead of 85 (back leg not facing target + shoulders misaligned = two critical violations = max 60)
2. **Customers receive honest, actionable feedback** that helps them improve
3. **Score inflation eliminated** - 85+ reserved for genuinely elite mechanics
4. **Consistency across all modules** - same rigor applied to hitting, pitching, and throwing
5. **Professional reputation restored** - analysis matches what any qualified coach would assess
