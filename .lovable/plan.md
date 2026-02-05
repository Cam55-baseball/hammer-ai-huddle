

# Elite Workout & Running Card System - Complete E2E Integration Plan

## Overview

This plan completes the Elite Workout & Running Card System by integrating the block-based architecture into existing components, adding the Preset Library, seeding Hammers IP presets, implementing edge functions for load calculation, and adding full i18n translations for all 8 languages. Coaches and scouts retain full ability to send custom workouts with block-based data.

---

## Phase 1: Integrate Block System into CustomActivityBuilderDialog

### Changes to `CustomActivityBuilderDialog.tsx`

**What we're adding:**
1. **View Mode Toggle** - Add Execute/Coach/Parent mode selector at the top
2. **Block-Based Workout Builder** - Replace flat exercise list with BlockContainer when activity type is 'workout'
3. **Enhanced Running Card Builder** - Replace embedded running sessions with the new RunningCardBuilder
4. **CNS Load Preview** - Show real-time CNS load calculation in Coach mode
5. **Preset Quick-Load** - Button to load from preset library

**Key additions:**
- Import `BlockContainer`, `RunningCardBuilder`, `ViewModeToggle`, `CNSLoadIndicator`
- Add state for `workoutBlocks`, `runningSessions`, and `viewMode`
- Conditional rendering: show BlockContainer for 'workout' type, RunningCardBuilder for 'running' type
- Convert blocks/sessions to/from JSONB format for database storage
- Keep backward compatibility with existing flat exercise data

**Coach/Scout sending preserved:**
- The `SendToPlayerDialog` already handles template snapshots as JSONB
- Block data will be included in `template_snapshot` automatically
- Locked fields logic remains unchanged
- No disruption to existing scout_follows or sent_activity_templates flow

---

## Phase 2: Enhance My Activities Page with Preset Library

### Changes to `MyCustomActivities.tsx`

**Add new tab: "Elite Presets"**
```text
tabs = [
  ...existing tabs,
  { value: 'elite-presets', icon: Dumbbell, label: 'Elite Presets' }
]
```

**New component: `PresetLibrary.tsx`**
- Display grid of system presets (Hammers IP - locked) and user presets
- Filter by category: Explosive Lower, Elastic Day, Game Day Prime, etc.
- Filter by difficulty: Beginner, Intermediate, Advanced
- Preview modal showing block structure and CNS load estimate
- "Use This Preset" button that loads blocks into activity builder
- "Duplicate & Edit" for user presets

**New component: `PresetCard.tsx`**
- Visual card with category color coding
- Lock icon for system presets (Hammers IP)
- CNS load badge
- Duration estimate
- Sport indicator (baseball/softball/both)

---

## Phase 3: Create Load Dashboard Component

### New component: `LoadDashboard.tsx`

**Purpose:** Weekly CNS/fascial load visualization

**Features:**
- 7-day CNS load chart using Recharts
- Daily breakdown: workout vs running contribution
- Current recovery debt indicator
- Weekly average vs today comparison
- Overlap warnings for the current day

**Data source:**
- Uses `useLoadTracking` hook
- Queries `athlete_load_tracking` table
- Real-time updates on workout completion

---

## Phase 4: Seed Hammers IP System Presets

### Database insert via migration

**Presets to seed:**

1. **Explosive Lower Day**
   - Blocks: Activation → Elastic Prep → CNS Primer → Power/Speed → Strength Output → Decompression
   - CNS Load Estimate: 120
   - Fascial Bias: Compression-heavy
   - Difficulty: Intermediate

2. **Elastic Day**
   - Blocks: Activation → Elastic Prep → Power/Speed → Skill Transfer → Recovery
   - CNS Load Estimate: 85
   - Fascial Bias: Elastic-heavy
   - Difficulty: Intermediate

3. **Game Day Prime**
   - Blocks: Activation → CNS Primer → Skill Transfer → Decompression
   - CNS Load Estimate: 45
   - Fascial Bias: Balanced
   - Difficulty: All levels

4. **Fascial Recovery**
   - Blocks: Activation → Decompression → Recovery
   - CNS Load Estimate: 25
   - Fascial Bias: Glide-heavy
   - Difficulty: Beginner

Each preset includes 3-5 sample exercises per block with:
- Sets/reps/rest
- Velocity intent
- Fascia bias
- CNS demand rating

---

## Phase 5: Edge Functions for Load Calculation

### 1. `calculate-load` Edge Function

**Purpose:** Calculate and store daily load metrics after workout/running completion

