

# Elite Workout & Running Card System - Complete E2E Implementation Plan

## Executive Summary

This plan delivers Hammers Modality's Elite Workout & Running Card System as a complete, production-ready feature. The system transforms how athletes from age 5 to MLB/AUSL professionals create, execute, and track training by introducing a **Block-Based Architecture** with intelligent load management, fascial tracking, and context-aware warnings—all while maintaining the app's signature "action-first" simplicity.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               ELITE WORKOUT & RUNNING CARD SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐                        │
│  │   VIEW MODES    │     │   DATA LAYER    │     │  INTELLIGENCE   │                        │
│  │                 │     │                 │     │                 │                        │
│  │  • Execute      │     │  • Blocks       │     │  • CNS Tracking │                        │
│  │  • Coach        │     │  • Exercises    │     │  • Load Mgmt    │                        │
│  │  • Parent       │     │  • Running      │     │  • Overlap Warn │                        │
│  │                 │     │  • Presets      │     │  • Auto-Adapt   │                        │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘                        │
│           │                       │                       │                                 │
│           └───────────────────────┴───────────────────────┘                                 │
│                                   │                                                         │
│                       ┌───────────▼───────────┐                                             │
│                       │   UNIFIED TEMPLATE    │                                             │
│                       │   SYSTEM              │                                             │
│                       └───────────┬───────────┘                                             │
│                                   │                                                         │
│           ┌───────────────────────┼───────────────────────┐                                 │
│           │                       │                       │                                 │
│  ┌────────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐                        │
│  │ Custom Activity │     │   My Activities │     │    Game Plan    │                        │
│  │    Builder      │     │      Page       │     │     Display     │                        │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘                        │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema Extension

### New Tables

**1. workout_blocks (Block Definitions)**
```sql
CREATE TABLE public.workout_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES custom_activity_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  intent TEXT NOT NULL, -- 'elastic', 'max_output', 'submax_technical', 'accumulation', etc.
  order_index INTEGER NOT NULL DEFAULT 0,
  block_type TEXT NOT NULL, -- 'activation', 'elastic_prep', 'cns_primer', 'strength_output', etc.
  is_custom BOOLEAN DEFAULT false,
  exercises JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}', -- CNS contribution, fascia bias, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**2. workout_presets (System IP + User Presets)**
```sql
CREATE TABLE public.workout_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- NULL for system presets (Hammers IP)
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'explosive_lower', 'elastic_day', 'game_day_prime', etc.
  difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
  sport TEXT, -- 'baseball', 'softball', 'both'
  preset_data JSONB NOT NULL, -- Full block structure
  estimated_duration_minutes INTEGER,
  cns_load_estimate INTEGER, -- 1-100
  fascial_bias JSONB, -- { compression: 30, elastic: 50, glide: 20 }
  is_system BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false, -- true for Hammers IP
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**3. athlete_load_tracking (Daily/Weekly Load)**
```sql
CREATE TABLE public.athlete_load_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cns_load_total INTEGER DEFAULT 0,
  fascial_load JSONB DEFAULT '{"compression": 0, "elastic": 0, "glide": 0}',
  volume_load INTEGER DEFAULT 0, -- total reps/contacts
  intensity_avg DECIMAL(5,2),
  recovery_debt INTEGER DEFAULT 0,
  workout_ids UUID[] DEFAULT '{}',
  running_ids UUID[] DEFAULT '{}',
  overlap_warnings JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entry_date)
);
```

