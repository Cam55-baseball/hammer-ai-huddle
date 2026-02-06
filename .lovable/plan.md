

# Comprehensive Mobile Overflow Fix -- Create Activity Dialog

## Problem

The Create Activity dialog still has horizontal scrolling on mobile despite prior fixes. The root issue is a **cascade of nested containers** that all contribute padding, eating into the available width, combined with several child components that don't properly constrain their content.

## Width Budget Analysis (375px iPhone)

```text
Screen                        375px
  DialogContent (p-0)        -0px    = 375px  (good, p-0 override)
    DialogHeader (p-6)       -48px   = 327px  (header only, OK)
    ScrollArea (px-6)        -48px   = 327px  (THIS IS THE BOTTLENECK)
      Inner div (py-4)       -0px    = 327px
        Card/section (p-4)   -32px   = 295px
          CardHeader (p-6)   -48px   = 247px  <-- too narrow for any content
```

The `ScrollArea` uses `px-6` (24px each side) which is fine for simple inputs but devastating for nested cards like the AI Recommendations and Warmup Generator that add their own padding layers.

## Root Causes (7 specific issues)

### 1. ScrollArea px-6 is too generous on mobile
Line 383: `<ScrollArea className="max-h-[calc(90vh-140px)] px-6">` -- 24px padding per side. Needs to drop to `px-3` on mobile (`px-3 sm:px-6`).

### 2. DialogHeader p-6 wastes space on mobile
Line 362: `<DialogHeader className="p-6 pb-0">` -- 24px left/right. Should be `p-4 sm:p-6 pb-0`.

### 3. Footer p-6 can overflow
Line 808: `<div className="flex items-center justify-between gap-3 p-6 pt-4 border-t">` -- Buttons can get cramped with 24px each side. Should be `p-4 sm:p-6 pt-4`.

### 4. "Schedule for Today" section text overflow
Line 463-481: The flex row with icon + text + switch doesn't have `min-w-0` on the text container, allowing long translated text to push the switch off-screen.

### 5. Embedded running session "Remove Session" button
Line 601-614: The flex row `flex items-center justify-between` for "Session 1" + "Remove Session" button -- the button text can push past container on narrow screens. Needs truncation or icon-only on mobile.

### 6. Block system toggle description overflow
Line 716-733: The label text "Organize exercises into structured blocks with intelligent load tracking" is long and can overflow in the flex row with the switch.

### 7. Card Customization section needs overflow protection
Line 541-564: The card customization container and the Logo upload area work fine, but the outer container lacks `overflow-hidden`.

## Fix Plan (Single file: `CustomActivityBuilderDialog.tsx`)

### Change 1: Reduce ScrollArea horizontal padding on mobile
```
px-6  -->  px-3 sm:px-6
```
This single change reclaims 24px on mobile, the biggest win.

### Change 2: Reduce DialogHeader padding on mobile
```
p-6 pb-0  -->  p-4 sm:p-6 pb-0
```

### Change 3: Reduce footer padding on mobile
```
p-6 pt-4  -->  p-4 sm:p-6 pt-4
```

### Change 4: Add min-w-0 and overflow protection to "Schedule for Today"
Add `min-w-0` to the label's inner div so the description text wraps instead of overflowing.

### Change 5: Fix embedded running session header
Add `min-w-0` to the session number span and make the remove button more compact with `whitespace-nowrap`.

### Change 6: Add min-w-0 to block system toggle label
Ensure the description text wraps within the flex container.

### Change 7: Add overflow-hidden to card customization and additional options sections
Safety net to catch any remaining edge cases from sub-components.

## Additional File: `WarmupGeneratorCard.tsx`

### Change 8: Reduce CardHeader padding on mobile
The warmup card sits inside the ScrollArea and uses default `CardHeader` padding (p-6). Override to `p-3 sm:p-6 pb-3` so it doesn't double up with the ScrollArea padding.

### Change 9: Stack header title and button on mobile
The "AI Warmup Generator" title + "Generate Warmup" button sit side by side and can get cramped. Stack them vertically on mobile.

### Change 10: Add overflow-hidden to the card itself

## Additional File: `WorkoutTimeline.tsx`

### Change 11: Constrain exercise name width
Line 127: `max-w-[120px]` is too restrictive on wider mobile but too generous inside the dialog. Change to a responsive approach with `truncate` and let the flex container control the width naturally.

## Additional File: `CustomFieldsBuilder.tsx`

### Change 12: Add overflow-hidden to field row container
Line 76: The main field row `flex items-center gap-2 p-3` needs `overflow-hidden` to prevent any stacked inputs from escaping on mobile.

## Summary

| File | Changes |
|------|---------|
| `CustomActivityBuilderDialog.tsx` | Reduce padding on ScrollArea/header/footer for mobile; add `min-w-0` to 3 flex containers; add `overflow-hidden` to sections |
| `WarmupGeneratorCard.tsx` | Reduce card padding on mobile; stack header elements; add `overflow-hidden` |
| `CustomFieldsBuilder.tsx` | Add `overflow-hidden` to field row |
| `WorkoutTimeline.tsx` | Fix exercise name truncation to be responsive |

All changes are CSS-only utility class adjustments. No logic or data changes. Desktop layout remains identical via `sm:` breakpoints.

