

# Fix Custom Activity & Hammers Modality Editing on Game Plan

## Problems Found

1. **Cannot clear optional fields**: `updateTemplate` in `useCustomActivities.ts` uses `if (data.X !== undefined)` for every field. When a user removes duration, intensity, or distance, those values are `undefined` in the save payload and get silently skipped — the old values persist in the database.

2. **Double success toast on edit**: `updateTemplate` shows "Activity updated" toast (line 292), and `GamePlanCard`'s `onSave` shows a second "Activity saved" toast (line 1964). Users see two toasts stacked.

3. **CalendarDaySheet closes dialog even on failure**: The edit handler at line 917 calls `setEditDialogOpen(false)` unconditionally — if the update fails, the dialog still closes and the user loses their changes.

4. **CalendarDaySheet missing `onDelete` prop**: The `CustomActivityBuilderDialog` in `CalendarDaySheet` doesn't pass `onDelete`, so users editing from the calendar can't delete the activity.

## Changes

### 1. `src/hooks/useCustomActivities.ts` — Fix field clearing logic

Replace the `if (data.X !== undefined)` pattern with a check that includes explicit `null` values. Use `Object.prototype.hasOwnProperty` or check `key in data` to determine if a field was provided, so `undefined` and `null` values are properly sent to the DB as `null`:

```typescript
const fieldsToCopy = [
  'title', 'description', 'icon', 'color', 'exercises', 'meals',
  'custom_fields', 'duration_minutes', 'intensity', 'distance_value',
  'distance_unit', 'pace_value', 'intervals', 'is_favorited',
  'recurring_days', 'recurring_active', 'activity_type',
  'embedded_running_sessions', 'display_nickname', 'custom_logo_url',
  'reminder_enabled', 'reminder_time', 'display_on_game_plan',
  'display_days', 'display_time', 'specific_dates'
];

const updateData: Record<string, unknown> = {};
for (const field of fieldsToCopy) {
  if (field in data) {
    updateData[field] = (data as any)[field] ?? null;
  }
}
```

This ensures clearing a field (setting it to `undefined`) correctly writes `null` to the DB.

### 2. `src/components/GamePlanCard.tsx` — Remove duplicate toast

Remove `toast.success(t('customActivity.saved'))` from the `onSave` handler (line 1964), since `updateTemplate` already shows its own success toast.

### 3. `src/components/calendar/CalendarDaySheet.tsx` — Guard dialog close on success

Check the return value of `updateTemplate` before closing the dialog:

```typescript
onSave={async (data) => {
  const templateId = selectedTask.customActivityData?.template?.id;
  if (templateId) {
    updateSelectedTaskOptimistically(data);
    const success = await updateTemplate(templateId, data);
    if (success) {
      setEditDialogOpen(false);
      onRefresh?.();
    }
  }
}}
```

### 4. `src/components/calendar/CalendarDaySheet.tsx` — Add `onDelete` prop

Pass `onDelete` to the `CustomActivityBuilderDialog` so users can delete activities when editing from the calendar view.

## Files

| File | Change |
|------|--------|
| `src/hooks/useCustomActivities.ts` | Fix `updateTemplate` to use `in` checks so cleared fields write `null` to DB |
| `src/components/GamePlanCard.tsx` | Remove duplicate success toast on edit |
| `src/components/calendar/CalendarDaySheet.tsx` | Guard dialog close on success; add `onDelete` prop |

