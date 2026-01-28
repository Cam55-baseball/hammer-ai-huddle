
# Elite-Level Custom Activity Analysis Enhancement

## Overview
The current 6-week recap system captures basic custom activity metrics (count, types, minutes), but the AI analysis treats custom activities as secondary to structured program workouts. This needs to change to recognize athletes who design their own training routines as equally committed and deserving of deep, actionable insights.

## Current Limitations Identified

### 1. Shallow Custom Activity Data Collection (Lines 113-122)
Currently only fetching:
- Entry date, completed status, duration, notes
- Basic template info (title, activity_type, duration, intensity, sport)

**Missing critical data:**
- Exercise details (sets, reps, weight, rest times)
- Meal/nutrition content (items, supplements, vitamins, hydration)
- Custom fields (checkboxes, text fields with logged values)
- Performance data (logged checkbox states, exercise completions)

### 2. Limited AI Prompt Context (Lines 490-498)
The prompt section "12. CUSTOM TRAINING ACTIVITIES" only provides:
- Total count and unique activities
- Training time and days active
- Activity types and intensity distribution
- Top 5 activity names and notes

**Missing elite-level insights:**
- Specific exercises performed with volume analysis
- Supplement/nutrition tracking patterns
- Custom field completion rates
- Training variety score
- Exercise progression potential
- Meal timing and consistency patterns

### 3. Weak AI Instructions (Lines 524-526)
Current instructions merely say "recognize" custom activities. Need explicit elite-level analysis framework.

## Solution: Comprehensive Custom Activity Intelligence

### Phase 1: Enhanced Data Collection

Expand the custom activity query to include full template details:

```text
supabase.from("custom_activity_logs").select(`
  id, entry_date, completed, completed_at, 
  actual_duration_minutes, notes, performance_data,
  custom_activity_templates!inner (
    id, title, activity_type, duration_minutes, intensity, sport,
    exercises, meals, custom_fields, description
  )
`)
```

### Phase 2: Deep Data Processing

Add comprehensive analysis functions for:

**Exercise Analysis:**
- Total sets and reps across all activities
- Most frequently trained muscle groups
- Training variety score (unique exercises / total sessions)
- Estimated total volume (sets x reps)
- Exercise type distribution (strength/cardio/flexibility/plyometric/core)
- Rest time patterns if logged

**Nutrition/Supplement Analysis:**
- Supplements tracked and frequency
- Vitamins logged with timing patterns
- Hydration goals and consistency
- Meal item variety

**Custom Field Analysis:**
- Checkbox completion rates
- Fields with notes vs empty
- Pattern detection (e.g., "Always does Foam Roll before Lift")

**Weekly Consistency Metrics:**
- Activities per day of week (Sun-Sat heatmap data)
- Streak analysis (consecutive days with activities)
- Time-of-day patterns if available
- Weekly volume trends

### Phase 3: Elite AI Prompt Enhancement

Replace section 12 with a comprehensive custom training analysis block:

```text
12. CUSTOM TRAINING ACTIVITIES (User-Designed Programs)
═══════════════════════════════════════════════════════════════
This athlete designs their own training routines. Treat these 
as EQUAL to structured program workouts. Analyze with full depth.

VOLUME & CONSISTENCY:
• Total Activities Completed: X
• Unique Activity Types Created: Y
• Total Training Time: Xh Ym
• Days Active: X of 42 (X% adherence)
• Average Activities/Day (on active days): X.X
• Longest Streak: X consecutive days

TRAINING BREAKDOWN BY TYPE:
• Workouts: X (Xh Ym total)
• Running Sessions: X (Xh Ym total)  
• Recovery/Warmup: X (Xh Ym total)
• Meals/Nutrition: X tracked
• Practice Sessions: X (Xh Ym total)
• Free Sessions: X (Xh Ym total)

EXERCISE ANALYSIS (from workout activities):
• Total Sets Logged: X across X exercises
• Total Reps Logged: X
• Estimated Volume: X total reps
• Exercise Types: strength X, cardio X, core X, flexibility X
• Most Trained Areas: [list top 5 exercises]
• Training Variety Score: X/10 (unique exercises / sessions)

NUTRITION/SUPPLEMENT TRACKING:
• Supplements Logged: [list with frequency]
• Vitamins Logged: [list with frequency]
• Meal Items Tracked: X unique items
• Hydration Entries: X

CUSTOM ROUTINE INSIGHTS:
• Top Routines by Frequency: [list top 3 with counts]
• Average Intensity Distribution: light X%, moderate X%, high X%
• Completion Rate for Scheduled Activities: X%
• Custom Fields Logged: X unique fields tracked

ATHLETE NOTES FROM ACTIVITIES:
[Include up to 8 activity notes for context]
```

