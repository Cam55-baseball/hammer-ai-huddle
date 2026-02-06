

# Definitive Fix: Kill Horizontal Overflow in Create Activity Dialog

## Why Every Previous Fix Failed

Radix ScrollArea's Viewport component internally wraps ALL children in a div with:

```text
<div style="min-width: 100%; display: table">
  {children}
</div>
```

CSS `display: table` makes the container size to its content's intrinsic width, ignoring the parent's width constraint. This means:

- Adding `overflow-hidden` to children does NOT prevent the expansion -- the table layout has already sized wider
- Adding `min-w-0` to flex items doesn't help -- they're inside a table cell that already expanded
- Reducing padding helps marginally but doesn't fix the root cause

The fix must happen at the `display: table` div level itself.

## The Fix (2 changes, bulletproof)

### Change 1: Add a CSS class to neutralize Radix's table layout (index.css)

Create a utility CSS class that targets the auto-generated `display: table` div inside ScrollArea and overrides it:

```css
/* Prevent Radix ScrollArea table-layout from causing horizontal overflow */
.scroll-area-no-hscroll [data-radix-scroll-area-viewport] > div {
  display: block !important;
  min-width: 0 !important;
}
```

This targets the exact DOM structure:
```text
ScrollArea Root (.scroll-area-no-hscroll)
  > Viewport [data-radix-scroll-area-viewport]
    > div (style="min-width:100%; display:table")  <-- THIS gets overridden
      > our content
```

Changing `display: table` to `display: block` and `min-width: 100%` to `min-width: 0` makes the inner div behave like a normal block element that respects its parent's width constraint. The `!important` is necessary to override inline styles.

### Change 2: Apply the class to the dialog's ScrollArea (CustomActivityBuilderDialog.tsx)

On line 383, add the `scroll-area-no-hscroll` class:

```text
Current:  <ScrollArea className="max-h-[calc(90vh-140px)] px-3 sm:px-6">
Fix:      <ScrollArea className="max-h-[calc(90vh-140px)] px-3 sm:px-6 scroll-area-no-hscroll">
```

This is scoped -- only this specific ScrollArea instance loses horizontal scroll capability. All other ScrollArea instances in the app (exercise library sidebar, workout timeline, etc.) continue to work normally.

## Why This Fixes Everything

Once the `display: table` is neutralized, the entire width chain becomes correct:

```text
Screen (375px)
  DialogContent (p-0)             = 375px
    ScrollArea Root               = 375px
      Viewport                    = 375px
        Inner div (NOW display:block, min-width:0) = 375px (constrained!)
          Our padding div (px-3)  = 375px - 24px = 351px
            Content               = 351px (FITS!)
```

Every single section the user listed -- Running Sessions, Block-Based Builder, Warmup Generator, Hammer Recommendations, Workout Timeline, Custom Fields, Recurring Days, Reminders -- all automatically fit within 351px because they're no longer inside a table layout that ignores parent width.

The existing `overflow-hidden` on line 384 and `min-w-0` classes on child components NOW become effective as secondary safety nets, because they're inside a `display: block` container that actually respects width constraints.

## Summary

| File | Change | Why |
|------|--------|-----|
| `src/index.css` | Add `.scroll-area-no-hscroll` CSS class | Override Radix's `display: table` and `min-width: 100%` inline styles |
| `CustomActivityBuilderDialog.tsx` line 383 | Add `scroll-area-no-hscroll` class to ScrollArea | Apply the fix to this specific instance only |

Two lines of code. No component restructuring. No scattered padding tweaks. This kills the root cause that made every previous fix ineffective.

