# Fix middle-infielder starting positions

## Problem
In `src/components/game-scoring/fieldGeometry.ts`, SS and 2B are computed as `lerp(second, third, 0.35)` / `lerp(second, first, 0.35)` and then pulled an additional 8% toward home (`lerp(positions[pos], home, 0.08)`). That extra pull-toward-home places them noticeably in front of the baseline — too shallow vs. a real SS/2B alignment, which sits just behind the baseline on the edge of the outfield grass. The red dot in the screenshot confirms SS should be ~north (deeper) of where it currently renders.

This single file is the source of truth for every IQ situation diagram across baseball and softball (`getFieldGeometry(sport)` → `positions` / `positionsNormalized`), so fixing it here corrects every scenario at once.

## Change
In `getFieldGeometry`:

1. Re-anchor SS and 2B closer to second base so they sit just behind the baseline:
   - `SS = lerp(second, third, 0.42)`
   - `2B = lerp(second, first, 0.42)`
2. Remove the `for (const pos of ['2B','SS']) positions[pos] = lerp(positions[pos], home, 0.08)` pull-toward-home block entirely (this was the cause of the "too shallow" look).
3. Recompute `positionsNormalized` from the updated `positions` (already handled by the existing loop).

No changes to 1B/3B/OF/P/C — those already look correct in the reference image. No data migrations needed because every situation reads from this geometry helper.

## Verification
- Visually re-open `/iq/no-one-on-ball-in-gap` and a couple of other situations (one softball, one baseball) and confirm SS sits just behind the baseline near the cutout, 2B mirrors it on the other side, and OF/corner positions are unchanged.
