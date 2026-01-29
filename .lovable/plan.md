

# Fix Plan: Force AI Violation Detection Accuracy

## Problem Identified

The database shows the most recent analysis returned:
```
violations: {
  back_leg_not_facing_target: false,
  shoulders_not_aligned: false,
  early_shoulder_rotation: false,
  ...all false
}
efficiency_score: 85
score_adjusted: false
```

**The AI is incorrectly reporting violations as `false`** even when:
- The video clearly shows back hip/leg NOT facing target at landing
- The video clearly shows shoulders NOT aligned with target
- The AI's own feedback text MENTIONS these issues

The programmatic score cap enforcement is working correctly, but it depends on the AI truthfully reporting violations - which it is not doing.

---

## Root Cause

The AI model has a tendency to:
1. Notice mechanical issues in the detailed feedback
2. But then mark violation flags as `false` to avoid triggering score caps
3. This defeats the purpose of programmatic enforcement

---

## Solution: Dual-Layer Violation Detection

### Strategy 1: Feedback Text Scanning (Failsafe)

After parsing the AI response, scan the feedback text for keywords that indicate violations. If found, FORCE the violation flag to `true` regardless of what the AI reported.

```typescript
// Keyword patterns that indicate violations
const VIOLATION_KEYWORDS = {
  back_leg_not_facing_target: [
    "back leg not facing",
    "back hip not facing",
    "back foot not facing",
    "back leg still rotating",
    "back hip still rotating",
    "hips haven't reached",
    "hips have not reached",
    "hip not inline",
    "hip not in line",
    "back leg isn't facing",
    "back hip isn't facing"
  ],
  shoulders_not_aligned: [
    "shoulders not aligned",
    "shoulders not in line",
    "shoulder alignment",
    "front shoulder not",
    "shoulders aren't aligned",
    "shoulder-target",
    "misaligned shoulder",
    "shoulder misalignment"
  ],
  early_shoulder_rotation: [
    "shoulder rotation before",
    "shoulders rotate before",
    "early shoulder rotation",
    "rotating before landing",
    "shoulders rotating early",
    "premature shoulder rotation"
  ]
};

// Scan feedback for violation keywords
function detectViolationsFromFeedback(feedback: string): Record<string, boolean> {
  const lowerFeedback = feedback.toLowerCase();
  const detected: Record<string, boolean> = {};
  
  for (const [violation, keywords] of Object.entries(VIOLATION_KEYWORDS)) {
    detected[violation] = keywords.some(kw => lowerFeedback.includes(kw));
  }
  
  return detected;
}

// Override AI-reported violations with feedback-detected violations
const feedbackViolations = detectViolationsFromFeedback(feedback);
for (const [key, detected] of Object.entries(feedbackViolations)) {
  if (detected && !violations[key]) {
    console.log(`[VIOLATION OVERRIDE] Detected "${key}" in feedback but AI reported false - forcing TRUE`);
    violations[key] = true;
  }
}
```

### Strategy 2: Enhanced Prompt Instructions

Make the prompt even more explicit about what constitutes each violation, with specific visual cues:

```text
CRITICAL - VIOLATION DETECTION INSTRUCTIONS:

⚠️ back_leg_not_facing_target = TRUE if ANY of these are visible at front foot landing:
- Back foot is still rotating/pointing backward
- Back knee is not facing the target
- Back hip has not fully rotated toward target
- If the back foot continues to rotate AFTER front foot lands, this is TRUE

⚠️ shoulders_not_aligned = TRUE if at the moment of front foot landing:
- Drawing a line from throwing shoulder through front shoulder does NOT point at target
- Shoulders are rotated open or closed relative to target line
- Front shoulder is pointing away from direct target line

⚠️ early_shoulder_rotation = TRUE if:
- Any shoulder rotation begins BEFORE the front foot is fully planted
- Shoulders start opening while front foot is still in the air or just touching

TIMING IS EVERYTHING:
The moment of evaluation is EXACTLY when the front foot first contacts the ground.
At that exact frame, check:
1. Is back leg (foot/knee/hip) fully rotated toward target? If NO → back_leg_not_facing_target = true
2. Are shoulders aligned with target? If NO → shoulders_not_aligned = true
3. Have shoulders already started rotating? If YES → early_shoulder_rotation = true

DO NOT GIVE PARTIAL CREDIT. If it's not perfect at landing, mark it TRUE.
```

### Strategy 3: Stricter Default Assumption

Change the scoring logic to be more conservative - if the AI gives a score above 70 but reports zero violations, that's suspicious and should trigger additional scrutiny:

