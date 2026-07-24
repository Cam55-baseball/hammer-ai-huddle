Current state
--------------
In `src/components/GamePlanCard.tsx`, the Hide/Show toggle is currently in the right-hand action-button row:
- Expanded view: lines ~1896-1905 ("Hide" with `EyeOff` icon)
- Collapsed view: lines ~1798-1807 ("Show plan" with `Eye` icon)
On mobile, the label is hidden via `hidden sm:inline`, so users see only the icon and do not know what it means.

Plan
----
1. Move the Hide/Show toggle into the top-right of the Game Plan card header so it is a standalone, discoverable control.
2. Keep an icon + label ("Hide" / "Show plan") visible at all breakpoints so users know what the button does.
3. Preserve the existing `planHidden` localStorage state and the collapsed behavior (when hidden, only the title + "Log Meal" + "Quick Note" remain).
4. In the collapsed view, place the "Show plan" button in the same top-right corner.
5. Ensure the button does not overlap the title or the decorative stripe on small screens.

Technical details
-----------------
- Refactor the two toggle buttons in `GamePlanCard.tsx` into a single small component (e.g., `GamePlanVisibilityToggle`) that receives `hidden` and `onToggle`.
- Render it inside the card header row, aligned to the far right using flex (`ml-auto` / `justify-between`) rather than absolute positioning, to avoid overlap with long titles on mobile.
- Remove the `hidden sm:inline` restriction on the toggle's label for this button; use a compact `size="sm"` to keep mobile fit.
- Keep `title` and `aria-label` for accessibility.
- Leave the other action buttons (Schedule Practice, Skip Day, etc.) in their existing row below the header.
- Verify the result at 393px mobile width and desktop.

No backend or data-model changes are required.