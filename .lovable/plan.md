
# Elite Workout & Running Card System - Complete E2E Masterpiece Implementation

## Executive Summary

This plan completes the Elite Workout & Running Card System as a masterpiece by finishing ALL remaining items from the approved plan. This includes full i18n for 7 languages, deep integration with `CustomActivityBuilderDialog`, Vault readiness integration, and ensuring coaches/scouts can seamlessly send block-based workouts.

---

## Current State Assessment

### Already Completed:
- Database schema (4 tables: `workout_blocks`, `workout_presets`, `athlete_load_tracking`, `running_sessions`)
- TypeScript types (`src/types/eliteWorkout.ts`)
- Core UI components (BlockContainer, BlockCard, BlockTypeSelector, ViewModeToggle, etc.)
- Hooks (`useEliteWorkout`, `useLoadTracking`, `useWorkoutPresets`)
- Load calculation utilities (`src/utils/loadCalculation.ts`)
- Edge functions (calculate-load, detect-overlaps, suggest-adaptation)
- Hammers IP system presets seeded
- English translations added to `en.json`
- PresetLibrary and LoadDashboard components created
- MyCustomActivities.tsx updated with new tabs

### Remaining Work:
1. i18n translations for 7 languages (ES, FR, DE, JA, ZH, NL, KO)
2. Integrate block system into `CustomActivityBuilderDialog`
3. Create `ReadinessFromVault` component for Vault integration
4. Ensure coach/scout sending works with block data
5. Test and polish all integration points

---

## Phase 1: Complete i18n Translations (7 Languages)

### Translation Structure

The `eliteWorkout` namespace needs to be added to all 7 remaining language files with professionally translated content:

**Spanish (es.json)**:
```json
"eliteWorkout": {
  "title": "Entrenamiento Elite",
  "blocks": {
    "title": "Bloques de Entrenamiento",
    "count": "bloques",
    "activation": "Activación",
    "elastic_prep": "Preparación Elástica",
    "cns_primer": "Preparación SNC",
    "strength_output": "Salida de Fuerza",
    "power_speed": "Potencia/Velocidad",
    "capacity": "Capacidad",
    "skill_transfer": "Transferencia de Habilidad",
    "decompression": "Descompresión",
    "recovery": "Recuperación",
    "custom": "Bloque Personalizado"
  },
  "intent": {
    "elastic": "Elástico/Rebote",
    "max_output": "Máxima Salida",
    "submax_technical": "Submáximo Técnico",
    "accumulation": "Acumulación",
    "glide_restoration": "Restauración de Deslizamiento",
    "cns_downregulation": "Bajada del SNC",
    "custom": "Personalizado"
  },
  ...
}
```

**Similar structure for:**
- French (fr.json)
- German (de.json)
- Japanese (ja.json)
- Chinese (zh.json)
- Dutch (nl.json)
- Korean (ko.json)

Each language will receive the complete `eliteWorkout` namespace with all nested keys including: blocks, intent, running, viewModes, load, warnings, presets, readiness, and advanced.

---

## Phase 2: Integrate Block System into CustomActivityBuilderDialog

### Key Changes to `CustomActivityBuilderDialog.tsx`

**1. New Imports:**
```typescript
import { BlockContainer } from '@/components/elite-workout/blocks/BlockContainer';
import { ViewModeToggle } from '@/components/elite-workout/views/ViewModeToggle';
import { CNSLoadIndicator } from '@/components/elite-workout/intelligence/CNSLoadIndicator';
import { RunningCardBuilder } from '@/components/elite-workout/running/RunningCardBuilder';
import { ReadinessFromVault } from '@/components/elite-workout/readiness/ReadinessFromVault';
import { WorkoutBlock, ViewMode, createEmptyBlock } from '@/types/eliteWorkout';
import { calculateWorkoutCNS } from '@/utils/loadCalculation';
```

**2. New State Variables:**
```typescript
const [viewMode, setViewMode] = useState<ViewMode>('execute');
const [useBlockSystem, setUseBlockSystem] = useState(false);
const [workoutBlocks, setWorkoutBlocks] = useState<WorkoutBlock[]>([]);
const [showReadinessCheck, setShowReadinessCheck] = useState(false);
```

