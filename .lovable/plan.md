

# Clean Up Player Search Combobox Hover States

## Problem
The "Add from Roster" popover has messy hover behavior — the `CommandItem` rows have tightly packed elements (avatar, name, position badge, check icon) that shift or overlap awkwardly on hover/selection due to default cmdk highlight styles and insufficient spacing.

## Changes

### `src/components/game-scoring/PlayerSearchCombobox.tsx`
- Increase popover width from `w-72` to `w-80` for more breathing room
- Add explicit `items-center` and consistent gap spacing to each `CommandItem` using a wrapper div
- Make avatar, name, position badge, and check icon properly aligned with `flex gap-2`
- Add `py-2` padding to each item for better vertical spacing
- Ensure disabled (already-selected) items have a clear visual state with reduced opacity
- Extract a shared `PlayerRow` rendering helper to DRY up the linked/roster groups

### Summary
Single file change to `PlayerSearchCombobox.tsx` — wider popover, better flex layout with gaps, more vertical padding per row, and cleaner disabled styling.

