

# Make Cycle System Crystal Clear -- 10-Year-Old Friendly

## Problem

The cycle/rotation system works correctly in code but the UI provides zero visual explanation. Users see "Program Type" and "Rotating Program" with no understanding of what it does, how it affects their activities, or what "Week 2 of 4" means in practice.

## Changes

### 1. Rewrite FolderBuilder Cycle Section with Visual Explanation

**File: `src/components/folders/FolderBuilder.tsx`**

Replace the current "Program Type" section (lines 149-177) with a guided, visual explanation:

- Rename "Program Type" label to **"How should activities repeat?"**
- Replace the Select dropdown with two tappable cards (radio-style):
  - **Card 1: "Same Every Week"** with a one-line description: "Your activities show up every week, same routine."  Plus a small visual: `[Mon Tue Wed] -> [Mon Tue Wed] -> [Mon Tue Wed]`
  - **Card 2: "Rotating Program"** with: "Activities change each week in a cycle, then repeat." Plus a small visual: `[Wk1: Strength] -> [Wk2: Speed] -> [Wk3: Recovery] -> back to Wk1`
- When "Rotating Program" is selected, show an inline explainer box (styled like a tip/callout):
  - "Pick a start date and how many weeks your cycle lasts. Each activity you add will be assigned to a specific week. The system automatically knows which week you're in and only shows those activities on your Game Plan."
  - Visual example: "If you set a 3-week cycle starting Jan 6: Jan 6-12 = Week 1, Jan 13-19 = Week 2, Jan 20-26 = Week 3, Jan 27+ = back to Week 1"
- Keep the cycle length input but relabel to **"How many weeks before it repeats?"** with a stepper (not raw number input) clamped 2-12
- Start Date picker gets a helper: "When does Week 1 begin?"
- If no start date is set when Rotating is chosen, show a friendly warning: "Pick a start date so the system knows which week you're in!"

### 2. Improve Cycle Week Banner in FolderDetailDialog

**File: `src/components/folders/FolderDetailDialog.tsx`**

Upgrade the existing "Week X of Y" banner (lines 332-344) to be more informative:

- Change from a compact badge to a slightly larger info card
- Show: "You're in **Week 2** of your 4-week cycle"
- Add a sub-line: "Activities tagged 'Week 2' are showing. After this week, Week 3 activities will appear."
- The "Current week only" toggle stays, but relabel to: "Show only this week's activities"
- When toggle is OFF (showing all), group items visually with week headers: "-- Week 1 --", "-- Week 2 --", etc., plus "-- Every Week --" for untagged items

### 3. Clarify Cycle Week Selector in Activity Builder

**File: `src/components/custom-activities/CustomActivityBuilderDialog.tsx`**

When adding/editing an activity inside a rotating folder, the "Rotation Week" dropdown needs context:

- Relabel from "Rotation Week" to **"Which week does this belong to?"**
- Add helper text: "This activity will only show on your Game Plan during this week of the cycle"
- Include an "Every Week" option (sets cycle_week to null) with helper: "Shows up every week, no matter which cycle week it is"
- Show a visual indicator next to each option: "Wk 1 (current)" if that week is the active one

### 4. No Multi-Start-Date or Cross-Folder Co-Planning

Each folder is its own independent container. This is by design and should be stated clearly:

- In the FolderBuilder, add a small note under the rotation section: "Each folder runs its own schedule independently."
- No changes to cross-folder logic needed -- folders don't interact with each other's cycles

## Technical Summary

| File | Changes |
|------|---------|
| `src/components/folders/FolderBuilder.tsx` | Replace Select dropdown with visual card selector; add inline explainer with examples; relabel all fields to plain language; add stepper for cycle length |
| `src/components/folders/FolderDetailDialog.tsx` | Upgrade cycle banner to info card with context sentence; group items by week headers when showing all weeks |
| `src/components/custom-activities/CustomActivityBuilderDialog.tsx` | Relabel rotation week dropdown; add helper text; mark current week; add "Every Week" option explanation |

## What This Does NOT Change

- The database schema (no migrations needed)
- The Game Plan filtering logic (already working correctly)
- The `getCurrentCycleWeek` calculation (already correct)
- Cross-folder behavior (folders remain independent by design)
- The ability to have multiple folders with different rotation schedules (already supported)
