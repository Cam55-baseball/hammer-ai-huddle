## Goal

On the final step ("Take Your First Action") of the Welcome to Your Training Hub popup, add a third option: **"Go to Your Game Hub"**. Selecting it dismisses the popup, marks the tutorial complete, and navigates the user to `/game-scoring`.

## Changes

**`src/components/StartHereGuide.tsx`**
- Import the `Trophy` icon from `lucide-react` (alongside existing icons).
- In step 3, add a third button below "Upload First Video":
  - Label: **Go to Your Game Hub**
  - Subtext: *Score a live game and track stats*
  - Icon: `Trophy`
  - `onClick={() => handleComplete('/game-scoring')}`
  - Same `variant="outline"` styling as the Upload Video button so the primary CTA (Log First Practice) remains visually dominant.

No other steps, copy, or logic change. `handleComplete` already marks `tutorial_completed = true` and closes the dialog before navigating, so this option behaves consistently with the other two.

## Validation

- Open welcome popup → click Get Started → Continue → Almost Done → land on step 3.
- Three options visible: Log First Practice, Upload First Video, **Go to Your Game Hub**.
- Click Go to Your Game Hub → dialog closes, navigates to `/game-scoring`, success toast shows, popup does not reappear on refresh.
