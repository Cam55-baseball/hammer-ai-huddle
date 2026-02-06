

# Implementation Plan: Block Selector Scroll & Personalized AI Warmup

## Overview

This plan addresses two enhancements for the Elite Workout system:

1. **Scrollable Block Type Selector** - The "Add Block" dialog needs scroll capability to see all block options on smaller screens
2. **Personalized AI Warmup Toggle** - Add a "Personalize" toggle that makes the AI warmup generator create routines based on the workout AND the athlete's goals from throughout the app

---

## Current State Analysis

### Block Type Selector Issue
- The `BlockTypeSelector` is rendered inside a `DialogContent` in `BlockContainer.tsx`
- Currently displays 10 block types in a responsive grid (2-3-5 columns)
- On mobile/smaller screens, the dialog content overflows without scroll capability
- Dialog uses `sm:max-w-2xl` but has no scroll handling for content

### Warmup Generator Current State
- `WarmupGeneratorCard.tsx` - UI component with generate button
- `useWarmupGenerator.ts` - Hook that calls edge function
- `generate-warmup/index.ts` - Edge function that:
  - Analyzes workout exercises
  - Calls Lovable AI (Gemini) to generate sport-specific warmup
  - Returns warmup exercises with categories (general, dynamic, movement-prep, arm-care)

### Available User Goals Data
The app stores various athlete goals that can personalize warmups:

| Table | Data Available |
|-------|----------------|
| `athlete_body_goals` | goal_type (cut, bulk, maintain, recomp), target weights |
| `vault_nutrition_goals` | calorie/macro targets, hydration goals |
| `vault_wellness_goals` | mood, stress, discipline targets |
| `vault_focus_quizzes` | training_intent (max_strength, speed_power, recovery_prep, technique), pain locations |
| `profiles` | position, sport preference, experience level |

---

## Implementation Details

### Phase 1: Scrollable Block Type Selector

**File: `src/components/elite-workout/blocks/BlockContainer.tsx`**

Wrap the `BlockTypeSelector` in a `ScrollArea` component to enable vertical scrolling when content exceeds viewport:

```typescript
// Add import
import { ScrollArea } from '@/components/ui/scroll-area';

// Update DialogContent (around lines 168-176)
<DialogContent className="sm:max-w-2xl max-h-[85vh]">
  <DialogHeader>
    <DialogTitle>
      {t('eliteWorkout.chooseBlockType', 'Choose Block Type')}
    </DialogTitle>
  </DialogHeader>
  <ScrollArea className="max-h-[calc(85vh-80px)] pr-4">
    <BlockTypeSelector onSelect={handleAddBlock} />
  </ScrollArea>
</DialogContent>
```

**Changes:**
- Add `max-h-[85vh]` to DialogContent to limit height
- Wrap BlockTypeSelector in ScrollArea with calculated max height
- Add `pr-4` padding for scrollbar space

---

### Phase 2: Personalized AI Warmup Toggle

#### 2.1 Update WarmupGeneratorCard Component

**File: `src/components/custom-activities/WarmupGeneratorCard.tsx`**

Add a "Personalize" toggle that enables goal-aware warmup generation:

```typescript
interface WarmupGeneratorCardProps {
  exercises: Exercise[];
  onAddWarmup: (warmupExercises: Exercise[]) => void;
  sport?: 'baseball' | 'softball';
  // NEW: Optional callback to fetch personalization data
  enablePersonalization?: boolean;
}

// New state
const [personalize, setPersonalize] = useState(false);

// Updated UI - add toggle before generate button
<div className="flex items-center gap-2">
  <Switch
    id="personalize-warmup"
    checked={personalize}
    onCheckedChange={setPersonalize}
  />
  <Label htmlFor="personalize-warmup" className="text-xs">
    {t('workoutBuilder.warmup.personalize', 'Personalize')}
  </Label>
</div>
```

**When personalize is ON**, the component will:
1. Fetch athlete goals from multiple sources
2. Pass goal data to the warmup generator hook
3. Display a brief note about personalization in the reasoning

#### 2.2 Create Goals Aggregation Hook

**New File: `src/hooks/useAthleteGoalsAggregated.ts`**

This hook consolidates goals from multiple sources for AI context:

```typescript
interface AggregatedGoals {
  // Body composition
  bodyGoal?: {
    type: 'cut' | 'bulk' | 'maintain' | 'recomp';
    targetWeightLbs?: number;
  };
  // Training focus
  trainingIntent?: string[];  // From recent vault check-in
  // Pain/injury considerations
  painAreas?: string[];
  // Performance goals (derived from profile + patterns)
  performanceGoals: string[];  // e.g., "hit baseball further", "throw faster"
  // Sport context
  sport: 'baseball' | 'softball';
  position?: string;
}

export function useAthleteGoalsAggregated() {
  // Fetches from:
  // - athlete_body_goals (active goal)
  // - vault_focus_quizzes (recent training_intent, pain_location)
  // - profiles (position, sport preference)
  
  // Derives performanceGoals from:
  // - Position (pitcher → "throw faster, arm health")
  // - Position (outfielder → "sprint speed, throwing accuracy")
  // - Body goal (cut → "maintain strength while losing fat")
  // - Training intent patterns
}
```

