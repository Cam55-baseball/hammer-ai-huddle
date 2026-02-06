
# Implementation Plan: Hammer Workout Generator for Block Cards

## Overview

This plan adds an AI-powered **"Hammer Workout Generator"** to each workout block type in the Elite Workout system. Similar to the existing Hammer Warmup Generator, it will include:

1. **Block-specific generation** - Each block type (Activation, Strength Output, Power/Speed, etc.) gets its own AI generator with contextual questions
2. **Personalize toggle** - Uses aggregated athlete goals from throughout the app
3. **Block-specific prompting questions** - Each block type asks a relevant question to guide the AI

---

## Architecture Approach

The implementation follows the established pattern from the Hammer Warmup Generator:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       BlockCard Component                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              BlockWorkoutGenerator Card                        │  │
│  │  ┌─────────────────┬────────────────────────────────────────┐ │  │
│  │  │ Hammer Workout  │  [Personalize Toggle]                   │ │  │
│  │  │ Generator       │                                         │ │  │
│  │  ├─────────────────┴────────────────────────────────────────┤ │  │
│  │  │  Block-Specific Question:                                 │ │  │
│  │  │  "What's your focus for strength today?"                  │ │  │
│  │  │  [Dropdown: Max Strength / Hypertrophy / Power / ...]     │ │  │
│  │  ├─────────────────────────────────────────────────────────┤ │  │
│  │  │  [Generate Exercises] Button                              │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Existing Exercise List                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Block-Specific Questions

Each block type will have a contextual question to personalize the AI generation:

| Block Type | Question | Options |
|------------|----------|---------|
| **Activation** | "What area needs activation?" | Full Body, Lower Body, Upper Body, Core/Hips, Sport-Specific |
| **Elastic Prep** | "What type of elasticity?" | Bouncy/Reactive, Rotational, Linear, Multi-Directional |
| **CNS Primer** | "How much CNS spark do you need?" | Light Spark, Moderate Wake-Up, Full Send Primer |
| **Strength Output** | "What's your strength focus?" | Max Strength, Hypertrophy, Power, Strength-Endurance, Full Body |
| **Power/Speed** | "What power quality?" | Explosive Power, Speed-Strength, Reactive Power, Rotational Power |
| **Capacity** | "What capacity type?" | Aerobic Base, Lactate Tolerance, Work Capacity, HIIT |
| **Skill Transfer** | "What skill are you transferring?" | Throwing Mechanics, Hitting Mechanics, Defensive Agility, Base Running |
| **Decompression** | "What needs decompression?" | Full Body, Hips/Spine, Shoulders/Thoracic, Lower Body |
| **Recovery** | "What type of recovery?" | Active Recovery, Mobility Focus, Breathwork, Light Movement |
| **Custom** | "Describe your goal" | Free text input |

---

## Component Structure

### New Files to Create:

**1. `src/components/elite-workout/intelligence/BlockWorkoutGenerator.tsx`**

The main generator component that will be added to each BlockCard:

```typescript
interface BlockWorkoutGeneratorProps {
  block: WorkoutBlock;
  onAddExercises: (exercises: EnhancedExercise[]) => void;
  isLocked?: boolean;
}

// Features:
// - Personalize toggle (uses useAthleteGoalsAggregated)
// - Block-specific dropdown question
// - Generate button that calls edge function
// - Collapsible results display
// - "Add to Block" button
```

**2. `src/hooks/useBlockWorkoutGenerator.ts`**

Hook to manage the AI generation logic:

```typescript
interface GenerateBlockWorkoutOptions {
  blockType: BlockType;
  blockIntent: BlockIntent;
  blockQuestion: string; // User's answer to block-specific question
  personalize?: boolean;
  goals?: AggregatedGoals;
  existingExercises?: EnhancedExercise[]; // To avoid duplicates
}

// Returns:
// - generateExercises: async function
// - isGenerating: boolean
// - result: { exercises: EnhancedExercise[], reasoning: string }
// - error: string | null
// - clearResult: function
```

**3. `supabase/functions/generate-block-workout/index.ts`**

New edge function for block-specific exercise generation:

```typescript
// Input:
// - blockType: string (activation, strength_output, etc.)
// - blockIntent: string (elastic, max_output, etc.)
// - blockQuestion: string (user's focus selection)
// - personalize: boolean
// - goals?: AggregatedGoals
// - existingExercises?: Exercise[] (to avoid duplicates)

// Output:
// - exercises: EnhancedExercise[]
// - reasoning: string
// - estimatedDuration: number
```

### Files to Modify:

**1. `src/components/elite-workout/blocks/BlockCard.tsx`**

Add the BlockWorkoutGenerator component inside the CollapsibleContent:

```typescript
// Add import
import { BlockWorkoutGenerator } from '../intelligence/BlockWorkoutGenerator';

// Add to content section (before Add Exercise button)
{!isLocked && block.exercises.length < 8 && (
  <BlockWorkoutGenerator
    block={block}
    onAddExercises={(exercises) => {
      onUpdate({
        ...block,
        exercises: [...block.exercises, ...exercises]
      });
    }}
  />
)}
```

