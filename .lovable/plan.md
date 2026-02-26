

# Show Activity Details + Enable Editing in the Import Picker

## Overview
When importing existing activities into a folder, users currently only see a title, type badge, and a truncated description. This plan adds expandable detail views and an "Edit" button that opens the full activity builder so users can modify the source activity before (or instead of) importing.

---

## Changes

### 1. `src/components/folders/ActivityPickerDialog.tsx` -- Expandable details

- Add `expandedId` state to track which card is expanded (one at a time)
- Add a ChevronDown/ChevronUp toggle on each card (separate from the checkbox)
- When expanded, show:
  - Full description (remove `line-clamp-1`)
  - Exercise list from `t.exercises` array: name, sets x reps, weight + unit, duration, rest, notes
  - If exercises is empty/null, show "No exercises defined"

### 2. `src/components/folders/ActivityPickerDialog.tsx` -- Edit button

- Add a Pencil (edit) icon button per card
- Clicking it opens the `CustomActivityBuilderDialog` in edit mode, passing the template data
- To support this, fetch additional template fields (`intensity`, `meals`, `custom_fields`, `intervals`, `recurring_days`, `recurring_active`, `is_favorited`, `sport`, `icon`, `color`, `distance_value`, `distance_unit`, `pace_value`, `embedded_running_sessions`) in the query so the full `CustomActivityTemplate` shape is available
- Wire `onSave` to call `supabase.from('custom_activity_templates').update(...)` and refresh the local template list
- After saving edits, the updated data is reflected in the picker immediately

### 3. Template interface update

- Expand the local `Template` interface in `ActivityPickerDialog.tsx` to include all fields needed by `CustomActivityBuilderDialog`, or replace it with the existing `CustomActivityTemplate` type from `src/types/customActivity.ts`
- Update the `select()` query to fetch `*` instead of a limited column set

---

## Technical Details

### Expanded detail rendering

```text
[x] Morning Drink          [nutrition]  [edit] [v]
    Pre-workout hydration mix
    ─────────────────────────────────
    1. Protein Shake - 1 serving
       Notes: Mix with cold water
    2. Creatine - 5g
    ─────────────────────────────────
    Duration: 5m
```

### Edit flow

1. User clicks pencil icon on a card
2. `CustomActivityBuilderDialog` opens with `template={selectedTemplate}` in edit mode
3. User edits and saves
4. Dialog closes, picker refreshes the local template list from the database
5. Updated details are immediately visible in the picker

### Files Modified

| File | Change |
|------|--------|
| `src/components/folders/ActivityPickerDialog.tsx` | Add expandable detail view, edit button, integrate CustomActivityBuilderDialog, expand query to fetch full template data |

