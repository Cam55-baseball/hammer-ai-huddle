

# Libido Tracking: Honest Labels, Science-Backed Education, and Check-in Integration

## Problem

The current `libido_level` field is disguised as "Energy Level (1-5)" in the standalone Adult Wellness Tracking section. Users have no idea what it actually measures or why it matters for athletic performance. It needs to be:
1. Honestly labeled as **libido/sex drive**
2. Accompanied by clear science explaining the testosterone, estrogen, and recovery connection
3. Available for **all genders** in both **morning and night** check-ins
4. Converted from standalone entry to check-in-integrated data collection

## What Changes

### 1. Rename and Redefine the Libido Metric

- **Title**: "Libido / Sex Drive"
- **Subtitle**: "How strong is your sex drive today? Be honest -- this is private."
- **Scale labels** (1-5): Very Low, Low, Moderate, High, Very High
- **Collapsible "Why Track This?"** educational note:

> "Your libido is a direct window into your hormonal health. Testosterone and estrogen don't just regulate sex drive -- they control muscle protein synthesis, bone density, red blood cell production, and central nervous system recovery. A sudden drop in libido often signals overtraining, under-eating, or poor sleep **before** you feel it in your workouts. Tracking this pattern helps you catch recovery problems 3-5 days earlier than waiting for performance to decline."

This is straight-up honest, educational, and ties directly to why an athlete should care.

### 2. Add New Columns to `physio_adult_tracking`

```sql
ALTER TABLE physio_adult_tracking
  ADD COLUMN IF NOT EXISTS mood_stability integer,
  ADD COLUMN IF NOT EXISTS sleep_quality_impact integer,
  ADD COLUMN IF NOT EXISTS wellness_consistency_text text,
  ADD COLUMN IF NOT EXISTS symptom_tags text[];
```

These support the other adult wellness metrics from the previously approved plan.

### 3. Integrate into Check-ins (Morning + Night)

Add a gated "Adult Wellness" collapsible section to both morning and night check-ins:

**Morning Check-in** (after existing fields, gated by `adultFeaturesEnabled`):
- Sleep Recovery Quality (1-5): "How restored did you feel waking up?"
  - Why: "Growth hormone peaks during deep sleep. Feeling unrestored may mean disrupted recovery cycles."
- Libido / Sex Drive (1-5): "How strong is your sex drive this morning?"
  - Why: (same educational text as above)
- Overall Wellness -- male only (Strong Day / Average / Off Day)
  - Why: "Daily consistency reflects hormonal balance and nervous system readiness."
- Cycle Phase + Day -- female only (existing selectors)
  - Why: "Estrogen and progesterone shifts affect strength, endurance, and injury risk."

**Night Check-in** (after existing fields, gated by `adultFeaturesEnabled`):
- Libido / Sex Drive (1-5): "How was your sex drive today overall?"
  - Why: (same educational text)
- Mood Stability (1-5): "How emotionally steady were you today?"
  - Why: "Mood swings can signal cortisol imbalance. Stable mood correlates with better training focus and faster recovery."
- Body Signals -- female only (multi-select chips): Cramps, Bloating, Fatigue, Headache, Cravings, Mood Swings
  - Why: "These symptoms track hormonal fluctuations and help time nutrition and training intensity."

### 4. Convert Standalone Section to Read-Only Summary

`PhysioAdultTrackingSection` becomes a summary card showing today's values from check-ins, not a data entry form. If no data yet, shows: "Complete your morning or night check-in to see today's wellness data."

## Technical Details

### Database Migration

```sql
ALTER TABLE physio_adult_tracking
  ADD COLUMN IF NOT EXISTS mood_stability integer,
  ADD COLUMN IF NOT EXISTS sleep_quality_impact integer,
  ADD COLUMN IF NOT EXISTS wellness_consistency_text text,
  ADD COLUMN IF NOT EXISTS symptom_tags text[];
```

### Files to Modify

**`src/hooks/usePhysioAdultTracking.ts`**
- Add `mood_stability`, `sleep_quality_impact`, `wellness_consistency_text`, `symptom_tags` to the `PhysioAdultTracking` interface

**`src/components/vault/VaultFocusQuizDialog.tsx`**
- Import `usePhysioAdultTracking` and `usePhysioProfile`
- Add state for: `libidoLevel`, `sleepQualityImpact`, `moodStability`, `wellnessConsistencyText`, `symptomTags`
- Morning section: Add collapsible "Adult Wellness (18+)" section with Sleep Recovery Quality, Libido/Sex Drive (all genders), Overall Wellness (male), Cycle tracking (female) -- each with educational "Why Track This?" collapsible
- Night section: Add collapsible "Adult Wellness (18+)" section with Libido/Sex Drive (all genders), Mood Stability (all), Body Signals (female) -- each with educational collapsible
- On submit: call `saveTracking()` with adult values for both morning and night
- Reset new fields in `resetFormAndClose()`

**`src/components/physio/PhysioAdultTrackingSection.tsx`**
- Convert from interactive data entry to read-only summary showing today's tracked values
- Display each metric with its descriptive label and current value
- Show "Tracked via Morning and Night Check-ins" subtitle
- Empty state when no data exists

### Scale Labels for Each Metric

| Rating | Libido | Sleep Recovery | Mood Stability | Wellness (male) |
|--------|--------|----------------|----------------|-----------------|
| 1 | Very Low | Exhausted | Volatile | -- |
| 2 | Low | Groggy | Shaky | -- |
| 3 | Moderate | Okay | Neutral | -- |
| 4 | High | Refreshed | Steady | -- |
| 5 | Very High | Fully Restored | Rock Solid | -- |

Wellness uses 3 text options instead: Strong Day / Average / Off Day

### Educational Collapsible Pattern

Each adult metric in the check-in uses a consistent UI pattern:
1. Violet-themed section header with lock icon and "Private and encrypted" badge
2. Metric title + honest subtitle (always visible)
3. Input control (1-5 buttons, selector, or chips)
4. Collapsible "Why Track This?" with science explanation
5. Medical disclaimer at the bottom of the adult section

