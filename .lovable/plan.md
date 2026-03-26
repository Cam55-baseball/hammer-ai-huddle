

# Fix Leading Zero in Sets/Reps for Custom Activity Exercises

## Problem
When editing sets or reps on exercises added from the exercise library, values get a leading `0` (e.g., typing `12` shows `012`). This happens in two components:

1. **WorkoutTimeline.tsx** (drag-drop builder): `parseInt(e.target.value) || 0` falls back to `0` when the field is cleared, and `type="number"` inputs on some browsers concatenate rather than replace.
2. **ExerciseBuilder.tsx** (simple builder): The reps field stores raw string input which can concatenate with the existing numeric value.

## Fix

| File | Change |
|------|--------|
| `src/components/custom-activities/WorkoutTimeline.tsx` | Lines 178-179, 188-189: Change `parseInt(e.target.value) || 0` to use empty string for display and proper number parsing. Use `e.target.value === '' ? '' : Number(e.target.value)` pattern so the input clears properly instead of showing `0`. Store `editValues.sets` and `editValues.reps` as `number | ''` to allow empty state during editing. |
| `src/components/custom-activities/ExerciseBuilder.tsx` | Line 168-169 (sets) and 180-181 (reps): Apply the same fix. For reps, since it supports range strings like "8-12", keep it as a text input but strip leading zeros on change with a simple replace: `e.target.value.replace(/^0+(?=\d)/, '')`. |

### Core pattern
```typescript
// Before (causes leading zero)
value={editValues.sets}
onChange={(e) => setEditValues(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}

// After (clean editing)
value={editValues.sets}
onChange={(e) => {
  const raw = e.target.value;
  setEditValues(prev => ({ ...prev, sets: raw === '' ? '' : parseInt(raw) }));
}}
```

And on save, coerce empty back to a sensible default before passing to `onUpdate`.

