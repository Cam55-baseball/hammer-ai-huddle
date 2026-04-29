## Goal

Rename the third option on the final step of the Welcome popup from **"Go to Your Game Hub"** to **"Go to Your Game Plan"**, and route it to the user's Game Plan on the dashboard (`/dashboard`) instead of `/game-scoring`.

## Changes

**`src/components/StartHereGuide.tsx`**
- Replace the `Trophy` icon import with `ListChecks` (better fits a daily plan/checklist).
- In step 3, update the third button:
  - Title: **Go to Your Game Plan**
  - Subtext: *Your daily to-do list, built for you*
  - Icon: `ListChecks`
  - `onClick={() => handleComplete('/dashboard')}`

The Game Plan card (`GamePlanCard`) already renders prominently on `/dashboard`, so navigating there lands the user on it.

## Validation

- Final step now shows: Log First Practice, Upload First Video, **Go to Your Game Plan**.
- Clicking it closes the popup, marks the tutorial complete, and navigates to `/dashboard` where the Game Plan is visible.
