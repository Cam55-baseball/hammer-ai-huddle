
# Implementation Plan: Hammer Warmup Generator & Warmup Activity Type

## Overview

This plan implements three key changes:
1. **Rename** "AI Warmup Generator" to "Hammer Warmup Generator" throughout the app
2. **Add** the Hammer Warmup Generator to the warm-up activity type in create activity
3. **Enhance personalization** for warm-up activity type - ask user what they are warming up for

---

## Current State Analysis

### Components Involved:
- `WarmupGeneratorCard.tsx` - The card component with personalize toggle (currently in workout builder only)
- `CustomActivityBuilderDialog.tsx` - Main activity creation dialog
- `DragDropExerciseBuilder.tsx` - Imports and uses WarmupGeneratorCard for workout type
- `ExerciseBuilder.tsx` - Used for non-workout activity types (including warmup)
- `useWarmupGenerator.ts` - Hook that calls the edge function
- `useAthleteGoalsAggregated.ts` - Fetches athlete goals for personalization
- `generate-warmup/index.ts` - Edge function that generates warmup via AI
- i18n locale files (8 languages)

### Current Flow:
- WarmupGeneratorCard only appears in `DragDropExerciseBuilder` (workout type)
- Warmup activity type uses basic `ExerciseBuilder` with no AI generation
- Personalization fetches athlete goals but doesn't ask what they're warming up for

---

## Implementation Details

### Phase 1: Rename to "Hammer Warmup Generator"

**i18n Updates (8 files)**

Update the `workoutBuilder.warmup` namespace in all locale files:

**English (en.json):**
```json
"warmup": {
  "title": "Hammer Warmup Generator",
  "generate": "Generate Warmup",
  "generating": "Generating...",
  // ... rest stays the same
}
```

Similar updates for: `es.json`, `fr.json`, `de.json`, `ja.json`, `zh.json`, `nl.json`, `ko.json`

### Phase 2: Add Hammer Warmup to Warmup Activity Type

**Modify `CustomActivityBuilderDialog.tsx`**

Add new state and logic to show Hammer Warmup Generator for warmup activity type:

```typescript
// New computed value
const showHammerWarmup = activityType === 'warmup' || activityType === 'workout';
```

For warmup activity type, integrate the WarmupGeneratorCard in the dialog's exercise section:

```typescript
{/* Hammer Warmup Generator - for warmup and workout types */}
{showHammerWarmup && activityType === 'warmup' && (
  <HammerWarmupForActivity
    exercises={exercises}
    onAddWarmup={(warmupExercises) => setExercises(warmupExercises)}
    sport={selectedSport}
    isWarmupActivity={true}
  />
)}
```

### Phase 3: Enhanced Personalization for Warmup Activity

**Create new component: `HammerWarmupForActivity.tsx`**

A variant of WarmupGeneratorCard specifically for the warmup activity type with an additional "What are you warming up for?" prompt:

```typescript
interface HammerWarmupForActivityProps {
  exercises: Exercise[];
  onAddWarmup: (warmupExercises: Exercise[]) => void;
  sport?: 'baseball' | 'softball';
}

// Component includes:
// 1. Personalize toggle (existing)
// 2. NEW: "What are you warming up for?" dropdown/selector when personalize is ON
//    Options: 'full_practice', 'game', 'throwing_session', 'hitting_session', 
//             'strength_workout', 'speed_training', 'general_activity'
// 3. Passes warmupContext to the generator
```

**Update `useWarmupGenerator.ts`**

Add `warmupContext` parameter to the generation options:

```typescript
interface GenerateWarmupOptions {
  exercises: Exercise[];
  sport?: 'baseball' | 'softball';
  personalize?: boolean;
  goals?: AggregatedGoals;
  warmupContext?: string;  // NEW: "What are you warming up for?"
}
```

**Update `generate-warmup/index.ts` Edge Function**

Enhance the AI prompt to include warmup context:

```typescript
interface RequestBody {
  exercises: Exercise[];
  sport?: string;
  personalize?: boolean;
  goals?: PersonalizationGoals;
  warmupContext?: string;  // NEW
}

// Enhanced prompt when warmupContext provided:
const contextPrompt = warmupContext ? `
WARMUP CONTEXT: The athlete is preparing for: ${warmupContext}
Tailor the warmup specifically for this upcoming activity:
- For game: Include competition-ready activation, mental focus elements
- For practice: Balance comprehensive prep without excessive fatigue
- For throwing session: Heavy emphasis on arm care and shoulder mobility
- For hitting session: Rotational mobility, hip activation, hand-eye prep
- For strength workout: Joint mobility, CNS activation, movement-specific prep
- For speed training: Dynamic stretches, explosive prep, neural activation
` : '';
```

