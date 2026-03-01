

# Fix: Personalized Activity Save Logic + Game Plan Rendering

## Problem

Personalized Hammer AI workouts (and any activity with no custom fields) can fail to render properly on the Game Plan. Root causes identified across 4 files:

---

## Root Cause 1: `specific_dates` Never Persisted

**File**: `src/hooks/useCustomActivities.ts` (L144-172)

The `createTemplate` insert object includes `display_days`, `display_time`, `display_on_game_plan` but is **missing `specific_dates`**. Activities scheduled for specific dates silently lose their schedule on save, causing them to either show every day or not at all depending on fallback logic.

**Fix**: Add `specific_dates: data.specific_dates || null` to the insert object in `createTemplate`. Also add `specific_dates` to the `updateTemplate` update object.

---

## Root Cause 2: Initial Game Plan Query Missing `deleted_at` Filter

**File**: `src/hooks/useGamePlan.ts` (L492-496)

The initial fetch query does NOT filter `deleted_at IS NULL`:
```
.from('custom_activity_templates')
.select('*')
.eq('user_id', user.id)
.eq('sport', selectedSport)
// MISSING: .is('deleted_at', null)
```

The lightweight `refreshCustomActivities` (L760) **does** have this filter. This means on first load, soft-deleted activities can appear as ghost entries.

**Fix**: Add `.is('deleted_at', null)` to the initial templates query at L496.

---

## Root Cause 3: Game Plan Does Not Check `specific_dates` for Custom Activities

**File**: `src/hooks/useGamePlan.ts` (L524-556)

The filter checks `display_on_game_plan`, `calendar_skipped_items`, `recurring_days`, and `display_days` -- but never checks `specific_dates`. Only folder items (L620-625) evaluate specific dates.

**Fix**: After the existing `display_on_game_plan` check (L526), add:
```
const specificDates = (template.specific_dates as string[] | null) || [];
if (specificDates.length > 0) {
  if (!specificDates.includes(today) && !todayLog) return;
}
```

Apply the same logic in `refreshCustomActivities` (L782-806).

---

## Root Cause 4: Empty Activity Detail Dialog — No Interactive Elements

**File**: `src/components/CustomActivityDetailDialog.tsx` (L344-354)

When an activity has zero checkable items (no exercises, no custom fields, no meals, no intervals), `getAllCheckableIds` returns `[]`. The detail dialog renders:
- No progress badge (hidden by `totalCheckableCount > 0` guard)
- No checkboxes
- Only duration/intensity badges and a footer button

Users perceive this as "broken" because there is nothing to tap. Adding even one blank custom field adds a checkbox, making the card feel functional.

**Fix**: When `totalCheckableCount === 0`, render a "Quick Complete" empty state inside the dialog body:
- A centered message: "No sub-tasks to track"
- A prominent full-width "Mark Complete" button
- The progress badge shows a checkmark icon instead of "0/0"

This ensures activities with only a title + type still have a clear, tappable completion path.

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useCustomActivities.ts` | Add `specific_dates` to `createTemplate` insert + `updateTemplate` update |
| `src/hooks/useGamePlan.ts` | Add `deleted_at` filter to initial query; add `specific_dates` check to both filter blocks |
| `src/components/CustomActivityDetailDialog.tsx` | Add empty-state "Quick Complete" UI when zero checkable items |

## Execution Order

1. Fix `useCustomActivities.ts` -- persist `specific_dates` (independent)
2. Fix `useGamePlan.ts` -- `deleted_at` filter + `specific_dates` check (independent)
3. Fix `CustomActivityDetailDialog.tsx` -- empty state UX (independent)

All 3 are independent and execute in parallel. No database migration needed -- `specific_dates` column already exists in the schema.

