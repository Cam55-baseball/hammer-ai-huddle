
# Add Exercise Name Editing to Workout Timeline

## Problem

When a user adds an exercise and clicks the pencil (edit) icon, they can only edit sets, reps, duration, and rest. There is no way to change the exercise name, which forces users to delete and re-add if they want a different name.

## Fix

**File**: `src/components/custom-activities/WorkoutTimeline.tsx`

### Change 1: Add `name` to the edit state (line 52-57)

Add `name: exercise.name` to the `editValues` state so the name is included when editing begins.

### Change 2: Add a name input field at the top of the editing form (lines 160-161)

Insert a full-width text input for the exercise name above the existing sets/reps/duration/rest fields, with a "Name" label.

### Change 3: Include `name` in the save handler (line 75)

The `handleSave` function already spreads all `editValues` into the update -- since `name` will now be part of `editValues`, it will be saved automatically with no additional logic needed.

---

## Summary

- 1 file modified: `WorkoutTimeline.tsx`
- 2 small edits: add `name` to state, add name input to form
- No database changes, no new files
