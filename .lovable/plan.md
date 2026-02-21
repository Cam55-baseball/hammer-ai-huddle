

# Make Custom Fields Fully Interactive (Daily Input)

## The Problem

Right now, when users open a custom activity card on their Game Plan, only **checkbox** fields are interactive (tap to check/uncheck). Number, text, and time fields show a **static value from when the card was created** -- there is no way to enter today's actual sprint time, weight used, or notes.

This means:
- A user creates a field called "Sprint Time" with type Number, but can never log daily sprint times
- The AI recap analysis we built for numbers/text will never receive data because nothing gets saved
- Users are understandably confused -- "Number" fields look like they should accept daily input, but they don't

## The Fix

Make **all custom field types** editable when viewing a card daily:

- **Checkbox**: Already works (tap to check/uncheck) -- no change needed
- **Number**: Show an inline input field so users can type today's value (e.g., "4.2" for sprint time, "185" for weight)
- **Text**: Show an inline text input for daily notes/observations
- **Time**: Show a time picker input for duration tracking

Daily values get saved to `performance_data.fieldValues` (alongside the existing `checkboxStates`), so each day's entries are independent and tracked over time for the AI recap.

## What Users Will Experience

1. Open a custom activity card on the Game Plan
2. Checkbox fields: tap to check (same as now)
3. Number/Text/Time fields: tap the value area to edit, type today's value, it auto-saves
4. The 6-week AI recap will now actually have daily data to analyze trends

## Technical Details

### File 1: `src/components/CustomActivityDetailDialog.tsx`

**Custom Fields section (lines 618-674)**: Replace the static display for number/text/time fields with editable inputs:
- Number fields: `<Input type="number">` that saves to `performance_data.fieldValues[field.id]`
- Text fields: `<Input type="text">` for daily observations
- Time fields: `<Input type="time">` for time entries
- Each input triggers `onUpdateFieldValue(fieldId, value)` which persists to the log's performance_data
- Show the template's default value as placeholder text, but display the daily-logged value if one exists

**Add new prop**: `onUpdateFieldValue?: (fieldId: string, value: string) => void`

### File 2: `src/components/GamePlanCard.tsx`

**Checkbox handler area (lines 1882-1930)**: Add a parallel `onUpdateFieldValue` handler that:
- Reads current `performance_data.fieldValues` from the log
- Merges the new field value
- Saves via `updateLogPerformanceData` (same mechanism as checkboxes)
- Uses optimistic UI updates (same pattern)

### File 3: `supabase/functions/generate-vault-recap/index.ts`

**Custom field analysis section**: Update the data extraction to read from `performance_data.fieldValues[fieldId]` for each log entry. The analysis code already handles number/text/time aggregation -- it just needs to look in `fieldValues` for the daily values instead of (or in addition to) the template defaults.

### File 4: `src/components/custom-activities/CustomFieldsBuilder.tsx`

**Guidance section update**: Clarify that:
- The "Value" column in the builder sets a **default/goal** value
- Users enter their **actual daily values** when viewing the card on the Game Plan
- Number fields example: "Set a goal like '4.0' -- you'll log your actual time each day"

### Data Shape

```
performance_data: {
  checkboxStates: { [fieldId]: true/false },   // existing
  fieldValues: { [fieldId]: "4.2" }             // NEW - daily values for number/text/time
}
```

This keeps full backward compatibility -- checkboxes continue working exactly as before, and the new `fieldValues` key is additive.