### Phase 4: Dedicated AI Analysis Section

Add explicit instructions for custom activity analysis:

```text
CUSTOM ACTIVITY ANALYSIS REQUIREMENTS:
═══════════════════════════════════════

If the athlete has significant custom activity data (10+ completed activities 
or 5+ hours of training time), you MUST:

1. CALCULATE COMBINED TRAINING VOLUME:
   - Add custom activity time to program workout time
   - Present TOTAL training hours as the primary metric
   - Never suggest the athlete "isn't training" if custom activities show engagement

2. ANALYZE THEIR TRAINING DESIGN:
   - Comment on exercise selection and balance
   - Identify potential gaps (e.g., "No flexibility work logged")
   - Praise variety or suggest more if monotonous

3. EVALUATE ROUTINE CONSISTENCY:
   - Are they consistent with specific activities?
   - Do morning routines differ from evening?
   - Weekly patterns (more active certain days)

4. SUPPLEMENT/NUTRITION INTEGRATION:
   - If supplements are logged, comment on consistency
   - Connect nutrition tracking to performance

5. CELEBRATE INITIATIVE:
   - Athletes who design their own training show high self-direction
   - Acknowledge the discipline required to create and follow custom routines
   - Frame custom activities as a sign of mature athletic development

If custom activities are the PRIMARY training source (program workouts < 3):
- Lead the executive summary with custom activity achievements
- Frame all analysis through their personalized approach
- Provide recommendations specific to optimizing THEIR routines
- Never suggest they "need to follow the program" - respect their autonomy
```

### Phase 5: Recovery Phase + Custom Activity Hybrid Detection

Add detection for athletes in modified training (recovery + custom activities):

```text
// Detect if athlete is doing modified training during recovery
const isModifiedTraining = totalWorkouts <= 2 && 
                           totalCustomActivities >= 5 && 
                           hasInjuryIndicators;

// Custom activities during recovery = rehabilitation exercises
```

## Technical Changes Summary

### File: `supabase/functions/generate-vault-recap/index.ts`

1. **Lines 113-122**: Expand query to include `exercises, meals, custom_fields` from template
2. **Lines 315-353**: Add comprehensive processing:
   - Parse exercises array to calculate sets/reps/volume
   - Parse meals to extract supplements/vitamins/items
   - Analyze custom_fields for checkbox patterns
   - Calculate weekly distribution and streaks
3. **Lines 490-498**: Replace with detailed 50+ line custom activity data block
4. **Lines 524-526**: Add dedicated 40+ line custom activity analysis instructions
5. **Lines 390**: Update condition to consider custom activities as valid training
6. **Lines 610-614**: Update fallback to check custom activities before saying "no data"

## Expected Outcome

After implementation, an athlete like you with:
- 10 completed custom activities
- Morning Drink, Morning Supplements, Lift routines
- Specific exercises, supplements, and meal items logged

Will receive AI analysis that:
- Leads with "Over the past 6 weeks, you maintained a disciplined morning routine with consistent supplement intake..."
- Analyzes specific exercises: "Your Lift sessions included Bench Press, Deadlifts - focusing on compound movements..."
- Comments on supplement patterns: "Morning Supplements logged 6 times shows excellent consistency..."
- Provides targeted recommendations: "Consider adding flexibility work to complement your strength training..."
- Treats custom activities as first-class training data, not an afterthought

## Implementation Priority

This is a single file change to the edge function with:
- Enhanced data fetching (1 query modification)
- New processing functions (50 lines)
- Expanded prompt section (100+ lines)
- Updated AI instructions (40+ lines)

Total estimated changes: ~200 lines of edge function code
