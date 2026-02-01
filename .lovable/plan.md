
# Show Full Activity Details in Past Days Viewer

## Overview

When looking at past days in the Vault, users need to see the complete details of completed activities - not just a summary. This includes all exercises (not just the first 8), exercise-level notes, activity descriptions, performance data logged during completion, running intervals, and distance/pace information.

---

## Current Limitations

| What's Missing | Where It Should Show |
|----------------|---------------------|
| Template description | Below title |
| All exercises (currently capped at 8) | Exercise section |
| Exercise notes | Each exercise badge |
| Performance data (logged during completion) | New section |
| Running intervals | Running activities |
| Distance/pace goals | Running activities |
| Intensity level | Activity header |
| Completed timestamp | Activity header |

---

## Implementation Plan

### File: `src/components/vault/VaultDayRecapCard.tsx`

#### 1. Show Template Description
Add description text below the title when available.

```tsx
// After line 81 (title display)
{template.description && (
  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
)}
```

#### 2. Show Intensity Level Badge
Display the activity intensity in the header area.

```tsx
// In header area, alongside duration badge
{template.intensity && (
  <Badge variant="outline" className="text-xs capitalize">
    {template.intensity}
  </Badge>
)}
```

#### 3. Show Completed Timestamp
Display when the activity was completed.

```tsx
// In header area
{activity.completed_at && (
  <Badge variant="outline" className="text-xs text-muted-foreground">
    {format(new Date(activity.completed_at), 'h:mm a')}
  </Badge>
)}
```

#### 4. Remove Exercise Limit (Show All)
Currently exercises are limited to 8. Remove the slice to show all exercises.

```tsx
// Change line 218 from:
{exercises.slice(0, 8).map((ex) => (

// To:
{exercises.map((ex) => (

// Remove the "+X more" badge (lines 237-240)
```

#### 5. Show Exercise Notes
Each exercise can have notes. Display them in an expandable format.

```tsx
// For each exercise badge, if ex.notes exists, show it
{ex.notes && (
  <span className="text-muted-foreground block text-[10px] italic">
    {ex.notes}
  </span>
)}
```

#### 6. Show Running Activity Details
For running activities, display distance, pace, and intervals.

```tsx
// New section for running activities
{(template.activity_type === 'running' && (template.distance_value || template.pace_value || template.intervals?.length > 0)) && (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Footprints className="h-3 w-3" />
      <span>Running Details</span>
    </div>
    {template.distance_value && (
      <div className="text-xs">
        Distance: {template.distance_value} {template.distance_unit}
      </div>
    )}
    {template.pace_value && (
      <div className="text-xs">
        Pace Goal: {template.pace_value}
      </div>
    )}
    {template.intervals && template.intervals.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {template.intervals.map((interval, i) => (
          <Badge key={i} variant="secondary" className="text-xs capitalize">
            {interval.type}
            {interval.duration && ` - ${Math.floor(interval.duration / 60)}:${String(interval.duration % 60).padStart(2, '0')}`}
          </Badge>
        ))}
      </div>
    )}
  </div>
)}
```

#### 7. Show Performance Data Logged During Completion
Display any performance data that was logged when the activity was completed.

```tsx
// New section for performance data
{activity.performance_data && Object.keys(activity.performance_data).length > 0 && (
  <div className="space-y-1 border-t pt-2 mt-2">
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Activity className="h-3 w-3" />
      <span>Performance Logged</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      {Object.entries(activity.performance_data).map(([key, value]) => (
        <div key={key} className="flex justify-between bg-muted/50 rounded p-1.5">
          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
          <span className="font-medium">{String(value)}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

#### 8. Update hasDetails Check
Include new fields in the check for expandable content.

```tsx
const hasDetails = 
  (meals?.items && meals.items.length > 0) ||
  (meals?.supplements && meals.supplements.length > 0) ||
  (meals?.vitamins && meals.vitamins.length > 0) ||
  (meals?.hydration) ||
  exercises.length > 0 ||
  customFields.length > 0 ||
  activity.notes ||
  template.description ||
  (activity.performance_data && Object.keys(activity.performance_data).length > 0) ||
  (template.intervals && template.intervals.length > 0) ||
  template.distance_value ||
  template.pace_value;
```

#### 9. Update Template Query (Minor)
Ensure the query includes all needed fields. Current query already includes:
- `exercises, meals, custom_fields, duration_minutes, intensity`

Need to add:
- `intervals, distance_value, distance_unit, pace_value, description`

**File: `src/hooks/useVault.ts` (line 1164)**

```tsx
template:custom_activity_templates (
  id, title, activity_type, icon, color, description,
  exercises, meals, custom_fields, duration_minutes, intensity,
  intervals, distance_value, distance_unit, pace_value
)
```

---

## Visual Layout (Updated ActivityDetailCard)

```
┌─────────────────────────────────────────────────┐
│ 🎯 Activity Title                  ⏱️ 30m  🟢 │
│ "Optional description text here"    High  2:30p│
├─────────────────────────────────────────────────┤
│ 🍽️ Items                                       │
│ [Chicken] [Rice] [Broccoli]                    │
│                                                 │
│ 💊 Supplements                                  │
│ [Creatine (5g)] [Fish Oil]                     │
│                                                 │
│ 🏋️ Exercises                                   │
│ [Squats (3×10)] [Deadlifts (4×8)]              │
│ [Bench Press (3×8)]                            │
│   Note: "Felt strong, increased weight"        │
│                                                 │
│ 🏃 Running Details (if applicable)              │
│ Distance: 2 miles                              │
│ [Run - 5:00] [Walk - 2:00] [Sprint - 1:00]     │
│                                                 │
│ 📊 Performance Logged                           │
│ ┌──────────────┬───────────────┐               │
│ │ Weight       │ 185 lbs       │               │
│ │ Sets Done    │ 12            │               │
│ └──────────────┴───────────────┘               │
│                                                 │
│ 💭 "Great session, pushed through fatigue"     │
└─────────────────────────────────────────────────┘
```

---

## Summary

This update transforms the Past Days activity cards from a brief summary to a complete journal entry view, ensuring users can review exactly what happened during each activity - including all exercises, their notes, performance data logged during completion, and running-specific details.
