
# Two Changes: Per-Custom-Field Log Sets + Full Activity Builder in Folders

## Problem 1: Log Sets is Activity-Level, Not Per-Custom-Field

Currently, `FolderItemPerformanceLogger` renders a single global "Log Sets" section per activity. The user wants each custom field (e.g., each exercise in the activity's custom fields) to have its own individual set-logging area. This means if an activity has 3 exercises defined as custom fields, each one gets its own weight/reps/time logger.

## Problem 2: Folder Item Creation is a "Lite" Version

The `FolderItemEditor` component is a stripped-down form with only: title, type, description, days, duration, and notes. It lacks all the features of the full `CustomActivityBuilderDialog`: activity type selection, exercises builder, meal/vitamin/supplement builder, custom fields, icon picker, color picker, intensity, running sessions, reminders, etc.

---

## Solution

### Part 1: Per-Custom-Field Log Sets

**File: `src/components/CustomActivityDetailDialog.tsx`**

Currently the Log Sets section (lines 685-708) renders a single `FolderItemPerformanceLogger` for the entire activity. Change this to render one logger PER exercise in the activity, so each exercise gets its own set-logging inputs.

- Instead of one `FolderItemPerformanceLogger`, iterate over the template's exercises array
- For each exercise, render a collapsible section with the exercise name as header and its own `FolderItemPerformanceLogger` instance
- Key each logger's data by exercise ID in `performance_data.exerciseSets` (e.g., `{ exerciseSets: { "exercise_abc": { sets: [...] }, "exercise_def": { sets: [...] } } }`)
- Also support custom fields of type `number` -- these should get a mini log-sets input inline
- Hide the single global logger; replace with per-exercise loggers

**File: `src/components/folders/FolderItemPerformanceLogger.tsx`**

- Add an optional `exerciseId` prop so the component knows which exercise's data to load/save from the parent `performance_data`
- When `exerciseId` is provided, scope the sets data to `performance_data.exerciseSets[exerciseId]` instead of the root `performance_data.sets`

### Part 2: Replace FolderItemEditor with CustomActivityBuilderDialog

**File: `src/components/folders/FolderDetailDialog.tsx`**

Replace the inline `FolderItemEditor` (used for adding new items to folders) with an "Add Activity" button that opens the full `CustomActivityBuilderDialog`. When saved:

1. The builder's output (a full `CustomActivityTemplate`-shaped object) is converted into an `ActivityFolderItem` with a complete `template_snapshot`
2. The item is inserted via the existing `onAddItem` callback
3. This ensures every folder item created inside a folder has full parity with custom activities

Changes:
- Remove the `FolderItemEditor` usage from the "Add Item" section
- Add a "Create Activity" button that opens `CustomActivityBuilderDialog`
- Keep the "Import from Activities" button (already works via `ActivityPickerDialog`)
- Wire the builder's `onSave` to construct a folder item with `template_snapshot` containing all the rich data

**File: `src/components/folders/FolderTabContent.tsx`**

Same change for the inline builders: replace `FolderBuilder` + `FolderItemEditor` pattern with a flow that uses `CustomActivityBuilderDialog` for item creation.

---

## Technical Details

### Per-Exercise Log Sets Data Structure

```text
performance_data = {
  checkboxStates: { ... },           // existing
  exerciseSets: {                     // NEW
    "exercise_abc": {
      sets: [{ set: 1, weight: 135, reps: 10, unit: "lbs" }]
    },
    "exercise_def": {
      sets: [{ set: 1, time: 30 }]
    }
  }
}
```

### FolderItemPerformanceLogger Changes

| Prop | Change |
|------|--------|
| `exerciseId?: string` | NEW - scopes data to a specific exercise |
| `exerciseName?: string` | NEW - displayed as header label |

When `exerciseId` is set:
- Load from `performanceData?.exerciseSets?.[exerciseId]?.sets`
- Save to `{ ...existingData, exerciseSets: { ...existing, [exerciseId]: { sets } } }`

### CustomActivityDetailDialog Log Sets Section

Replace the single logger block (lines 685-708) with:

```text
For each exercise in template.exercises:
  <Collapsible>
    <CollapsibleTrigger> exercise.name - Log Sets </CollapsibleTrigger>
    <CollapsibleContent>
      <FolderItemPerformanceLogger
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        ...
      />
    </CollapsibleContent>
  </Collapsible>
```

### Folder Item Creation via Builder

When `CustomActivityBuilderDialog.onSave` fires inside the folder context:

```text
const folderItem = {
  title: data.title,
  description: data.description,
  item_type: mapActivityType(data.activity_type),
  duration_minutes: data.duration_minutes,
  exercises: data.exercises,
  template_snapshot: {
    icon: data.icon,
    color: data.color,
    activity_type: data.activity_type,
    intensity: data.intensity,
    meals: data.meals,
    custom_fields: data.custom_fields,
    intervals: data.intervals,
    embedded_running_sessions: data.embedded_running_sessions,
    duration_minutes: data.duration_minutes,
    exercises: data.exercises,
    display_nickname: data.display_nickname,
    custom_logo_url: data.custom_logo_url,
  },
};
await onAddItem(folderId, folderItem);
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/folders/FolderItemPerformanceLogger.tsx` | Add `exerciseId` and `exerciseName` props; scope data read/write to per-exercise |
| `src/components/CustomActivityDetailDialog.tsx` | Replace single Log Sets with per-exercise loggers |
| `src/components/folders/FolderDetailDialog.tsx` | Replace `FolderItemEditor` with "Create Activity" button that opens `CustomActivityBuilderDialog`; keep import button |
| `src/components/folders/FolderTabContent.tsx` | Minor: ensure the player folder "Create" also uses the full builder |