**Endpoint:** POST `/functions/v1/calculate-load`

**Input:**
```json
{
  "workout_blocks": [...],
  "running_sessions": [...],
  "entry_date": "2026-02-05"
}
```

**Logic:**
- Uses same algorithms as `loadCalculation.ts`
- Calculates CNS total, fascial bias, volume
- Upserts into `athlete_load_tracking` table
- Returns updated metrics and any warnings

### 2. `detect-overlaps` Edge Function

**Purpose:** Analyze upcoming schedule for potential issues

**Endpoint:** POST `/functions/v1/detect-overlaps`

**Input:**
```json
{
  "target_date": "2026-02-06",
  "planned_activities": [...]
}
```

**Logic:**
- Fetches recent load history (7 days)
- Compares planned load vs average
- Detects CNS overlap, elastic overload, load spikes
- Returns array of `OverlapWarning` objects

### 3. `suggest-adaptation` Edge Function

**Purpose:** AI-powered workout modification suggestions

**Endpoint:** POST `/functions/v1/suggest-adaptation`

**Input:**
```json
{
  "readiness_score": 65,
  "pain_areas": ["lower back"],
  "planned_workout": {...}
}
```

**Logic:**
- Uses Lovable AI (Gemini) for intelligent suggestions
- Analyzes readiness + pain + planned load
- Returns adaptation suggestions with priorities

---

## Phase 6: i18n Translations (All 8 Languages)

### Add `eliteWorkout` namespace to all locale files

**Keys to add:**

```json
{
  "eliteWorkout": {
    "title": "Elite Workout",
    "blocks": {
      "title": "Workout Blocks",
      "count": "blocks",
      "activation": "Activation",
      "elastic_prep": "Elastic Prep",
      "cns_primer": "CNS Primer",
      "strength_output": "Strength Output",
      "power_speed": "Power/Speed",
      "capacity": "Capacity",
      "skill_transfer": "Skill Transfer",
      "decompression": "Decompression",
      "recovery": "Recovery",
      "custom": "Custom Block"
    },
    "intent": {
      "elastic": "Elastic/Bounce",
      "max_output": "Max Output",
      "submax_technical": "Submax Technical",
      "accumulation": "Accumulation",
      "glide_restoration": "Glide Restoration",
      "cns_downregulation": "CNS Downregulation",
      "custom": "Custom"
    },
    "running": {
      "title": "Running Session",
      "types": {
        "linear_sprint": "Sprint",
        "tempo": "Tempo",
        "conditioning": "Conditioning",
        "elastic": "Elastic/Bounce",
        "accel_decel": "Accel/Decel",
        "curve": "Curve Run",
        "cod": "Change of Direction",
        "gait": "Gait Work"
      },
      "intent": {
        "max": "Max Intent",
        "submax": "Submax",
        "elastic": "Elastic",
        "technical": "Technical",
        "recovery": "Recovery"
      },
      "surface": "Surface",
      "shoeType": "Shoe Type",
      "fatigueState": "Fatigue State",
      "contacts": "Ground Contacts"
    },
    "viewModes": {
      "execute": "Do It",
      "coach": "Full Data",
      "parent": "Overview",
      "switchMode": "Switch View"
    },
    "load": {
      "cns": "CNS Load",
      "fascial": "Fascial Bias",
      "compression": "Compression",
      "elastic": "Elastic",
      "glide": "Glide",
      "volume": "Volume",
      "recoveryDebt": "Recovery Debt"
    },
    "warnings": {
      "cns_overlap": "High CNS load detected",
      "load_spike": "Load spike - take it easy",
      "elastic_overload": "Lots of jumping today",
      "recovery_needed": "Recovery day recommended"
    },
    "presets": {
      "title": "Elite Presets",
      "systemPresets": "Hammers Presets",
      "myPresets": "My Presets",
      "usePreset": "Use This Preset",
      "locked": "Locked",
      "difficulty": "Difficulty",
      "duration": "Duration",
      "cnsLoad": "CNS Load"
    },
    "addBlock": "Add Block",
    "addExercise": "Add Exercise",
    "chooseBlockType": "Choose Block Type",
    "noBlocks": "No blocks yet",
    "noBlocksDescription": "Add blocks to structure your workout. Each block groups exercises by purpose.",
    "addFirstBlock": "Add Your First Block",
    "noExercises": "No exercises yet",
    "readiness": {
      "title": "Quick Readiness Check",
      "sleep": "Sleep Quality",
      "energy": "Energy Level",
      "soreness": "Soreness",
      "skip": "Skip Check",
      "continue": "Continue"
    },
    "advanced": {
      "title": "Advanced Settings",
      "tempo": "Tempo",
      "velocity": "Velocity Intent",
      "fasciaBias": "Fascia Bias",
      "cnsDemand": "CNS Demand",
      "loadType": "Load Type"
    }
  }
}
```