**4. running_sessions (Rebuilt Running Card)**
```sql
CREATE TABLE public.running_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES custom_activity_templates(id) ON DELETE SET NULL,
  
  -- Core Fields
  run_type TEXT NOT NULL, -- 'sprint', 'tempo', 'conditioning', 'elastic', 'accel_decel', 'curve', 'cod', 'gait'
  intent TEXT NOT NULL, -- 'max', 'submax', 'elastic', 'technical', 'recovery'
  title TEXT,
  
  -- Structure (choose one primary metric)
  distance_value DECIMAL(10,2),
  distance_unit TEXT, -- 'yards', 'meters', 'feet', 'miles', 'km'
  time_goal TEXT, -- 'H:MM:SS.T' format
  reps INTEGER,
  contacts INTEGER, -- for advanced ground contact tracking
  
  -- Context Toggles
  surface TEXT, -- 'turf', 'grass', 'dirt', 'concrete', 'sand', 'track'
  shoe_type TEXT, -- 'barefoot', 'barefoot_shoe', 'flats', 'cross_trainer', 'cushion', 'plastic_cleat', 'metal_cleat'
  fatigue_state TEXT, -- 'fresh', 'accumulated', 'game_day'
  environment_notes TEXT,
  pre_run_stiffness INTEGER, -- 1-5 scale
  
  -- Intervals (for structured workouts)
  intervals JSONB DEFAULT '[]',
  
  -- Load Metrics (calculated)
  cns_load INTEGER,
  ground_contacts_total INTEGER,
  
  -- Metadata
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  actual_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Extended Exercise Schema (JSONB within blocks)

```typescript
interface EnhancedExercise {
  id: string;
  name: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'plyometric' | 'baseball' | 'core' | 'other';
  
  // Base Fields (Child Safe)
  sets?: number;
  reps?: number | string;
  duration?: number; // seconds
  rest?: number; // seconds
  
  // Advanced Fields (Hidden by default)
  tempo?: string; // e.g., "3-1-2-0" (eccentric-pause-concentric-pause)
  velocity_intent?: 'slow' | 'moderate' | 'fast' | 'ballistic';
  external_load?: number;
  load_type?: 'barbell' | 'dumbbell' | 'band' | 'bodyweight' | 'cable' | 'machine' | 'kettlebell';
  surface?: string;
  
  // Fascia & CNS (Coach Mode)
  fascia_bias?: 'compression' | 'elastic' | 'glide';
  breathing_pattern?: string;
  cns_demand?: 'low' | 'medium' | 'high';
  is_unilateral?: boolean;
  
  // Tracking
  weight?: number;
  weight_unit?: 'lbs' | 'kg';
  notes?: string;
  video_reference?: string;
  
  // Warnings (system-generated)
  pain_warning?: {
    severity: 'moderate' | 'high';
    message: string;
    affectedAreas: string[];
  };
}
```

---

## Phase 2: TypeScript Type Definitions

### New Types File: `src/types/eliteWorkout.ts`

```typescript
// Block Types
export type BlockType = 
  | 'activation'
  | 'elastic_prep' 
  | 'cns_primer'
  | 'strength_output'
  | 'power_speed'
  | 'capacity'
  | 'skill_transfer'
  | 'decompression'
  | 'recovery'
  | 'custom';

export type BlockIntent =
  | 'elastic'
  | 'max_output'
  | 'submax_technical'
  | 'accumulation'
  | 'glide_restoration'
  | 'cns_downregulation'
  | 'custom';

export interface WorkoutBlock {
  id: string;
  name: string;
  blockType: BlockType;
  intent: BlockIntent;
  orderIndex: number;
  isCustom: boolean;
  exercises: EnhancedExercise[];
  metadata: {
    cnsContribution?: number; // 0-100
    fasciaBias?: { compression: number; elastic: number; glide: number };
    estimatedDuration?: number; // minutes
  };
}

// Running Types
export type RunType = 
  | 'linear_sprint' 
  | 'tempo' 
  | 'conditioning' 
  | 'elastic' 
  | 'accel_decel' 
  | 'curve' 
  | 'cod' 
  | 'gait';

export type RunIntent = 'max' | 'submax' | 'elastic' | 'technical' | 'recovery';

