
# Enhanced Custom Activities Details in Past Days Viewer

## Overview
The Past Days viewer currently only shows activity names and duration as simple badges. You want to see the detailed contents of each activity - what's in your "Morning Drink", which exercises are in your "Lift" workout, etc.

## What Will Change

### Activities Completed Section - Before vs After

**Current Display:**
- Simple badges showing just "Morning Drink" and "Morning Supplements"

**New Detailed Display:**
- Each activity gets its own expandable card showing:
  - **For meal-type activities**: All supplements, vitamins, hydration, and food items with quantities
  - **For workout activities**: Exercise list with sets, reps, rest times
  - **For activities with custom fields**: All checkbox items and their values
  - Activity notes if any were logged
  - Time completed

### Example: Your "Morning Drink" Activity
Will show:
- Water: 8 oz
- Honey: 1/2 tbsp  
- Cloves: 3

### Example: Your "Warm Drink" Activity
Will show:
- Key lime (1)
- Clove (3)
- Honey (1/2 tbsp)
- Water (1 Cup)

### Example: Your "Lift" Workout
Will show:
- Custom fields: Sauna, Foam Roll
- Exercises: Jumping Jacks (60s), Bench Press (3x10), Deadlifts (3x5), etc.

## Technical Changes

### 1. Update Data Fetching (useVault.ts)
Expand the template query to include all fields:
```
template:custom_activity_templates (
  id, title, activity_type, icon, color, description,
  exercises, meals, custom_fields, duration_minutes, intensity
)
```

### 2. Enhance VaultDayRecapCard.tsx
- Replace simple badge list with detailed expandable cards
- Add sections for:
  - Meal items with calories/macros
  - Supplements with dosages
  - Vitamins with dosages
  - Custom fields with values
  - Exercises with sets/reps/rest
- Add collapsible behavior for activities with many items
- Use appropriate icons for different content types

### 3. Visual Design
- Each activity becomes a card with the activity's color theme
- Collapsible sections for long content
- Icons: Pill for supplements, Coffee for drinks, Dumbbell for exercises
- Grid layout for nutritional data
