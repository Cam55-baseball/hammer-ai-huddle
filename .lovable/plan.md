

# Fix: Custom Activity Builder Dialog Closes When Reaching Block Builder

## Root Cause

The `BlockContainer` component (rendered inside the Custom Activity Builder dialog when workout type is selected) contains:
1. A **nested `Dialog`** (block type selector, line 162 of `BlockContainer.tsx`)
2. A **`DragOverlay`** from `@dnd-kit` that renders via a DOM portal (outside the parent dialog's DOM tree)

Radix UI's `Dialog` monitors for "outside" interactions. When `@dnd-kit`'s `DragOverlay` portal mounts or the nested `Dialog` triggers focus management, Radix interprets these as interactions outside the parent dialog and fires `onOpenChange(false)`, closing the builder.

This is a known Radix UI + portal interaction conflict.

## Fix

**File: `src/components/custom-activities/CustomActivityBuilderDialog.tsx`**

Add `onPointerDownOutside` and `onInteractOutside` event handlers to the parent `DialogContent` to prevent it from auto-dismissing due to portal-based children:

```tsx
<DialogContent
  className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden"
  onPointerDownOutside={(e) => e.preventDefault()}
  onInteractOutside={(e) => e.preventDefault()}
>
```

This stops the dialog from closing when Radix detects pointer events on portal-rendered children (DragOverlay, nested Dialog). Users can still close the dialog via the X button or Escape key.

**File: `src/components/elite-workout/blocks/BlockContainer.tsx`**

Add `modal={false}` to the nested block-selector Dialog so it doesn't fight with the parent dialog's focus trap:

```tsx
<Dialog open={showBlockSelector} onOpenChange={setShowBlockSelector} modal={false}>
```

Two files, two lines each.

