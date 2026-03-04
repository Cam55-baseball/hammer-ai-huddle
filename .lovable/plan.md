

# Move Catcher's View Label Above the Grid

## Change
In `src/components/micro-layer/PitchLocationGrid.tsx`, move the "👁️ Catcher's View — looking toward pitcher" paragraph from below the grid to above it, between the header row and the grid.

## File: `src/components/micro-layer/PitchLocationGrid.tsx`
- Move the `<p>` element (currently after the grid, ~line 78) to just before the `<TooltipProvider>` block (~line 44)

