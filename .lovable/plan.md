
# Fix: Double X Buttons in Real-Time Playback During Recording

## Problem
When starting recording in the Real-Time Playback feature, two X buttons appear in the top right corner. This happens because:

1. The Dialog component has a built-in close button (X) that's always visible
2. There's a custom X button in the header section
3. During fullscreen recording mode, both buttons become visible simultaneously

## Root Cause

The `DialogContent` component (from `src/components/ui/dialog.tsx`) automatically includes a close button:
```tsx
<DialogPrimitive.Close className="absolute right-4 top-4...">
  <X className="h-4 w-4" />
</DialogPrimitive.Close>
```

Meanwhile, `RealTimePlayback.tsx` adds its own close button in the header:
```tsx
<Button variant="ghost" size="icon" onClick={handleClose}>
  <X className="h-5 w-5" />
</Button>
```

When fullscreen mode activates (during countdown/recording), the camera container uses `fixed inset-0 z-[9999]`, but the Dialog's built-in X button at `z-50` still shows through because the container only covers the camera area, not the dialog's close button.

## Solution

Hide the Dialog's built-in close button since the component already has its own custom close button in the header. This can be done by adding a CSS class to hide the default close button.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/RealTimePlayback.tsx` | Add `[&>button]:hidden` class to DialogContent to hide the built-in X button |

### Implementation

Add the class `[&>button]:hidden` to the DialogContent which hides the auto-generated close button while keeping the custom header close button:

```tsx
<DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col bg-gradient-to-br from-background via-background to-muted/30 [&>button]:hidden">
```

The `[&>button]:hidden` selector targets direct child buttons of the DialogContent, which is where the default Radix close button is rendered.

## Why This Works

- The custom header with the X button provides the close functionality in a more appropriate location
- The built-in Dialog close button is redundant and causes visual duplication
- Hiding it with CSS is cleaner than modifying the shared Dialog component

## Alternative Considered

Another option would be to modify the Dialog component to accept a prop like `showCloseButton={false}`, but that would affect the shared component and require updating other usages. The CSS approach is more targeted.

## Testing

After the fix, verify:
1. Only one X button appears in the header at all times
2. Recording phase shows no stray X buttons
3. The remaining X button correctly closes the dialog
4. Fullscreen mode during countdown/recording has no floating X buttons
