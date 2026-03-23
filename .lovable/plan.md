

# Field Diagram — Adjust OF and SS Positions

## Change

**File: `src/components/game-scoring/FieldPositionDiagram.tsx`** (lines 16-26)

Update `POSITION_ZONES` coordinates:

| Position | Current | New | Reason |
|----------|---------|-----|--------|
| LF | (0.30, 0.30) | (0.22, 0.25) | Push toward left foul line corner |
| CF | (0.50, 0.20) | (0.50, 0.28) | Move closer to 2B |
| RF | (0.70, 0.30) | (0.78, 0.25) | Push toward right foul line corner |
| SS | (0.42, 0.58) | (0.36, 0.64) | Midpoint between 2B and 3B, on the dirt |

All other positions unchanged.

| File | Change |
|------|--------|
| `src/components/game-scoring/FieldPositionDiagram.tsx` | Update LF, CF, RF, SS coordinates in POSITION_ZONES |

