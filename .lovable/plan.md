

# Fix: Custom Activity Builder Dialog Still Closing

## Root Cause

The previous fix added `onPointerDownOutside` and `onInteractOutside` prevention, but missed **`onFocusOutside`**. Radix Dialog fires three separate dismissal events:

1. `onPointerDownOutside` — click outside ✅ blocked
2. `onInteractOutside` — general interaction outside ✅ blocked  
3. `onFocusOutside` — focus moves outside ❌ **NOT blocked**

The dialog contains multiple portal-rendering components that steal focus away from the dialog DOM tree:
- `Select` dropdowns (intensity, distance unit) — render via Radix portal
- `BlockContainer`'s nested block-type `Dialog` — renders via portal
- `DragOverlay` from `@dnd-kit` — renders via portal
- `IconPicker`, `ColorPicker` — may use popovers/portals
- `MobileExerciseLibraryDrawer` — renders via portal

When any of these portals receive focus, Radix fires `onFocusOutside` → calls `onOpenChange(false)` → dialog closes.

## Fix

**File: `src/components/custom-activities/CustomActivityBuilderDialog.tsx`** (line 396)

Add `onFocusOutside` prevention alongside the existing handlers:

```tsx
<DialogContent 
  className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden"
  onPointerDownOutside={(e) => e.preventDefault()}
  onInteractOutside={(e) => e.preventDefault()}
  onFocusOutside={(e) => e.preventDefault()}
>
```

One file, one line changed. Users can still close via X button or Escape key.