**3. Block System Toggle (for workout type):**
- Add a toggle switch in the workout section: "Use Block-Based Builder"
- When enabled, show `BlockContainer` instead of `DragDropExerciseBuilder`
- When disabled, keep legacy flat exercise list for backward compatibility

**4. View Mode Toggle:**
- Add `ViewModeToggle` component at the top of the dialog (after DialogHeader)
- Only visible when `useBlockSystem` is true
- Controls which fields are visible in BlockCard and EnhancedExerciseCard

**5. CNS Load Preview:**
- When `viewMode === 'coach'` and blocks exist, show real-time CNS load
- Display using `CNSLoadIndicator` component
- Update automatically as exercises are added/modified

**6. Data Serialization:**
- When saving with blocks, serialize to JSONB format:
```typescript
const exercisesData = useBlockSystem 
  ? { _useBlocks: true, blocks: workoutBlocks }
  : exercises;
```

**7. Template Loading:**
- On edit, detect `_useBlocks` flag in exercises field
- Parse and hydrate workoutBlocks state
- Set `useBlockSystem` to true if blocks detected

**8. Running Card Integration:**
- Replace legacy embedded running section with `RunningCardBuilder`
- Enhanced with surface, shoe type, fatigue state, intent fields

**9. Readiness Quick Check:**
- Add "Quick Readiness Check" button that opens a lightweight modal
- Pre-populates from latest Vault check-in data
- Influences load recommendations shown in Coach mode

### Locked Fields Compatibility

The existing `lockedFields` system remains fully functional:
- When `exercises` is locked, BlockContainer becomes read-only
- Block-level edits are prevented
- Exercise-level edits within blocks are prevented
- Visual lock indicators shown on locked blocks

---

## Phase 3: Create ReadinessFromVault Component

### New Component: `src/components/elite-workout/readiness/ReadinessFromVault.tsx`

**Purpose:** Fetches latest Vault check-in data to pre-populate readiness layer

**Features:**
- Queries `vault_focus_quizzes` for today's or most recent check-in
- Extracts: sleep_quality, physical_readiness, perceived_recovery, pain_location
- Displays summary card with readiness score
- One-tap "Refresh from Vault" button
- Calculates overall readiness score (0-100)
- Provides recommendation: 'full_send' | 'modify_volume' | 'recovery_focus'

**Integration Points:**
- Used in CustomActivityBuilderDialog when starting a workout
- Shown in GamePlanCard before workout tasks
- Feeds into suggest-adaptation edge function

**Data Flow:**
```text
vault_focus_quizzes → ReadinessFromVault → QuickReadinessCheck → LoadRecommendation
```

---

## Phase 4: Coach/Scout Sending Verification

### Ensuring Block Data Flows Through SendToPlayerDialog

**Current Flow (preserved):**
1. Coach creates template with blocks in CustomActivityBuilderDialog
2. Template saved to `custom_activity_templates` with exercises as JSONB
3. Coach opens SendToPlayerDialog, selects players
4. `template_snapshot` includes full exercises field (with blocks)
5. Entry created in `sent_activity_templates`
6. Player receives in `ReceivedActivitiesList`

**Verification Points:**
- `template_snapshot` automatically captures `{ _useBlocks: true, blocks: [...] }`
- Locked fields apply at block/exercise level
- ReceivedActivitiesList renders blocks via BlockContainer
- Player can accept/customize within lock constraints

**No Changes Required to:**
- SendToPlayerDialog.tsx (JSONB snapshot works automatically)
- ReceivedActivitiesList.tsx (update to render blocks)
- scout_follows flow (unchanged)

**Update Required:**
- `ReceivedActivitiesList.tsx`: Add block rendering when `_useBlocks` detected
- Display blocks using read-only BlockContainer variant

---

## Phase 5: Polish and Edge Cases

### A. Mobile Responsiveness
- Ensure all new components work on 320px width
- BlockCard collapse behavior on mobile
- Touch-friendly tap targets (min 44x44px)

### B. Empty States
- No presets in category
- No blocks in workout
- No load history data

