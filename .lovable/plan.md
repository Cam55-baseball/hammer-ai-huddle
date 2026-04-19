
## Fix Plan — Make Calendar Day Close Button Clearly Visible and Tappable on Mobile

### What I found
- The calendar day view is `src/components/calendar/CalendarDaySheet.tsx`, and it uses the shared `Sheet` component from `src/components/ui/sheet.tsx`.
- The shared `Sheet` close button already has the larger mobile hit area (`p-2`, `h-6 w-6`), so the remaining problem is not just size.
- It is still styled with low visual prominence (`opacity-70`, subtle/default foreground), which matches your report that it still looks like a small light gray “X”.

### Plan
1. **Make the close control visually obvious on mobile**
   - Update the shared sheet close button in `src/components/ui/sheet.tsx` to use:
     - stronger foreground color
     - visible background on mobile
     - rounded touch target
     - border/shadow so it stands out against the calendar header
   - Keep desktop styling close to current behavior.

2. **If needed, promote the calendar day sheet close button specifically**
   - If the shared change would affect too many other sheets, I’ll give `CalendarDaySheet.tsx` its own more prominent close button in the header area and hide/de-emphasize the default one for that sheet only.
   - This keeps the calendar fix precise while avoiding unintended changes elsewhere.

3. **Preserve behavior**
   - No calendar logic changes.
   - No changes to filters, event rendering, or sheet open/close behavior.
   - Only visibility and tap-target styling.

### Likely implementation
- `src/components/ui/sheet.tsx`
  - replace low-contrast close styling with a mobile-first control that is clearly visible
  - likely use stronger classes such as foreground text, solid/translucent background, border, and shadow
- possibly `src/components/calendar/CalendarDaySheet.tsx`
  - add a dedicated close button near the title if the shared primitive still isn’t prominent enough

### Verification
- On mobile viewport, the close button should:
  - be immediately visible without hunting for it
  - look intentional, not faded/light gray
  - be easy to tap with one thumb
- Desktop should remain functionally unchanged.

### Notes
- Based on the current code, this is a styling/prominence issue more than a raw icon-size issue.
- I will treat the calendar day sheet as the priority target so the fix is unmistakable there.
