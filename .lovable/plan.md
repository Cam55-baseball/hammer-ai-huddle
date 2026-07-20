## Goal

Let athletes jump directly to any onboarding question via a dropdown instead of having to stepping through with back/next every time.

## Changes

**1. `src/hooks/useHammerOnboardingDirector.ts**`

- Add `jumpTo(index: number)` that clamps to `[0, orderedGaps.length - 1]` and sets `activeIndex`.
- Expose `orderedGaps` (id + short question label) so the dropdown can render labels.
- Return both from the hook alongside existing `goBack` / `goForward`.

**2. `src/components/hammer/HammerOnboardingChat.tsx**`

- Replace the plain `{currentIndex + 1} / {totalGaps}` counter in the header with a shadcn `Select` (or a compact `Popover` + scrollable list — Select is enough).
- Trigger shows `{currentIndex + 1} / {totalGaps}` — same visual footprint so nothing else shifts.
- Content lists every gap as `1. <question>` (truncated), with a checkmark or muted style on already-resolved ones (using `dir.answers` / session resolved set) so the athlete can see what's left.
- Selecting an item calls `dir.jumpTo(i)`.
- Keep existing back arrow and submit button untouched.

## Out of scope

- No changes to persistence, gap order, or the review step.
- No new storage; jump is session-local, same as current back/forward.