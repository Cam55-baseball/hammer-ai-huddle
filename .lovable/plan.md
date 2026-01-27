

# Add Custom Activity Data to 6-Week Recaps

## Overview

Currently, the 6-week recap system only analyzes Hammers Modality program workouts (stored in `vault_workout_notes`). Users who primarily use custom activities instead of the built-in programs are getting incomplete recaps that don't reflect their actual training.

This enhancement will integrate custom activity data into the AI analysis, ensuring athletes who create their own workouts, running sessions, recovery routines, and other custom activities receive meaningful, accurate recaps.

---

## What Data Will Be Included

From the `custom_activity_logs` and `custom_activity_templates` tables, we'll extract:

| Metric | Source | How It's Used |
|--------|--------|---------------|
| Total custom activities completed | `custom_activity_logs.completed = true` | Training volume |
| Activities by type | `custom_activity_templates.activity_type` | Training variety (workout, running, recovery, etc.) |
| Total training time | `duration_minutes` | Time investment |
| Intensity distribution | `intensity` field | Training load pattern |
| Completion rate | Completed vs scheduled | Consistency metric |
| Activity notes | `notes` field | Athlete reflections |
| Daily breakdown | `entry_date` grouping | Weekly consistency |

---

## Implementation Plan

### Step 1: Fetch Custom Activity Data

Add a new database query in the edge function to fetch custom activity logs with their template details for the 6-week period:

```typescript
// Add to the Promise.all fetch block
{ data: customActivityLogs } = await supabase
  .from("custom_activity_logs")
  .select(`
    id, entry_date, completed, completed_at, 
    actual_duration_minutes, notes, performance_data,
    custom_activity_templates!inner (
      title, activity_type, duration_minutes, 
      intensity, sport
    )
  `)
  .eq("user_id", user.id)
  .eq("completed", true)
  .gte("entry_date", startDateStr)
  .lte("entry_date", endDateStr)
```

### Step 2: Aggregate Custom Activity Metrics

Create a dedicated analysis section for custom activities:

```typescript
// ========== CUSTOM ACTIVITY ANALYSIS ==========
const customActivities = customActivityLogs || [];
const totalCustomActivities = customActivities.length;

// Group by activity type
const activityByType: Record<string, number> = {};
customActivities.forEach(log => {
  const type = log.custom_activity_templates?.activity_type || 'other';
  activityByType[type] = (activityByType[type] || 0) + 1;
});

// Calculate total custom training time
const totalCustomMinutes = customActivities.reduce((sum, log) => {
  return sum + (log.actual_duration_minutes || 
    log.custom_activity_templates?.duration_minutes || 0);
}, 0);

// Group by intensity
const intensityDistribution: Record<string, number> = {};
customActivities.forEach(log => {
  const intensity = log.custom_activity_templates?.intensity || 'moderate';
  intensityDistribution[intensity] = (intensityDistribution[intensity] || 0) + 1;
});

// Get unique activity titles for variety analysis
const uniqueActivities = new Set(
  customActivities.map(log => log.custom_activity_templates?.title)
);

// Weekly consistency (days with at least one custom activity)
const activeDates = new Set(customActivities.map(log => log.entry_date));
const customActivityDays = activeDates.size;

// Extract notes for AI analysis (limit to prevent token overflow)
const activityNotes = customActivities
  .filter(log => log.notes && log.notes.trim())
  .map(log => log.notes)
  .slice(0, 5);
```

### Step 3: Add to AI Prompt

Insert a new section in the elite prompt for custom activity data:

```text
12. CUSTOM TRAINING ACTIVITIES (User-Created)
    • Total Completed: ${totalCustomActivities}
    • Unique Activities: ${uniqueActivities.size} different activities
    • Total Training Time: ${Math.floor(totalCustomMinutes / 60)}h ${totalCustomMinutes % 60}m
    • Days Active: ${customActivityDays} of 42 possible days
    • Activity Types: ${Object.entries(activityByType)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ') || 'None'}
    • Intensity Distribution: ${Object.entries(intensityDistribution)
        .map(([i, count]) => `${i}: ${count}`)
        .join(', ') || 'N/A'}
    • Top Activities: ${[...uniqueActivities].slice(0, 5).join(', ')}
    ${activityNotes.length > 0 
        ? `• Athlete Notes: ${activityNotes.join(' | ')}` 
        : ''}
```

### Step 4: Update AI Analysis Instructions

Modify the AI prompt to recognize and analyze custom activities:

```text
CRITICAL REQUIREMENTS:
...
- RECOGNIZE that athletes may train using CUSTOM ACTIVITIES (user-created) 
  in addition to or instead of structured program workouts. Both sources 
  count toward their training volume and commitment.
- If custom activity data shows high engagement but program workouts are low,
  acknowledge the athlete IS training actively via their personalized routines.
```

### Step 5: Store Custom Activity Stats in Recap Data

Include aggregated custom activity stats in the saved recap for future reference:

```typescript
// Add to recap_data object
custom_activity_stats: {
  total_completed: totalCustomActivities,
  unique_activities: uniqueActivities.size,
  total_minutes: totalCustomMinutes,
  days_active: customActivityDays,
  by_type: activityByType,
  by_intensity: intensityDistribution,
}
```

---

## Benefits

1. **Accurate Training Volume**: Athletes who use custom activities won't see "0 workouts" if they're actively training their own way
2. **Holistic Analysis**: AI can correlate custom activity patterns with sleep, recovery, and mental readiness
3. **Motivation**: Users feel their custom activities "count" and are valued
4. **Personalization**: Recaps reflect the actual training approach of each individual athlete
5. **Activity Type Insights**: AI can identify if an athlete is focusing too much on one type (e.g., all running, no recovery)

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-vault-recap/index.ts` | Add custom activity fetch, aggregation, and include in AI prompt |

---

## Example Output in Recap

After implementation, the AI might generate insights like:

> "While your structured program workouts were limited (2 sessions), your custom training volume tells a different story. You completed 28 custom activities totaling 14+ hours of training across warmups, recovery, and practice sessions. Your 'Fascia Prep' and 'Wake Up Starter' routines were completed consistently, showing excellent morning discipline..."

This ensures users who build their own training routines through Custom Activities receive the same quality of analysis as those using the structured Hammers Modality programs.

