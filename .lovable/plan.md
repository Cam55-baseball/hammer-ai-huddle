

# Field Diagram — Move LF and RF Closer to Corners

## Change

**File: `src/components/game-scoring/FieldPositionDiagram.tsx`** (lines 23, 25)

| Position | Current | New | Reason |
|----------|---------|-----|--------|
| LF | (0.22, 0.25) | (0.25, 0.35) | Move closer to 3B (increase x slightly toward 3B, increase y toward infield) |
| RF | (0.78, 0.25) | (0.75, 0.35) | Move closer to 1B (decrease x slightly toward 1B, increase y toward infield) |

This shifts both corner outfielders down and inward toward their respective bases while keeping them in fair territory on the outfield grass.

| File | Change |
|------|--------|
| `src/components/game-scoring/FieldPositionDiagram.tsx` | Update LF and RF coordinates |