export interface RunningSession {
  id: string;
  runType: RunType;
  intent: RunIntent;
  title?: string;
  distanceValue?: number;
  distanceUnit?: 'yards' | 'meters' | 'feet' | 'miles' | 'km';
  timeGoal?: string;
  reps?: number;
  contacts?: number;
  surface?: string;
  shoeType?: string;
  fatigueState?: 'fresh' | 'accumulated' | 'game_day';
  intervals?: RunningInterval[];
  cnsLoad?: number;
}

// View Modes
export type ViewMode = 'execute' | 'coach' | 'parent';

// Load Tracking
export interface LoadMetrics {
  cnsLoad: number;
  fascialLoad: { compression: number; elastic: number; glide: number };
  volumeLoad: number;
  recoveryDebt: number;
}

export interface OverlapWarning {
  type: 'cns' | 'elastic' | 'load_spike' | 'recovery';
  severity: 'advisory' | 'warning';
  message: string;
  suggestion?: string;
}
```

---

## Phase 3: UI Components

### Component Hierarchy

```text
src/components/elite-workout/
├── blocks/
│   ├── BlockContainer.tsx          # Drag-drop container for blocks
│   ├── BlockCard.tsx               # Individual block with exercises
│   ├── BlockTypeSelector.tsx       # Grid of block type options
│   ├── BlockIntentPicker.tsx       # Intent selection with icons
│   └── SystemBlocksLibrary.tsx     # Hammers IP preset blocks
│
├── exercises/
│   ├── EnhancedExerciseCard.tsx    # Exercise with advanced fields
│   ├── AdvancedFieldsToggle.tsx    # Toggle for tempo/velocity/fascia
│   ├── ExerciseQuickAdd.tsx        # Rapid exercise addition
│   └── ExercisePainWarning.tsx     # Warning badge display
│
├── running/
│   ├── RunningCardBuilder.tsx      # Complete running session builder
│   ├── RunTypeSelector.tsx         # Visual run type picker
│   ├── IntentSelector.tsx          # Intent with descriptions
│   ├── ContextToggles.tsx          # Surface, shoes, fatigue
│   └── RunningExecutionView.tsx    # Big start/finish for execution
│
├── readiness/
│   ├── QuickReadinessCheck.tsx     # 3-tap pre-workout check
│   ├── ReadinessIndicator.tsx      # Visual readiness display
│   └── ReadinessFromVault.tsx      # Import from latest Vault check-in
│
├── intelligence/
│   ├── CNSLoadIndicator.tsx        # Visual CNS meter
│   ├── OverlapWarningBanner.tsx    # Yellow advisory banners
│   ├── AutoAdaptSuggestion.tsx     # Suggestion cards
│   └── LoadTrendChart.tsx          # Weekly load visualization
│
├── presets/
│   ├── PresetLibrary.tsx           # Browse system + user presets
│   ├── PresetCard.tsx              # Preset preview card
│   └── SaveAsPresetDialog.tsx      # Save current workout as preset
│
├── execution/
│   ├── WorkoutExecutionMode.tsx    # Full-screen workout runner
│   ├── BlockProgressIndicator.tsx  # Current block/exercise position
│   └── CompletionFeedbackDialog.tsx # Post-workout feedback
│
└── views/
    ├── ViewModeToggle.tsx          # Execute/Coach/Parent switcher
    ├── ExecuteView.tsx             # Simple "do this" view
    ├── CoachView.tsx               # Full data + trends
    └── ParentView.tsx              # Compliance + safety focused
