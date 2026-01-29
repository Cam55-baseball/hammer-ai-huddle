

# Fix Plan: Enforce Score Caps Programmatically

## Problem

The AI correctly identifies mechanical violations in the feedback but does NOT reliably enforce score caps. Example:
- AI feedback says: "back leg is still not fully facing the target at landing"
- AI returns score: 85
- Should be capped at: 75 (per the scoring framework)

The scoring rules are in the prompt, but the AI model ignores them. We need a programmatic fail-safe.

## Solution

Add structured violation detection with mandatory score cap enforcement in code.

### Phase 1: Add Violation Flags to Tool Schema

Update the tool calling schema to require the AI to explicitly report critical violations:

```text
violations: {
  type: "object",
  description: "Report ALL critical violations detected in the mechanics",
  properties: {
    early_shoulder_rotation: {
      type: "boolean",
      description: "TRUE if shoulders rotate BEFORE front foot lands"
    },
    shoulders_not_aligned: {
      type: "boolean",
      description: "TRUE if shoulders NOT aligned with target at landing"
    },
    back_leg_not_facing_target: {
      type: "boolean",
      description: "TRUE if back hip/leg NOT facing target at landing"
    },
    hands_pass_elbow_early: {
      type: "boolean",
      description: "TRUE if hands pass back elbow before shoulders rotate (hitting only)"
    },
    front_shoulder_opens_early: {
      type: "boolean",
      description: "TRUE if front shoulder opens/pulls early (hitting only)"
    }
  },
  required: [
    "early_shoulder_rotation",
    "shoulders_not_aligned",
    "back_leg_not_facing_target"
  ]
}
```

### Phase 2: Add Post-Processing Score Enforcement

After parsing the AI response, apply mandatory score caps based on violation flags:

```typescript
// Parse violations and enforce score caps
const violations = analysisArgs.violations || {};
let cappedScore = efficiency_score;
let violationCount = 0;

// Count violations
if (violations.early_shoulder_rotation) violationCount++;
if (violations.shoulders_not_aligned) violationCount++;
if (violations.back_leg_not_facing_target) violationCount++;
if (violations.hands_pass_elbow_early) violationCount++;
if (violations.front_shoulder_opens_early) violationCount++;

// Apply score caps - MULTIPLE VIOLATIONS FIRST (most restrictive)
if (violationCount >= 2) {
  cappedScore = Math.min(cappedScore, 60);
  console.log(`Multiple critical violations (${violationCount}) - capping score at 60`);
}
// Individual violation caps
else if (violations.early_shoulder_rotation) {
  cappedScore = Math.min(cappedScore, 70);
  console.log("Early shoulder rotation detected - capping score at 70");
}
else if (violations.hands_pass_elbow_early) {
  cappedScore = Math.min(cappedScore, 70);
  console.log("Hands pass elbow early - capping score at 70");
}
else if (violations.shoulders_not_aligned) {
  cappedScore = Math.min(cappedScore, 75);
  console.log("Shoulders not aligned - capping score at 75");
}
else if (violations.back_leg_not_facing_target) {
  cappedScore = Math.min(cappedScore, 75);
  console.log("Back leg not facing target - capping score at 75");
}
else if (violations.front_shoulder_opens_early) {
  cappedScore = Math.min(cappedScore, 75);
  console.log("Front shoulder opens early - capping score at 75");
}

// Log if score was adjusted
if (cappedScore !== efficiency_score) {
  console.log(`Score adjusted from ${efficiency_score} to ${cappedScore} due to violations`);
}

efficiency_score = cappedScore;
```

### Phase 3: Add Violation Reporting to AI Analysis

Store the violations in the ai_analysis object for transparency:

```typescript
const ai_analysis = {
  summary,
  feedback,
  positives,
  drills,
  scorecard,
  violations_detected: violations, // NEW: Track what was flagged
  score_adjusted: cappedScore !== originalScore, // NEW: Flag if we adjusted
  original_ai_score: originalScore, // NEW: For debugging/transparency
  model_used: "google/gemini-2.5-flash",
  analyzed_at: new Date().toISOString(),
};
```

### Phase 4: Update Prompt to Emphasize Violation Reporting

Add explicit instruction to the prompt that violations MUST be reported truthfully:

```text
CRITICAL - VIOLATION REPORTING:
You MUST honestly report ALL violations in the 'violations' object.
- If back leg is not facing target → set back_leg_not_facing_target: true
- If shoulders not aligned → set shoulders_not_aligned: true
- The system will enforce score caps based on your violation report
- DO NOT set violations to false if they are present - this defeats the purpose

Be HONEST in violation detection. Your violation flags directly determine the score cap.
```

## Files to Modify

1. **`supabase/functions/analyze-video/index.ts`**
   - Add violations to tool schema (properties and required)
   - Add post-processing score enforcement logic
   - Store violations in ai_analysis
   - Update prompts to emphasize violation reporting

2. **`supabase/functions/analyze-realtime-playback/index.ts`**
   - Apply same violation detection and enforcement pattern
   - Scaled to 1-10 scoring range

## Score Cap Rules (Reference)

| Violation | Max Score |
|-----------|-----------|
| Early shoulder rotation (before foot lands) | 70 |
| Hands pass back elbow before shoulders rotate | 70 |
| Shoulders not aligned with target at landing | 75 |
| Back hip/leg not facing target at landing | 75 |
| Front shoulder opens/pulls early | 75 |
| TWO OR MORE critical violations | 60 |

## Expected Outcome

With this implementation:

1. **The example video WILL score 55-65**
   - AI reports: `back_leg_not_facing_target: true` and `shoulders_not_aligned: true`
   - Code detects 2 violations → caps score at 60
   - Even if AI returns 85, code enforces the cap

2. **Transparency maintained**
   - `violations_detected` shows what was flagged
   - `original_ai_score` vs `efficiency_score` shows adjustment
   - Logs track all cap applications

3. **Fail-safe enforcement**
   - AI cannot inflate scores past violation caps
   - Code is the final arbiter, not AI discretion