### Phase 4: i18n Updates for New Features

Add new translation keys for warmup context selection:

```json
"warmup": {
  "title": "Hammer Warmup Generator",
  "warmingUpFor": "Warming up for...",
  "warmupContext": {
    "label": "What are you warming up for?",
    "full_practice": "Full Practice",
    "game": "Game Day",
    "throwing_session": "Throwing Session",
    "hitting_session": "Hitting/Batting Practice",
    "strength_workout": "Strength Workout",
    "speed_training": "Speed/Agility Training",
    "general_activity": "General Activity"
  }
  // ... existing keys
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/custom-activities/WarmupGeneratorCard.tsx` | Modify | Update component to support warmupContext prop |
| `src/components/custom-activities/CustomActivityBuilderDialog.tsx` | Modify | Add WarmupGeneratorCard for warmup activity type |
| `src/hooks/useWarmupGenerator.ts` | Modify | Add warmupContext parameter |
| `supabase/functions/generate-warmup/index.ts` | Modify | Accept and use warmupContext in AI prompt |
| `src/i18n/locales/en.json` | Modify | Rename to "Hammer Warmup" + add context keys |
| `src/i18n/locales/es.json` | Modify | Spanish translations |
| `src/i18n/locales/fr.json` | Modify | French translations |
| `src/i18n/locales/de.json` | Modify | German translations |
| `src/i18n/locales/ja.json` | Modify | Japanese translations |
| `src/i18n/locales/zh.json` | Modify | Chinese translations |
| `src/i18n/locales/nl.json` | Modify | Dutch translations |
| `src/i18n/locales/ko.json` | Modify | Korean translations |

---

## Technical Details

### WarmupGeneratorCard Updates

The component will receive new props:

```typescript
interface WarmupGeneratorCardProps {
  exercises: Exercise[];
  onAddWarmup: (warmupExercises: Exercise[]) => void;
  sport?: 'baseball' | 'softball';
  isWarmupActivity?: boolean;  // NEW: Enables context selector
}
```

When `isWarmupActivity` is true AND `personalize` is toggled on:
- Show a Select dropdown for "What are you warming up for?"
- Store selected context in local state
- Pass context to `generateWarmup()` call

### Warmup Context Options

The dropdown will offer these predefined options aligned with baseball/softball activities:

```typescript
const WARMUP_CONTEXTS = [
  { value: 'full_practice', label: 'Full Practice' },
  { value: 'game', label: 'Game Day' },
  { value: 'throwing_session', label: 'Throwing Session' },
  { value: 'hitting_session', label: 'Hitting/Batting Practice' },
  { value: 'strength_workout', label: 'Strength Workout' },
  { value: 'speed_training', label: 'Speed/Agility Training' },
  { value: 'general_activity', label: 'General Activity' },
];
```

### Edge Function Enhancement

The AI prompt will be enhanced when warmupContext is provided to generate activity-specific warmups:

```
For "game": Focus on competition-readiness - activation without fatigue, mental preparation elements
For "throwing_session": Emphasis on arm care, shoulder/rotator cuff prep, progressive throwing prep
For "hitting_session": Rotational mobility, hip/core activation, bat speed prep
For "strength_workout": Joint mobility, muscle activation matching planned movements
For "speed_training": Dynamic stretching, explosive prep, CNS activation
```

---

## User Experience Flow

### For Warmup Activity Type:
1. User selects "Warm-up" as activity type
2. Hammer Warmup Generator card appears prominently
3. User toggles "Personalize" ON
4. Dropdown appears: "What are you warming up for?"
5. User selects context (e.g., "Game Day")
6. User clicks "Generate Warmup"
7. AI generates warmup tailored to:
   - The selected context (game prep)
   - Athlete's position (pitcher → extra arm care)
   - Any pain areas (avoid shoulder exercises if shoulder pain reported)
   - Body goals (maintain energy if cutting)
8. Warmup exercises populate the activity

### For Workout Activity Type:
- Behavior remains the same as current implementation
- "What are you warming up for?" NOT shown (context is the workout itself)

---

## Success Criteria

1. "Hammer Warmup Generator" displays instead of "AI Warmup Generator"
2. Hammer Warmup Generator appears in warmup activity type builder
3. "Personalize" toggle in warmup activity shows "What are you warming up for?" selector
4. Generated warmups incorporate the selected context
5. All 8 languages have complete translations
6. No regressions in workout type warmup generation
7. Mobile-responsive UI for new selector

