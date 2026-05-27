## Goal

Make both **Game Plan** and **Command Center** on `/dashboard` clearly collapsible with a visible chevron arrow in the top-right corner of each section header. UI-only; no runtime, projection, or doctrine changes.

## Problem

- **Game Plan**: `GamePlanCollapsible` already wraps `GamePlanCard` with a header row + chevron, but the chevron is rendered as a small muted `ChevronDown` inside a low-contrast trigger row that visually blends with the card below — the user reports not seeing it.
- **Command Center**: `CommandCenterSection` has no outer collapse. Only an internal "Show more details" disclosure for secondary cards exists. The whole section cannot be hidden.

## Changes

### 1. `src/components/dashboard/GamePlanCollapsible.tsx` (edit)

Strengthen the trigger so the arrow is unmistakable in the top-right:

- Keep the existing `Collapsible` + `localStorage` persistence.
- Replace the muted `ChevronDown` with a bordered, circular icon button visual: `h-9 w-9 rounded-full border border-border bg-background text-foreground` with the chevron centered, pinned to the top-right via `justify-between`.
- Keep title "Game Plan" and subtitle on the left.
- Preserve `aria-expanded` and `aria-label`.

### 2. `src/components/dashboard/CommandCenterCollapsible.tsx` (new)

New thin wrapper mirroring `GamePlanCollapsible`:

- Header row (`min-h-14`, `rounded-xl border border-border bg-card`): title **"Command Center"**, subtitle **"How your body is doing today"**, and the same top-right circular chevron button.
- `Collapsible` with `open` persisted to `localStorage` key `dashboard.commandcenter.open` (default `true`).
- `CollapsibleContent` renders `<CommandCenterSection />` unchanged.
- No props beyond an optional `defaultSignalsOpen` passthrough.

### 3. `src/pages/Dashboard.tsx` (edit)

- Replace the existing bare `<CommandCenterSection />` mount (currently inside a `rounded-xl border ... p-4` div) with `<CommandCenterCollapsible />`. Remove the now-redundant outer wrapper div so the collapsible owns its border.
- `GamePlanCollapsible` mount stays as-is.

## Out of scope

- No edits to `CommandCenterSection` internals, `GamePlanCard`, projections, hooks, ASB events, replay/lineage, capability gates, parity tests, or any non-UI logic.
- No changes to `/today` or `/command`.
- No changes to scout/coach Game Plan branch (`CoachScoutGamePlanCard`).

## Files

- edit `src/components/dashboard/GamePlanCollapsible.tsx`
- new  `src/components/dashboard/CommandCenterCollapsible.tsx`
- edit `src/pages/Dashboard.tsx`
