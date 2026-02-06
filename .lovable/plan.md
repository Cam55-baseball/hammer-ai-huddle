

# Fix Horizontal Overflow in Hammer Workout Recommendations (Final Solution)

## Root Cause Identified

The previous fixes (padding reduction, `overflow-hidden`, `break-words`) haven't fully resolved the overflow because of a **fundamental Radix ScrollArea behavior**. The Radix `ScrollArea` Viewport internally wraps all children in a div with:

```css
min-width: 100%;
display: table;
```

This `display: table` layout allows content to **expand the container beyond its parent width** -- the table layout algorithm sizes columns to fit content, ignoring the parent boundary. `overflow-hidden` clips the visual output but doesn't prevent the content from being laid out wider, which causes the horizontal scroll.

## The Fix (3 targeted changes)

### 1. Neutralize the Radix table layout (CustomActivityBuilderDialog.tsx)

The inner `div` inside `ScrollArea` (line 384) needs to break the table-layout expansion chain. Adding `overflow-hidden` to this div forces it to establish a new block formatting context, preventing children from expanding the table cell.

```
Current:  <div className="space-y-6 py-4">
Fix:      <div className="space-y-6 py-4 overflow-hidden">
```

This single change is the most impactful -- it stops ALL children (AI recommendations, warmup generator, block builder, etc.) from being able to push the ScrollArea's internal table-layout div wider than the viewport.

### 2. Fix the AIWorkoutRecommendations header bar (AIWorkoutRecommendations.tsx)

The header bar (line 287) uses `flex items-center justify-between` with two groups of buttons that don't wrap. On mobile (335px content width), the title "Hammer Recommendations" plus the "Generating..." button with text can exceed the available width.

Fix the header to wrap properly:
- Make the header `flex-wrap` so the buttons can drop to the next line
- Add `min-w-0` to the title group so it can shrink
- Make the button text responsive: show icon-only on mobile for the refresh button

### 3. Constrain the DragDropExerciseBuilder container (DragDropExerciseBuilder.tsx)

The `DragDropExerciseBuilder` wraps the AI recommendations and is itself inside the table-layout div. It needs `overflow-hidden min-w-0` on its root div (line 146) to act as a secondary constraint.

Also, the button row (line 154) that contains "Hammer", "Add", and "Library" buttons uses `flex-wrap` but doesn't have `min-w-0` on the outer container -- adding it ensures the flex children can shrink.

## Summary

| File | Line | Change |
|------|------|--------|
| `CustomActivityBuilderDialog.tsx` | 384 | Add `overflow-hidden` to inner ScrollArea div to break Radix table-layout expansion |
| `AIWorkoutRecommendations.tsx` | 287 | Add `flex-wrap` and `min-w-0` to header; make refresh button text responsive |
| `DragDropExerciseBuilder.tsx` | 146 | Add `overflow-hidden min-w-0` to root container |

All changes are CSS-only. The key insight is that fix #1 (the `overflow-hidden` on the ScrollArea's inner div) is the structural fix that addresses the underlying Radix behavior, while fixes #2 and #3 handle specific child components that contribute wide content.