### C. Error Handling
- Edge function failures gracefully degrade
- Network issues show toast with retry option
- Invalid block data handled gracefully

### D. Performance
- Lazy load preset library content
- Debounce CNS calculation updates
- Memoize expensive calculations

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/i18n/locales/es.json` | Modify | Add eliteWorkout namespace (Spanish) |
| `src/i18n/locales/fr.json` | Modify | Add eliteWorkout namespace (French) |
| `src/i18n/locales/de.json` | Modify | Add eliteWorkout namespace (German) |
| `src/i18n/locales/ja.json` | Modify | Add eliteWorkout namespace (Japanese) |
| `src/i18n/locales/zh.json` | Modify | Add eliteWorkout namespace (Chinese) |
| `src/i18n/locales/nl.json` | Modify | Add eliteWorkout namespace (Dutch) |
| `src/i18n/locales/ko.json` | Modify | Add eliteWorkout namespace (Korean) |
| `CustomActivityBuilderDialog.tsx` | Modify | Integrate block system, view modes, CNS preview |
| `ReadinessFromVault.tsx` | Create | Vault integration for readiness data |
| `ReceivedActivitiesList.tsx` | Modify | Render block-based activities from coaches |

---

## Technical Implementation Details

### Block Data Storage Format

```typescript
// In custom_activity_templates.exercises (JSONB)
{
  "_useBlocks": true,
  "blocks": [
    {
      "id": "block-abc123",
      "name": "Activation",
      "blockType": "activation",
      "intent": "submax_technical",
      "orderIndex": 0,
      "isCustom": false,
      "exercises": [
        {
          "id": "ex-def456",
          "name": "Hip Circles",
          "type": "flexibility",
          "sets": 2,
          "reps": 10,
          "rest": 30
        }
      ],
      "metadata": {
        "cnsContribution": 15,
        "fasciaBias": { "compression": 20, "elastic": 60, "glide": 20 },
        "estimatedDuration": 5
      }
    }
  ]
}
```

### Backward Compatibility

```typescript
// In CustomActivityBuilderDialog - loading template
useEffect(() => {
  if (template?.exercises) {
    if (typeof template.exercises === 'object' && '_useBlocks' in template.exercises) {
      setUseBlockSystem(true);
      setWorkoutBlocks(template.exercises.blocks || []);
    } else {
      setUseBlockSystem(false);
      setExercises(template.exercises as Exercise[]);
    }
  }
}, [template]);
```

### Readiness Integration

```typescript
// In ReadinessFromVault - fetching latest check-in
const { data: latestCheckin } = await supabase
  .from('vault_focus_quizzes')
  .select('sleep_quality, physical_readiness, perceived_recovery, pain_location, pain_scales')
  .eq('user_id', userId)
  .gte('entry_date', format(subDays(new Date(), 1), 'yyyy-MM-dd'))
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

const readinessScore = calculateReadinessScore(latestCheckin);
const recommendation = getReadinessRecommendation(readinessScore);
```

---

## Success Criteria

1. All 8 languages have complete eliteWorkout translations
2. CustomActivityBuilderDialog shows block builder for workout type
3. View mode toggle switches between Execute/Coach/Parent views
4. CNS load displays in real-time in Coach mode
5. Readiness data imports from Vault check-ins
6. Coaches can send block-based workouts to players
7. Players receive and execute workouts with full block structure
8. Locked fields work correctly at block level
9. Preset library loads and applies presets correctly
10. Mobile-responsive across all components
11. No regressions in existing custom activity workflows
12. Edge functions handle load calculation and overlap detection

---

## Implementation Order

1. **i18n Translations** (7 files) - Highest impact for global users
2. **ReadinessFromVault Component** - Foundation for integration
3. **CustomActivityBuilderDialog Integration** - Core feature completion
4. **ReceivedActivitiesList Update** - Complete coach/player flow
5. **Testing & Polish** - End-to-end verification

This implementation will deliver a complete, production-ready Elite Workout & Running Card System that serves athletes from age 5 to MLB professionals with the intelligence and simplicity that defines Hammers Modality.
