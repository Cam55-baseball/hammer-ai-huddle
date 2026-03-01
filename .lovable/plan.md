

# Folder Reordering, Cycle Clarity, Coach Permissions, CNS Integration, and Nutrition Fix

## Overview

Nine changes grouped into five workstreams: (A) arrow reordering controls, (B) collapsible weekly section improvements, (C) player-to-coach editing workflow with granular permissions, (D) CNS load integration for all activities, and (E) nutrition/weight input bug fix.

---

## A. Up/Down Arrow Reordering Controls

**File: `src/components/folders/FolderDetailDialog.tsx`**

Add Move Up / Move Down arrow buttons alongside the existing drag handle on each item card.

**Changes to `renderItemCard` (line 330):**
- Add `ChevronUp` and `ChevronDown` icon buttons next to the `GripVertical` drag handle
- `handleMoveUp(itemId, weekKey?)` and `handleMoveDown(itemId, weekKey?)` functions that:
  - Swap `order_index` with the adjacent item in the same group (or flat list)
  - Update local state immediately
  - Persist both swapped `order_index` values to `activity_folder_items`
- Disable Up arrow on first item, Down arrow on last item
- Works in both flat list mode and within collapsible weekly sections (scoped to the same week group)

**New handlers:**
```text
handleMoveItem(itemId, direction: 'up' | 'down', weekKey?: string)
  - Get the relevant item list (grouped or flat)
  - Find current index, swap with neighbor
  - Update state + persist order_index for both items
```

---

## B. Collapsible Weekly Sections Enhancement

**File: `src/components/folders/FolderDetailDialog.tsx`**

**B1. "Add Activity" button per week section**

Inside `renderCollapsibleWeekSection` (line 425), add a small `+ Add` button in each week header or at the bottom of each section. When clicked:
- Set `pendingCycleWeek` to that week number (or null for "Every Week")
- Open the builder dialog (`setBuilderOpen(true)`)
- The new item auto-tags to that week

**B2. Title already correct** -- "Cycle Plan: How should activities repeat?" is already in `FolderBuilder.tsx` line 151. No change needed.

---

## C. Player-to-Coach Editing Workflow and Granular Permissions

This requires both database changes and UI work.

### C1. Database Migration

New table `folder_coach_permissions` for granular per-folder coach access:

```sql
CREATE TABLE public.folder_coach_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.activity_folders(id) ON DELETE CASCADE NOT NULL,
  coach_user_id uuid NOT NULL,
  permission_level text NOT NULL DEFAULT 'edit',
  granted_by uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (folder_id, coach_user_id)
);

ALTER TABLE public.folder_coach_permissions ENABLE ROW LEVEL SECURITY;

-- Players can manage permissions on their own folders
CREATE POLICY "Players manage own folder permissions"
  ON public.folder_coach_permissions FOR ALL TO authenticated
  USING (granted_by = auth.uid())
  WITH CHECK (granted_by = auth.uid());

-- Coaches can read permissions granted to them
CREATE POLICY "Coaches read own permissions"
  ON public.folder_coach_permissions FOR SELECT TO authenticated
  USING (coach_user_id = auth.uid() AND revoked_at IS NULL);
```

Add `is_head_coach` boolean to `athlete_mpi_settings` or use existing `primary_coach_id` as the head coach identifier (already exists). The head coach (primary_coach_id) gets automatic access to ALL folders -- enforced in code, not via separate permission rows.

### C2. "Send to Coach for Edit" Button

**File: `src/components/folders/FolderDetailDialog.tsx`**

Replace the current simple toggle (lines 467-475) with an expanded permission panel:

- Keep the existing toggle for primary coach (head coach = automatic access)
- Add a new section: "Grant Access to Assistant Coaches"
  - Dropdown to select from available coaches (query `user_roles` for coaches linked to the player's team/org, or a simple user search)
  - List of currently granted coaches with a "Revoke" button
  - Each granted coach shows their name and permission status

### C3. Coach Editing Enforcement

**File: `src/components/folders/FolderDetailDialog.tsx`**

Currently `isOwner` gates all edit actions. Add a new derived variable:

```text
const canEdit = isOwner || isGrantedCoach;
```

Where `isGrantedCoach` checks:
1. Is the current user the folder's `coach_edit_user_id` (head coach via existing toggle)?
2. OR does a row exist in `folder_coach_permissions` for this folder + current user with no `revoked_at`?

Replace all `isOwner` guards for edit/add/delete/reorder with `canEdit`.

### C4. Full Card Editability

**File: `src/components/custom-activities/CustomActivityBuilderDialog.tsx`**

The builder already supports full editing (add/remove/reorder exercises, adjust sets/reps/intensity, modify notes). No fields are locked for personalized cards. This is already working correctly -- the plan confirms no lock mechanism exists post-creation.

Add "Duplicate" and "Move to Week" actions to the item card menu:
- **Duplicate**: Copy the item with a new ID and append to the same week
- **Move to Week**: Quick-select to change `cycle_week` (already exists as inline tag selector)

---

## D. CNS Load for ALL Activity Types

**File: `src/utils/loadCalculation.ts`**

The existing `calculateExerciseCNS` already handles strength, plyometric, baseball, core, cardio, and flexibility. But the `default` case (line 55) and some types need adjustment:

**Changes:**
- Ensure `flexibility` has a minimum CNS of 5 (already set) -- but enforce it's never 0
- Add explicit handling for custom activity types: `practice`, `skill_work`, `mobility`, `recovery`, `warmup`
- Add a `custom` fallback that estimates CNS from `duration_minutes` if no exercises exist

**New function: `calculateCustomActivityCNS`**

```text
export function calculateCustomActivityCNS(template: CustomActivityTemplate): number {
  // If the activity has exercises, use standard calculation
  if (template.exercises?.length > 0) {
    return template.exercises.reduce((sum, ex) => sum + calculateExerciseCNS(ex as any), 0);
  }
  // Duration-based estimation for activities without exercise blocks
  const durationMinutes = template.duration_minutes || 30;
  const intensityMultiplier = template.intensity === 'max' ? 1.5
    : template.intensity === 'high' ? 1.2
    : template.intensity === 'moderate' ? 1.0
    : 0.7;
  const typeBase = TYPE_CNS_BASES[template.activity_type] || 15;
  return Math.round(typeBase * (durationMinutes / 30) * intensityMultiplier);
}
```

With `TYPE_CNS_BASES`:
```text
workout: 30, running: 25, practice: 25, short_practice: 20,
warmup: 10, recovery: 5, meal: 0, free_session: 15
```

**Integration point**: The Game Plan daily load calculation (which calls `calculateDayLoadMetrics`) must also sum CNS from completed custom activities. This is handled in the `calculate-load` edge function -- add custom activity data to its input.

---

## E. Nutrition and Weight Input Bug Fix

**File: `src/components/nutrition-hub/TDEESetupWizard.tsx`**

After reviewing the code, the weight input uses `type="number"` with `parseInt`-style validation. Issues found:

1. **Line 69**: `parseFloat(weightLbs) > 0` -- correct for decimals
2. **Line 80**: Validation `parseFloat(weightLbs) >= 80 && parseFloat(weightLbs) <= 400` -- this rejects weights under 80 lbs (problematic for young athletes aged 5-13 who may weigh 40-79 lbs)
3. **Line 111**: `weight: weightLbs` saves as string, not number -- the `profiles.weight` column type needs verification. If it's numeric, this could cause silent failures.

**Fixes:**
- Change weight validation range from `80-400` to `30-500` to support youth athletes
- Ensure `weight` is saved as a number: `weight: parseFloat(weightLbs)` on line 111
- Add `step="0.1"` to the weight input to explicitly allow decimal values
- Add visible validation error messages (currently the "Next" button just disables with no explanation)

**File: `src/components/vault/VaultFocusQuizDialog.tsx`**

Weight inputs in the Vault check-in (lines 863-867, 1250-1254, 1519-1523) already use `parseFloat` for saving. Verify these also accept decimals and don't produce NaN. Add `step="0.1"` to those inputs as well.

---

## Technical Summary

| File | Changes |
|------|---------|
| `FolderDetailDialog.tsx` | Add up/down arrow buttons; add per-week "Add Activity" button; expand coach permission panel; replace `isOwner` with `canEdit`; add duplicate item action |
| `FolderBuilder.tsx` | No changes needed (title already correct) |
| `loadCalculation.ts` | Add `calculateCustomActivityCNS` function; add type bases for all activity types |
| `TDEESetupWizard.tsx` | Fix weight range (30-500), save as number, add step="0.1", add validation messages |
| `VaultFocusQuizDialog.tsx` | Add step="0.1" to weight inputs |
| **DB Migration** | Create `folder_coach_permissions` table with RLS policies |

## What This Does NOT Change

- The existing drag-and-drop system (remains for advanced users)
- The cycle calculation logic (`getCurrentCycleWeek` -- already correct)
- The folder builder UI (already has the correct title and visual cards)
- The edge function architecture (calculate-load, detect-overlaps, suggest-adaptation)