```typescript
// If AI reports high score (>75) with zero violations, apply skepticism penalty
if (efficiency_score > 75 && violationCount === 0) {
  // Check if feedback mentions ANY issues at all
  const feedbackMentionsIssues = feedbackViolations.back_leg_not_facing_target || 
                                  feedbackViolations.shoulders_not_aligned ||
                                  feedbackViolations.early_shoulder_rotation;
  
  if (feedbackMentionsIssues) {
    console.log(`[SKEPTICISM CHECK] High score (${efficiency_score}) with zero violations but feedback mentions issues - capping at 75`);
    efficiency_score = Math.min(efficiency_score, 75);
    scoreWasAdjusted = true;
  }
}
```

---

## Files to Modify

1. **`supabase/functions/analyze-video/index.ts`**
   - Add `VIOLATION_KEYWORDS` constant with keyword patterns
   - Add `detectViolationsFromFeedback()` function
   - Add violation override logic after parsing AI response
   - Add skepticism check for high scores with zero violations
   - Update baseball pitching prompt with enhanced violation detection instructions

2. **`supabase/functions/analyze-realtime-playback/index.ts`**
   - Apply same dual-layer detection pattern
   - Scale appropriately for 1-10 scoring

---

## Implementation Details

### Keyword Detection Function

```typescript
const VIOLATION_KEYWORDS: Record<string, string[]> = {
  back_leg_not_facing_target: [
    "back leg not facing", "back hip not facing", "back foot not facing",
    "back leg still rotating", "back hip still rotating", "hips haven't reached",
    "hips have not reached", "hip not inline", "hip not in line",
    "back leg isn't facing", "back hip isn't facing", "back leg continues",
    "back foot continues", "hip rotation incomplete", "hip hasn't reached"
  ],
  shoulders_not_aligned: [
    "shoulders not aligned", "shoulders not in line", "shoulder alignment off",
    "front shoulder not", "shoulders aren't aligned", "shoulder-target misalignment",
    "misaligned shoulder", "shoulder misalignment", "shoulders off target",
    "shoulder line", "shoulder alignment issue"
  ],
  early_shoulder_rotation: [
    "shoulder rotation before", "shoulders rotate before", "early shoulder rotation",
    "rotating before landing", "shoulders rotating early", "premature shoulder rotation",
    "shoulders open before", "shoulder rotation begins before"
  ]
};

function detectViolationsFromFeedback(feedback: string): Record<string, boolean> {
  const lowerFeedback = feedback.toLowerCase();
  const detected: Record<string, boolean> = {};
  
  for (const [violation, keywords] of Object.entries(VIOLATION_KEYWORDS)) {
    detected[violation] = keywords.some(keyword => lowerFeedback.includes(keyword));
    if (detected[violation]) {
      console.log(`[FEEDBACK SCAN] Detected "${violation}" via keyword match in feedback`);
    }
  }
  
  return detected;
}
```

### Integration Point (after parsing AI response)

```typescript
// ============ FEEDBACK-BASED VIOLATION OVERRIDE ============
const feedbackViolations = detectViolationsFromFeedback(feedback);

for (const [key, detected] of Object.entries(feedbackViolations)) {
  if (detected && !violations[key]) {
    console.log(`[VIOLATION OVERRIDE] "${key}" detected in feedback but AI reported false - FORCING TRUE`);
    violations[key] = true;
  }
}

// Recount violations after override
violationCount = 0;
if (violations.early_shoulder_rotation) violationCount++;
if (violations.shoulders_not_aligned) violationCount++;
if (violations.back_leg_not_facing_target) violationCount++;
if (violations.hands_pass_elbow_early) violationCount++;
if (violations.front_shoulder_opens_early) violationCount++;

console.log(`[VIOLATIONS] After feedback override: ${JSON.stringify(violations)}, count: ${violationCount}`);
// ============ END FEEDBACK-BASED VIOLATION OVERRIDE ============
```

---

## Expected Outcome

With this implementation:

1. **The example video WILL score 60 or below**
   - Feedback mentions back leg issues → `back_leg_not_facing_target` forced to `true`
   - Feedback mentions shoulder alignment → `shoulders_not_aligned` forced to `true`
   - Two violations → Capped at 60

2. **AI cannot "game" the system**
   - Even if AI marks violations as `false`, feedback text scanning catches them
   - Cross-validation between violation flags and feedback text

3. **Transparency maintained**
   - Logs show when overrides occur
   - `violations_detected` in ai_analysis reflects final (corrected) values

4. **Your reference image defines the standard**
   - The MLB pitcher example with hip/shoulder alignment at landing = 85+ worthy
   - The uploaded video with incomplete hip rotation at landing = 55-65 range