**2. `src/types/eliteWorkout.ts`**

Add block question types and configurations:

```typescript
export interface BlockQuestionConfig {
  question: string;
  options: { value: string; label: string }[];
}

export const BLOCK_QUESTION_CONFIGS: Record<BlockType, BlockQuestionConfig> = {
  activation: {
    question: "What area needs activation?",
    options: [
      { value: 'full_body', label: 'Full Body' },
      { value: 'lower_body', label: 'Lower Body' },
      // ...
    ]
  },
  // ... other block types
};
```

**3. i18n Files (8 languages)**

Add translation keys for:
- Block generator title and labels
- All block-specific questions and options
- Generation status messages

---

## Edge Function Design

The `generate-block-workout` function will:

1. **Accept block context** - Block type, intent, and user's focus selection
2. **Apply personalization** - If enabled, use athlete goals, position, pain areas
3. **Generate appropriate exercises** - 3-6 exercises based on block type
4. **Include advanced fields** - Tempo, velocity intent, CNS demand as appropriate for the block
5. **Avoid duplicates** - Reference existing exercises in the block to suggest new ones

### AI Prompt Structure

```text
You are a {sport} strength and conditioning specialist generating exercises for a {blockType} block.

BLOCK CONTEXT:
- Block Type: {blockType} - {blockDescription}
- Block Intent: {blockIntent}
- Athlete's Focus: {blockQuestion} → {selectedOption}

{PERSONALIZATION SECTION if enabled}
- Body Goal: {bodyGoal}
- Training Intent: {trainingIntent}
- Position: {position}
- Pain Areas to Avoid: {painAreas}
- Performance Goals: {performanceGoals}

EXISTING EXERCISES (avoid duplicates): {existingExerciseNames}

Generate 3-6 exercises appropriate for this block with:
- Name, sets, reps, rest
- Tempo (if strength/power block)
- Velocity intent
- CNS demand level
- Coaching cues
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/elite-workout/intelligence/BlockWorkoutGenerator.tsx` | Create | New AI generator component for blocks |
| `src/hooks/useBlockWorkoutGenerator.ts` | Create | Hook for block exercise generation logic |
| `supabase/functions/generate-block-workout/index.ts` | Create | Edge function for AI generation |
| `src/components/elite-workout/blocks/BlockCard.tsx` | Modify | Integrate BlockWorkoutGenerator |
| `src/types/eliteWorkout.ts` | Modify | Add block question configurations |
| `supabase/config.toml` | Modify | Register new edge function |
| `src/i18n/locales/en.json` | Modify | Add generator translations |
| `src/i18n/locales/es.json` | Modify | Spanish translations |
| `src/i18n/locales/fr.json` | Modify | French translations |
| `src/i18n/locales/de.json` | Modify | German translations |
| `src/i18n/locales/ja.json` | Modify | Japanese translations |
| `src/i18n/locales/zh.json` | Modify | Chinese translations |
| `src/i18n/locales/nl.json` | Modify | Dutch translations |
| `src/i18n/locales/ko.json` | Modify | Korean translations |

---

## User Experience Flow

1. **User adds a block** (e.g., "Strength Output")
2. **Block card shows empty state** with generator option
3. **User sees "Hammer Workout Generator"** card inside the block
4. **User toggles "Personalize"** (optional) - fetches their goals
5. **User selects focus** from dropdown (e.g., "Max Strength")
6. **User clicks "Generate Exercises"**
7. **AI generates 3-6 exercises** with sets/reps/tempo/cues
8. **User reviews results** in collapsible panel
9. **User clicks "Add to Block"** to add exercises
10. **User can still manually add/edit** exercises after

---

## Technical Considerations

### Performance
- Generator only loads goals data when "Personalize" is toggled on
- Results are cleared when block type changes
- Debounce generation requests (prevent double-clicks)

### Accessibility
- All dropdowns have proper labels and ARIA attributes
- Loading states announced to screen readers
- 44x44px minimum touch targets for buttons

### Error Handling
- Toast notifications for API errors
- Graceful fallback if AI fails (allow manual exercise entry)
- Rate limit handling with user-friendly message

### Integration with Existing System
- Generated exercises use the same EnhancedExercise type
- Works with locked/unlocked block states
- Respects View Mode (only show in Coach/Parent mode, hide in Execute)

---

## Success Criteria

1. Each block type has its own contextual question dropdown
2. Personalize toggle fetches and uses athlete goals
3. Generated exercises include advanced fields (tempo, velocity intent, CNS demand)
4. Exercises are added to the block correctly
5. Generator hidden when block is locked or has 8+ exercises
6. All 8 languages have complete translations
7. Mobile-responsive UI with proper touch targets
8. No regressions in existing block functionality
