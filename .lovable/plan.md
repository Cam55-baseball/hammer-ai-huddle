

# Hide Pitch Location Grid for Tee Sessions & Enlarge Plate

## Problem
When a player selects Tee as the rep source, the `PitchLocationGrid` (5×5 strike zone) still appears during rep logging. This is illogical — there is no pitch being thrown. Only the `TeeDepthGrid` (home plate depth zones) should be shown. Additionally, the plate SVG is too small (`w-24`) for comfortable mobile use.

## Changes

### `src/components/practice/RepScorer.tsx`
- Around line 613-630, wrap the `PitchLocationGrid` in a `!isTee` conditional so it only renders when the rep source is not `tee`
- When `isTee`, render only the `TeeDepthGrid` without the side-by-side layout (remove the `flex gap-3` wrapper, let the plate take full width)

### `src/components/practice/TeeDepthGrid.tsx`
- Increase SVG width class from `w-24` to `w-44` (or similar) so the plate is significantly larger and easier to tap
- Adjust label sizing slightly for the larger visual

| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | Conditionally hide `PitchLocationGrid` when `isTee`; adjust layout |
| `src/components/practice/TeeDepthGrid.tsx` | Increase plate SVG size from `w-24` to `w-44` |