**Languages to update:**
- `en.json` (English)
- `es.json` (Spanish)
- `fr.json` (French)
- `de.json` (German)
- `ja.json` (Japanese)
- `zh.json` (Chinese)
- `nl.json` (Dutch)
- `ko.json` (Korean)

---

## Phase 7: Integration Points

### A. Game Plan Integration

**Modify `GamePlanCard.tsx`:**
- Show daily CNS total in header badge
- Display overlap warning banners when detected
- Add quick readiness check prompt before starting workout tasks

### B. Vault Integration

**Modify Readiness System:**
- `ReadinessFromVault.tsx` component fetches latest Vault check-in data
- Pre-populates readiness layer with sleep quality, stress, pain areas
- Enables smarter adaptation suggestions

### C. Template Sharing

**Ensure block data flows through:**
- `SendToPlayerDialog` already snapshots full template
- Block data included in `template_snapshot` JSONB
- Recipients see full block structure when accepting
- Locked fields apply to block-level edits

---

## File Changes Summary

| Category | File | Action |
|----------|------|--------|
| **Builder** | `CustomActivityBuilderDialog.tsx` | Modify - add block system, view modes |
| **My Activities** | `MyCustomActivities.tsx` | Modify - add Elite Presets tab, Load Dashboard |
| **New Components** | `PresetLibrary.tsx` | Create |
| **New Components** | `PresetCard.tsx` | Create |
| **New Components** | `LoadDashboard.tsx` | Create |
| **New Components** | `ReadinessFromVault.tsx` | Create |
| **Existing Elite** | `BlockContainer.tsx` | Enhance - add preset loading |
| **Edge Functions** | `calculate-load/index.ts` | Create |
| **Edge Functions** | `detect-overlaps/index.ts` | Create |
| **Edge Functions** | `suggest-adaptation/index.ts` | Create |
| **Config** | `supabase/config.toml` | Modify - add new functions |
| **i18n** | All 8 locale files | Modify - add eliteWorkout namespace |
| **Database** | Migration for preset seed data | Create |
| **Hooks** | `useWorkoutPresets.ts` | Create |

---

## Technical Details

### Block Data Storage in Custom Activities

**Field:** `exercises` JSONB column in `custom_activity_templates`

**Structure when using blocks:**
```json
{
  "_useBlocks": true,
  "blocks": [
    {
      "id": "block-123",
      "name": "Activation",
      "blockType": "activation",
      "intent": "submax_technical",
      "exercises": [...]
    }
  ]
}
```

**Backward compatibility:**
- If `_useBlocks` is not present or false, treat as flat exercise array
- Migration path: existing templates continue working as-is
- Users can upgrade to blocks by editing template

### Running Session Storage

**Field:** `embedded_running_sessions` JSONB column

**Structure with new fields:**
```json
[
  {
    "id": "run-123",
    "runType": "linear_sprint",
    "intent": "max",
    "distanceValue": 40,
    "distanceUnit": "yards",
    "reps": 6,
    "surface": "turf",
    "shoeType": "plastic_cleat",
    "fatigueState": "fresh"
  }
]
```

---

## Coach/Scout Flow Verification

### Unchanged Workflows:

1. **Creating activities** - Coaches create templates normally, now with blocks
2. **Sending to players** - `SendToPlayerDialog` snapshots include block data
3. **Player receiving** - `ReceivedActivitiesList` displays block-based workouts
4. **Locked fields** - Apply at block and exercise level
5. **Acceptance flow** - Player can accept/customize within lock constraints

### Testing Points:

- Coach creates block-based workout → sends to player → player accepts
- Locked 'exercises' field prevents block modification
- Preset usage flows from library to builder to player

---

## Success Criteria

1. ✅ Coaches can create and send block-based workouts
2. ✅ Players receive and execute workouts with full block structure
3. ✅ View mode toggle works in Execute/Coach/Parent modes
4. ✅ CNS load displays correctly in Coach mode
5. ✅ Preset library loads and applies presets
6. ✅ Edge functions calculate and store load metrics
7. ✅ All 8 languages have complete translations
8. ✅ No regression in existing custom activity workflows
9. ✅ Mobile-responsive across all new components

