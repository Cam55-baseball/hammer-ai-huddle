
# Fix Plan: Block-Based Workout Support in CustomActivityDetailDialog

## Problem

When opening the "Fascia" custom activity (or any block-based workout), the app crashes with:

```
TypeError: exercises.forEach is not a function
```

This error originates in `CustomActivityDetailDialog.tsx` at line 28 in the `getAllCheckableIds` function.

## Root Cause

The Elite Workout system stores exercises in two formats:

1. **Traditional array format**: `exercises: [{ id, name, sets, reps, ... }, ...]`
2. **Block-based format**: `exercises: { _useBlocks: true, blocks: [{ name, exercises: [...] }, ...] }`

The `getAllCheckableIds` function (lines 27-28) incorrectly assumes `exercises` is always an array:

```typescript
const exercises = (template.exercises as Exercise[]) || [];
exercises.forEach(e => ids.push(`exercise_${e.id}`));  // CRASHES HERE
```

When `exercises` is a block-based object, calling `.forEach()` fails because objects don't have this method.

## Solution

Update `getAllCheckableIds` to detect and handle both formats:

1. For **traditional arrays**: iterate exercises directly
2. For **block-based workouts**: iterate through `blocks[].exercises[]` to get all checkable exercise IDs

### Code Changes

**File: `src/components/CustomActivityDetailDialog.tsx`**

Update the `getAllCheckableIds` function (lines 26-28):

```typescript
// Handle block-based workout system
if (template.exercises && typeof template.exercises === 'object' && '_useBlocks' in (template.exercises as any)) {
  const blockData = template.exercises as unknown as { 
    _useBlocks: boolean; 
    blocks: Array<{ name: string; exercises: Exercise[] }> 
  };
  // Iterate through all blocks and their exercises
  blockData.blocks?.forEach(block => {
    block.exercises?.forEach(e => ids.push(`exercise_${e.id}`));
  });
} else if (Array.isArray(template.exercises)) {
  // Traditional exercise array
  (template.exercises as Exercise[]).forEach(e => ids.push(`exercise_${e.id}`));
}
```

Additionally, add a new section to render block-based workouts in the dialog UI (after the traditional exercises section around line 266):

```typescript
{/* Block-Based Workout Section */}
{template.exercises && typeof template.exercises === 'object' && '_useBlocks' in (template.exercises as any) && (
  <div className="space-y-4">
    {/* Render each block with its exercises as checkable items */}
  </div>
)}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/CustomActivityDetailDialog.tsx` | Fix `getAllCheckableIds` + add block-based UI rendering |

## Technical Notes

- The fix follows the same pattern already used in `CustomActivityCard.tsx`
- Block exercises will be checkable just like traditional exercises
- Each block will be displayed as a collapsible section with its exercises

## Success Criteria

1. Clicking on "Fascia" (block-based workout) opens the detail dialog without error
2. Block-based exercises are displayed organized by block name
3. Each exercise within blocks can be checked off
4. Progress counter shows total exercises across all blocks
5. Traditional array-based activities continue to work unchanged