#### 2.3 Update useWarmupGenerator Hook

**File: `src/hooks/useWarmupGenerator.ts`**

Add optional goals parameter to generation:

```typescript
interface GenerateWarmupOptions {
  exercises: Exercise[];
  sport?: 'baseball' | 'softball';
  personalize?: boolean;
  goals?: AggregatedGoals;
}

const generateWarmup = useCallback(async (options: GenerateWarmupOptions) => {
  const { exercises, sport = 'baseball', personalize = false, goals } = options;
  
  // Call edge function with additional personalization data
  const { data, error: fnError } = await supabase.functions.invoke('generate-warmup', {
    body: { 
      exercises, 
      sport,
      personalize,
      goals: personalize ? goals : undefined
    }
  });
  // ...
}, [t]);
```

#### 2.4 Update Edge Function

**File: `supabase/functions/generate-warmup/index.ts`**

Enhance the AI prompt when personalization is enabled:

```typescript
interface RequestBody {
  exercises: Exercise[];
  sport?: string;
  personalize?: boolean;
  goals?: {
    bodyGoal?: { type: string; targetWeightLbs?: number };
    trainingIntent?: string[];
    painAreas?: string[];
    performanceGoals: string[];
    position?: string;
  };
}

// Enhanced system prompt when personalize=true
const personalizedContext = goals ? `
ATHLETE PERSONALIZATION:
- Body Goal: ${goals.bodyGoal?.type || 'performance'}
- Focus Today: ${goals.trainingIntent?.join(', ') || 'general training'}
- Position: ${goals.position || 'athlete'}
- Performance Goals: ${goals.performanceGoals.join(', ')}
${goals.painAreas?.length ? `- Avoid stressing: ${goals.painAreas.join(', ')}` : ''}

Customize the warmup to:
1. Support their body composition goal (${goals.bodyGoal?.type === 'cut' ? 'include more cardio activation' : 'optimize for performance'})
2. Prepare for their stated training intent
3. ${goals.painAreas?.length ? 'Avoid or modify exercises that stress injured areas' : 'Include full-body preparation'}
4. Target movements that support their performance goals
` : '';
```

---

### Phase 3: i18n Updates

**All 8 language files** need new keys:

```json
"workoutBuilder": {
  "warmup": {
    "title": "AI Warmup Generator",
    "generate": "Generate Warmup",
    "generating": "Generating...",
    "addToStart": "Add to Start",
    "basedOn": "Based on your workout exercises",
    "personalize": "Personalize",
    "personalizeHint": "Customize based on your goals",
    "personalizedFor": "Personalized for your goals",
    "addExercisesFirst": "Add exercises to your workout first",
    "rateLimited": "Too many requests. Please wait a moment.",
    "paymentRequired": "AI credits needed. Please contact support."
  }
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `BlockContainer.tsx` | Modify | Add ScrollArea wrapper and max-height constraints |
| `WarmupGeneratorCard.tsx` | Modify | Add Personalize toggle, fetch goals when enabled |
| `useWarmupGenerator.ts` | Modify | Accept optional goals parameter |
| `useAthleteGoalsAggregated.ts` | Create | New hook to consolidate athlete goals |
| `generate-warmup/index.ts` | Modify | Enhanced prompt with personalization context |
| `en.json`, `es.json`, `fr.json`, `de.json`, `ja.json`, `zh.json`, `nl.json`, `ko.json` | Modify | Add personalize-related translation keys |

---

## Technical Considerations

### Performance
- Goals aggregation uses React Query with 5-minute stale time
- Only fetches goals when personalize toggle is enabled
- Memoize derived performanceGoals to prevent re-computation

### Error Handling
- If goals fetch fails, proceed with basic warmup generation
- Toast notification if personalization data unavailable
- Graceful degradation to standard warmup

### Privacy
- Goals data only sent to AI when user explicitly enables personalization
- No goal data persisted in warmup results
- Edge function logs only anonymized analysis

---

## Success Criteria

1. Block Type Selector scrolls smoothly on mobile (tested at 375px width)
2. All 10 block types visible via scroll
3. Personalize toggle appears below warmup title
4. When enabled, warmup generation includes athlete-specific considerations
5. AI reasoning mentions personalization factors
6. Toggle state persists during session (not across sessions)
7. Works correctly when user has no goals set (falls back to standard)
8. All 8 languages have complete translations

