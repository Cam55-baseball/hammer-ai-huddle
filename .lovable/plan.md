## Goal

Ensure the "Welcome to Your Training Hub" popup is dismissed permanently when a user closes it via the X button — same behavior as completing the full walkthrough. Today, only finishing the last step writes `tutorial_completed = true`; closing with X just hides the dialog locally, so it reopens on the next page load.

## Root cause

In `src/components/DashboardLayout.tsx`, the Dialog's `onOpenChange` handler (`setTutorialOpen`) only updates local state. The DB flag `profiles.tutorial_completed` is only written inside `StartHereGuide.handleComplete`, which fires only from the final step's CTAs. Closing via the X (or pressing Esc / clicking the overlay) skips that write, so on the next mount `DashboardLayout`'s `useEffect` re-reads `tutorial_completed = false` and auto-opens the dialog again.

## Fix

Persist `tutorial_completed = true` whenever the dialog is dismissed by the user — regardless of how (X button, Esc, overlay click, or finishing the flow).

### Changes

**`src/components/StartHereGuide.tsx`**
- Extract the "mark tutorial completed" DB write into a small helper (e.g. `markTutorialCompleted`).
- Wrap the Dialog's `onOpenChange` so that when the dialog transitions from open → closed, we call `markTutorialCompleted()` before invoking the parent's `onOpenChange(false)`. This covers X, Esc, and overlay clicks.
- `handleComplete` continues to set the flag (now via the same helper) so behavior on the final step is unchanged.
- Also optimistically update local UI assumptions so a second open in the same session doesn't auto-trigger.

**`src/components/DashboardLayout.tsx`**
- After the dialog closes, set `tutorialCompleted = true` in local state so the auto-open `useEffect` won't re-trigger if the component re-mounts before the next profile fetch.
- No DB write needed here (handled by the guide).

## Out of scope

- No copy, layout, or step changes.
- No changes to the auto-open trigger logic for genuinely new users (still opens once on first login).
- No new routes or DB schema changes — `profiles.tutorial_completed` already exists.

## Validation

- New user logs in → popup appears once.
- Click X (or press Esc, or click outside) → popup closes; navigate to any other route → popup does NOT reappear.
- Refresh the page → popup does NOT reappear.
- Existing users who already have `tutorial_completed = true` → unchanged, popup never shows.
- Completing the full walkthrough still works and still navigates to `/practice`.
