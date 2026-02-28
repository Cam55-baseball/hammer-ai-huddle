

# Bring Back & Optimize Cycle System — Full E2E Plan

## What Is the Cycle System?

The cycle system enables **multi-week rotating programs** within a folder. Instead of showing the same activities every week, a folder can rotate through different sets of activities on a repeating schedule.

**Example**: A 4-week off-season program where:
- Week 1: Heavy compound lifts
- Week 2: Explosive power drills
- Week 3: Endurance circuits
- Week 4: Active recovery / deload

After Week 4, it loops back to Week 1 automatically. The system calculates which week you're in based on the folder's start date.

## Current State

The database and types already support `cycle_type`, `cycle_length_weeks` (on folders) and `cycle_week` (on items). The `getCurrentCycleWeek()` utility function exists. However:

- The Game Plan does NOT filter items by their cycle week -- all items show regardless
- The folder detail view displays "Wk 2" labels but doesn't filter by current week
- The UI for setting cycle type exists in FolderBuilder but lacks any explanation
- There's no visual indicator showing "You are in Week X of Y"

## Changes

### 1. Add Clear User-Facing Explanations to FolderBuilder

**File: `src/components/folders/FolderBuilder.tsx`**

Upgrade the Cycle Type section with:
- Rename options to clearer labels: "Same Every Week" (weekly) and "Rotating Program" (custom_rotation)
- Add inline help text below the selector explaining what each mode does
- When "Rotating Program" is selected, show: "Activities tagged with the current rotation week will appear on your Game Plan. The system auto-advances each week based on your start date."
- Make Start Date required when Rotating Program is selected (needed to calculate current week)

### 2. Add Cycle Week Indicator to Folder Detail View

**File: `src/components/folders/FolderDetailDialog.tsx`**

When a folder uses `custom_rotation`:
- Show a prominent badge/banner: "Week 2 of 4" (calculated via `getCurrentCycleWeek`)
- Add a toggle: "Show all weeks" vs "Show current week only" so users can see the full program or just today's items
- Group items visually by their `cycle_week` label when showing all weeks

### 3. Wire Cycle Week Filtering into the Game Plan

**File: `src/hooks/useGamePlan.ts`** (lines 610-617)

Update the `todayItems` filter to also respect cycle weeks:
- For folders with `cycle_type === 'custom_rotation'`, calculate the current week using `getCurrentCycleWeek(folder.start_date, folder.cycle_length_weeks)`
- Only include items where `item.cycle_week === currentWeek` (or `cycle_week` is null, meaning "show every week")
- Items without a `cycle_week` in a rotating folder always appear (backwards compatible)

```text
// Pseudocode for enhanced filter:
const todayItems = allItems.filter(item => {
  const folder = folderMap.get(item.folder_id);
  
  // Cycle week filter for rotating programs
  if (folder.cycle_type === 'custom_rotation' && folder.start_date && folder.cycle_length_weeks) {
    const currentWeek = getCurrentCycleWeek(folder.start_date, folder.cycle_length_weeks);
    if (item.cycle_week !== null && item.cycle_week !== currentWeek) return false;
  }

  // Existing day/date filter (unchanged)
  ...
});
```

### 4. Add Cycle Week Selector to Activity Builder (Folder Context)

**File: `src/components/custom-activities/CustomActivityBuilderDialog.tsx`**

When the builder is opened from within a rotating-program folder:
- Pass `cycleType` and `cycleLengthWeeks` as optional props
- Show a "Rotation Week" dropdown (Wk 1, Wk 2, etc.) so the user can tag which week this activity belongs to
- Save the value as `cycle_week` on the folder item

**File: `src/components/folders/FolderDetailDialog.tsx`**

Pass `folder.cycle_type` and `folder.cycle_length_weeks` to the builder dialog when creating/editing items.

### 5. Display Cycle Week on Calendar View

**File: `src/components/GamePlanCalendarView.tsx`**

For folder tasks from rotating programs, show a small "Wk X" badge next to the activity name in the calendar scheduled activities list.

## Technical Summary

| File | Changes |
|------|---------|
| `src/components/folders/FolderBuilder.tsx` | Rename cycle options to user-friendly labels; add inline explanation text; require start date for rotating programs |
| `src/components/folders/FolderDetailDialog.tsx` | Add "Week X of Y" banner for rotating folders; add current-week filter toggle; pass cycle props to builder |
| `src/hooks/useGamePlan.ts` | Filter folder items by current cycle week for `custom_rotation` folders |
| `src/components/custom-activities/CustomActivityBuilderDialog.tsx` | Add optional cycle week selector when used inside a rotating folder |
| `src/components/GamePlanCalendarView.tsx` | Show "Wk X" badge on rotating-program folder tasks |
| `src/types/activityFolder.ts` | No changes needed -- `getCurrentCycleWeek` and types already exist |

## User Experience Summary

- **Creating a folder**: User picks "Rotating Program", sets cycle to 4 weeks, sets a start date. Inline text explains: "Your activities will rotate through 4 weeks automatically."
- **Adding activities**: When adding an activity to a rotating folder, user picks which week it belongs to (Wk 1, 2, 3, or 4). Leaving it blank means "show every week."
- **Viewing the folder**: A banner says "You're in Week 2 of 4." Items are grouped by week. Toggle to see all or just current week.
- **Game Plan**: Only the current rotation week's activities appear automatically. No manual intervention needed.

