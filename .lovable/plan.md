

# Add Tissue Type Detail to Pain/Limitation Check-In

## What This Does

When you select a pain area on the body map during the Pre-Workout Check-in, you'll now also be able to specify **what type of tissue** is affected -- Muscle, Tendon, Ligament, Bone, Joint, or Nerve. Each selected tissue type will be clearly labeled and visible as colored chips underneath the body area name. The recap view will also show these labels so you can track tissue-specific pain patterns over time.

## How It Will Look

For each selected pain area (e.g., "L Knee (Front)"), you'll see:
1. The area name (existing)
2. A row of tissue type chips: Muscle, Tendon, Ligament, Bone, Joint, Nerve (new)
3. The 1-10 pain intensity scale (existing)
4. The fascia insight panel (existing)

Selected tissue types will appear as highlighted, labeled chips with distinct colors (e.g., red for Muscle, blue for Tendon, etc.). The chips will also be visible in the selected areas summary and the Day Recap badges.

## Changes

### 1. New File: Tissue Type Definitions
**`src/components/vault/quiz/body-maps/tissueTypeDefinitions.ts`**

Defines 6 tissue types, each with:
- ID, label, icon emoji, and a short kid-friendly description
- Types: Muscle, Tendon, Ligament, Bone, Joint, Nerve

### 2. New File: Tissue Type Selector Component
**`src/components/vault/quiz/TissueTypeSelector.tsx`**

A compact, mobile-friendly row of toggleable chips that appears for each selected pain area. Features:
- Multi-select (e.g., an area can have both "Tendon" and "Ligament")
- Color-coded chips with clear labels when selected
- Haptic feedback on mobile
- Compact design that fits within the existing per-area pain card

### 3. Update: Focus Quiz Dialog
**`src/components/vault/VaultFocusQuizDialog.tsx`**

- Add `painTissueTypes` state as `Record<string, string[]>` (maps area ID to array of tissue type IDs)
- Add handler function that updates tissue types per area and cleans up when areas are deselected
- Insert the TissueTypeSelector below each area label and above the pain scale slider
- Include `pain_tissue_types` in the submitted data payload
- Reset tissue types state on form close

### 4. Update: Day Recap Card
**`src/components/vault/VaultDayRecapCard.tsx`**

When displaying pain locations in the recap, show selected tissue types as small labeled badges next to each area (e.g., "L Knee (Front): 6/10 -- Tendon, Ligament").

### 5. Update: Vault Types
**`src/hooks/useVault.ts`**

Add `pain_tissue_types?: Record<string, string[]>` to the `VaultFocusQuiz` interface so the data is properly typed throughout the app.

### 6. Database Migration
Add a new JSONB column to `vault_focus_quizzes`:

```sql
ALTER TABLE vault_focus_quizzes 
ADD COLUMN pain_tissue_types jsonb DEFAULT NULL;
```

This stores data like:
```json
{"left_knee_front": ["tendon", "ligament"], "right_shin": ["muscle"]}
```

## Technical Notes

- The new column is nullable so all existing records remain valid
- Existing pain tracking fields (`pain_location`, `pain_scale`, `pain_scales`) are unchanged
- The tissue type selection is optional -- athletes can skip it if unsure
- The component follows the same design patterns (haptic feedback, mobile-optimized, compact) as the existing pain scale selectors
- No changes needed to RLS policies since the column is added to an existing table that already has proper policies

## Files Summary

| File | Change |
|------|--------|
| `src/components/vault/quiz/body-maps/tissueTypeDefinitions.ts` | New -- tissue type definitions with labels, emojis, and descriptions |
| `src/components/vault/quiz/TissueTypeSelector.tsx` | New -- multi-select chip component for tissue types |
| `src/components/vault/VaultFocusQuizDialog.tsx` | Add tissue type state, handler, UI integration, and data submission |
| `src/components/vault/VaultDayRecapCard.tsx` | Show tissue type labels in pain recap badges |
| `src/hooks/useVault.ts` | Add `pain_tissue_types` to VaultFocusQuiz interface |
| Database migration | Add `pain_tissue_types` JSONB column |