```

---

## Phase 4: Integration Points

### A. Custom Activity Builder Enhancement

Modify `CustomActivityBuilderDialog.tsx` to include:

1. **Block System Toggle** - When activity_type is 'workout', show block builder instead of flat exercise list
2. **Enhanced Exercise Fields** - Add collapsible advanced fields section
3. **Running Card Rebuild** - Replace EmbeddedRunningSession with full RunningCardBuilder
4. **View Mode Selector** - Toggle between Execute/Coach/Parent preview

### B. My Activities Page Enhancement

Modify `MyCustomActivities.tsx` to include:

1. **Preset Library Tab** - New tab for browsing system and user presets
2. **Load Dashboard** - Weekly CNS/load visualization
3. **Warning Indicators** - Show overlap warnings on activity cards

### C. Game Plan Integration

Modify `GamePlanCard.tsx` to:

1. **Display Load Metrics** - Show daily CNS total in header
2. **Warning Banners** - Display overlap warnings
3. **Readiness Prompt** - Offer quick check before workout tasks

---

## Phase 5: Intelligence Engine

### Load Calculation Logic

```typescript
// src/utils/loadCalculation.ts

export function calculateExerciseCNS(exercise: EnhancedExercise): number {
  let cns = 0;
  
  // Base by type
  if (exercise.type === 'plyometric') cns += 40;
  else if (exercise.type === 'strength') cns += 30;
  else if (exercise.type === 'baseball') cns += 25;
  else cns += 15;
  
  // Velocity modifier
  if (exercise.velocity_intent === 'ballistic') cns *= 1.5;
  else if (exercise.velocity_intent === 'fast') cns *= 1.25;
  
  // Volume modifier
  const volume = (exercise.sets || 1) * (typeof exercise.reps === 'number' ? exercise.reps : 10);
  cns += volume * 0.5;
  
  // Explicit CNS demand override
  if (exercise.cns_demand === 'high') cns *= 1.3;
  else if (exercise.cns_demand === 'low') cns *= 0.7;
  
  return Math.round(cns);
}

export function detectOverlaps(
  workouts: LoadMetrics[],
  running: LoadMetrics[],
  date: Date
): OverlapWarning[] {
  const warnings: OverlapWarning[] = [];
  const dayLoad = calculateDayLoad(workouts, running, date);
  
  // CNS overlap detection
  if (dayLoad.cnsLoad > 150) {
    warnings.push({
      type: 'cns',
      severity: 'warning',
      message: 'High CNS load today - consider spacing explosive work',
      suggestion: 'Move one high-intensity session to tomorrow'
    });
  }
  
  // Elastic overload
  if (dayLoad.fascialLoad.elastic > 100) {
    warnings.push({
      type: 'elastic',
      severity: 'advisory',
      message: 'High elastic demand - ensure adequate warmup',
    });
  }
  
  // Load spike (compared to 7-day average)
  const weekAvg = calculateWeekAverage(date);
  if (dayLoad.volumeLoad > weekAvg * 1.5) {
    warnings.push({
      type: 'load_spike',
      severity: 'warning',
      message: 'Load spike detected - risk of overtraining',
      suggestion: 'Consider reducing volume by 20%'
    });
  }
  
  return warnings;
}
```

---

## Phase 6: Hammers IP System Presets

### Seed Data for `workout_presets`

```sql
-- Explosive Lower Day
INSERT INTO workout_presets (name, category, difficulty, sport, is_system, is_locked, preset_data) VALUES
('Explosive Lower', 'explosive_lower', 'intermediate', 'both', true, true, '{
  "blocks": [
    {"blockType": "activation", "intent": "cns_downregulation", "exercises": [...]},
    {"blockType": "elastic_prep", "intent": "elastic", "exercises": [...]},
    {"blockType": "power_speed", "intent": "max_output", "exercises": [...]},
    {"blockType": "strength_output", "intent": "accumulation", "exercises": [...]},
    {"blockType": "decompression", "intent": "glide_restoration", "exercises": [...]}
  ]
}'::jsonb);

-- Elastic Day
INSERT INTO workout_presets (name, category, difficulty, sport, is_system, is_locked, preset_data) VALUES
('Elastic Day', 'elastic_day', 'intermediate', 'both', true, true, '...');

