

# Fix Horizontal Overflow in Hammer Workout Recommendations (Mobile)

## Root Cause

The content overflows because of **excessive nested padding** on mobile. Here's the width breakdown on a 375px screen:

```text
Dialog          ~375px  (full screen on mobile)
  ScrollArea    -48px   (px-6 = 24px each side)  => 327px
    Container   -32px   (p-4 = 16px each side)   => 295px
      Card      -0px    (no margin)               => 295px
        Header  -48px   (default p-6)             => 247px
```

At 247px, the title + "Use This" button can't fit side by side, causing the overflow that gets clipped by `overflow-hidden`.

## Changes (single file: `AIWorkoutRecommendations.tsx`)

### 1. Reduce outer container padding on mobile
Change `p-4` to `p-2 sm:p-4` on the main wrapper div (line 286). Saves 16px on mobile.

### 2. Reduce card padding on mobile
- `CardHeader`: override default `p-6` with `p-3 sm:p-6 pb-2` (line 168). Saves 24px on mobile.
- `CardContent`: override with `p-3 sm:p-6 pt-0` (line 204). Keeps content aligned.

### 3. Stack title and button vertically on mobile
Instead of `flex-wrap` side-by-side, make the header container always stack the title block and button:
- The title block takes `w-full min-w-0`
- The "Use This" button sits below, aligned to the right using `self-end` or `ml-auto`
- This guarantees the button is always visible and the title has full width to wrap

### 4. Add `min-w-0` to reasoning text flex container
The `<div className="flex items-start gap-2">` wrapping the reasoning text needs `min-w-0` so the flex child can shrink and allow `break-words` to work properly.

### 5. Add `overflow-hidden` and width constraints to exercise badges container
The `flex flex-wrap gap-1` container for exercise badges already wraps, but individual badges with long names like "Dynamic Ankle Mobility Drills (Left Ankle Only)" need `max-w-full truncate` to prevent a single badge from exceeding the container width.

## Summary

| Location | Current | Fix |
|----------|---------|-----|
| Outer container padding | `p-4` | `p-2 sm:p-4` |
| CardHeader padding | default `p-6` | `p-3 sm:p-6 pb-2` |
| CardContent padding | default + `pt-0` | `p-3 sm:p-6 pt-0` |
| Header layout | `flex flex-wrap` with `justify-between` | Stack vertically: title full-width, button below |
| Reasoning container | `flex items-start gap-2` | Add `min-w-0` |
| Exercise badges | No width constraint | Add `max-w-full truncate` |

All changes are CSS-only in a single file. Desktop layout stays the same thanks to `sm:` breakpoints.