-- Game Day Prime
INSERT INTO workout_presets (name, category, difficulty, sport, is_system, is_locked, preset_data) VALUES
('Game Day Prime', 'game_day_prime', 'all', 'both', true, true, '...');

-- Fascial Recovery
INSERT INTO workout_presets (name, category, difficulty, sport, is_system, is_locked, preset_data) VALUES
('Fascial Recovery', 'fascial_recovery', 'beginner', 'both', true, true, '...');
```

---

## Phase 7: Edge Functions

### 1. `calculate-load` Edge Function

Calculates and stores daily load metrics after workout completion.

### 2. `detect-overlaps` Edge Function

Analyzes upcoming schedule for potential overlap warnings.

### 3. `suggest-adaptation` Edge Function

AI-powered suggestions for workout modifications based on recovery context.

---

## Phase 8: Internationalization

Add translation keys to all 8 language files:

```json
{
  "eliteWorkout": {
    "blocks": {
      "activation": "Activation",
      "elastic_prep": "Elastic Prep",
      "cns_primer": "CNS Primer",
      "strength_output": "Strength Output",
      "power_speed": "Power/Speed",
      "capacity": "Capacity",
      "skill_transfer": "Skill Transfer",
      "decompression": "Decompression",
      "recovery": "Recovery"
    },
    "intent": {
      "elastic": "Elastic/Bounce",
      "max_output": "Max Output",
      "submax_technical": "Submax Technical",
      "accumulation": "Accumulation",
      "glide_restoration": "Glide Restoration",
      "cns_downregulation": "CNS Downregulation"
    },
    "running": {
      "types": {
        "linear_sprint": "Sprint",
        "tempo": "Tempo",
        "conditioning": "Conditioning",
        "elastic": "Elastic/Bounce",
        "accel_decel": "Accel/Decel",
        "curve": "Curve Run",
        "cod": "Change of Direction",
        "gait": "Gait Work"
      }
    },
    "viewModes": {
      "execute": "Do It",
      "coach": "Full Data",
      "parent": "Overview"
    },
    "warnings": {
      "cns_overlap": "High CNS load detected",
      "load_spike": "Load spike - take it easy",
      "elastic_overload": "Lots of jumping today"
    }
  }
}
```

---

## File Changes Summary

| Category | Files | Action |
|----------|-------|--------|
| Database | 4 new tables + migrations | Create |
| Types | `src/types/eliteWorkout.ts` | Create |
| Components | 25+ new components in `src/components/elite-workout/` | Create |
| Hooks | `useEliteWorkout.ts`, `useLoadTracking.ts`, `useOverlapDetection.ts` | Create |
| Existing | `CustomActivityBuilderDialog.tsx` | Modify |
| Existing | `MyCustomActivities.tsx` | Modify |
| Existing | `GamePlanCard.tsx` | Modify |
| Existing | `ExerciseBuilder.tsx` | Modify |
| Existing | `DragDropExerciseBuilder.tsx` | Modify |
| Edge Functions | `calculate-load`, `detect-overlaps`, `suggest-adaptation` | Create |
| i18n | All 8 language files | Modify |

---

## Kid-Friendly UX Principles

Throughout implementation:

1. **Default Simple** - Advanced fields hidden until toggled
2. **Big Tap Targets** - All buttons minimum 44x44px
3. **Visual Progress** - Clear indicators of where they are in workout
4. **Encouraging Language** - "Great job!" not "Exercise completed"
5. **No Cognitive Load** - "What's next?" always obvious
6. **Soft Guardrails** - Warnings never block, only inform
7. **Sport-Colored** - Baseball orange, softball pink theming continues

---

## Success Criteria

1. A 5-year-old can start and complete a workout without help
2. MLB-level athletes have access to CNS/fascial tracking
3. Coaches can see full system visibility with one toggle
4. Parents can monitor compliance without complexity
5. Zero overlap errors or database constraint violations
6. Full 8-language support
7. No performance degradation on mobile

