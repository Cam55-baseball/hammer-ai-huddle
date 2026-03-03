

# Realistic Home Plate, Depth Grid, Strike Zone, and Pitch Type Logic

## Overview

Three interconnected upgrades: (1) true pentagon home plate with depth zones overlaid on its geometry, (2) strike zone grid with plate anchor and handedness for both hitter and pitcher, and (3) context-aware pitch type selection.

---

## 1. Realistic Home Plate + Depth Grid

**File: `src/components/practice/TeeDepthGrid.tsx`** -- Full rewrite

### Current Problems
- The plate SVGs are hexagons (6 points), not pentagons
- Depth zones are disconnected rectangles, not mapped to plate geometry

### Orientation (per user spec)
- **Flat back edge (17" wide) faces PITCHER** (top of visual)
- **Tip (point) faces CATCHER** (bottom of visual)
- This matches a top-down batter's perspective

### SVG Geometry (top-down view)
```text
    Pitcher (flat edge)
  ___________________
  |                 |    <- F+1 (front edge, shallowest)
  |                 |    <- F0  (front half)
  |                 |    <- C0  (center of plate)
   \               /     <- B0  (back half)
    \             /      <- B-1 (deepest contact, tip)
     \___________/
       Catcher (tip)
```

Pentagon polygon: flat top edge, two vertical sides dropping partway, then two angled sides meeting at a bottom point. Proportional to MLB 17" back edge.

### Depth Zones (5 horizontal slices)
Each zone is a clickable SVG region clipped to the pentagon shape:
- **F+1**: Front edge of plate (shallowest legal contact) -- top slice
- **F0**: Front half of plate
- **C0**: Center of plate
- **B0**: Back half of plate
- **B-1**: Back tip of plate (deepest contact) -- bottom triangular slice

Zones are drawn as polygon slices within the pentagon outline. The bottom two zones (B0, B-1) follow the angled sides converging to the tip. Labels are centered in each slice.

### Depth position data update
```typescript
const depthPositions = [
  { value: 1, label: 'Front edge (shallowest)', short: 'F+1' },
  { value: 2, label: 'Front half', short: 'F0' },
  { value: 3, label: 'Center of plate', short: 'C0' },
  { value: 4, label: 'Back half', short: 'B0' },
  { value: 5, label: 'Back tip (deepest)', short: 'B-1' },
];
```

Softball plate uses same pentagon shape but slightly wider proportions. Handedness mirroring preserved via CSS `scale-x-[-1]`.

---

## 2. Strike Zone Grid Enhancement

**File: `src/components/micro-layer/PitchLocationGrid.tsx`** -- Modify

### Changes
- Add a small pentagon home plate outline SVG centered below the 5x5 grid as a spatial anchor
- Flat edge at top (toward pitcher), tip at bottom (toward catcher)
- Scaled to match the grid width (~45px x 5 = ~225px grid, plate ~80px wide)
- Inner 3x3 green highlighting already works -- no change
- Handedness mirroring already works via `batterSide` prop -- no change

---

## 3. Pitch Type -- Context-Aware Visibility

### File: `src/components/practice/RepSourceSelector.tsx` -- Update exports

Add new export arrays:
```typescript
export const HIDES_PITCH_TYPE = ['tee', 'soft_toss'];
export const HIDES_PITCH_DISTANCE = ['tee', 'soft_toss'];
```

Update `REQUIRES_PITCH_TYPE` to include hitting sources:
```typescript
export const REQUIRES_PITCH_TYPE = [
  'machine_bp', 'live_bp', 'regular_bp', 'game', 'coach_pitch', 'front_toss',
  'bullpen', 'flat_ground'
];
```

### File: `src/components/practice/RepScorer.tsx` -- Modify hitting section

**Add pitch type selector for hitting reps** (currently only exists for pitching):
- When `repSource` is in `REQUIRES_PITCH_TYPE` and module is hitting, show pitch type buttons
- Use `pitchTypes` from `useSportConfig()` which returns correct baseball vs softball types
- For `machine_bp`: additionally show a "Preset Pattern" option alongside pitch types
- When `repSource` is in `HIDES_PITCH_TYPE`: hide pitch type entirely
- Import and use `HIDES_PITCH_TYPE` alongside existing imports

**Add pitcher handedness (L/R) selector for hitting reps**:
- Show a "Pitcher Hand" L/R toggle whenever `needsThrowerHand` is true (already covers the right sources)
- Currently `thrower_hand` is captured -- also store as `pitcher_hand` on the rep for clarity

### File: `src/components/practice/SessionConfigPanel.tsx` -- Modify

- Import `HIDES_PITCH_DISTANCE` and `HIDES_VELOCITY` from RepSourceSelector
- Conditionally hide the Pitch Distance slider when `repSource` is in `HIDES_PITCH_DISTANCE`
- Conditionally hide Velocity Band when `repSource` is in `HIDES_VELOCITY`

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/practice/TeeDepthGrid.tsx` | Rewrite: true pentagon SVG with 5 depth zones as clickable polygon slices |
| `src/components/micro-layer/PitchLocationGrid.tsx` | Add home plate pentagon outline below grid |
| `src/components/practice/RepScorer.tsx` | Add pitch type selector for hitting; add pitcher hand selector |
| `src/components/practice/RepSourceSelector.tsx` | Add `HIDES_PITCH_TYPE`, `HIDES_PITCH_DISTANCE` exports; update `REQUIRES_PITCH_TYPE` |
| `src/components/practice/SessionConfigPanel.tsx` | Hide pitch distance and velocity band for tee/soft toss |

## No Database Changes Required
All data points fit into existing `ScoredRep` interface fields and JSONB storage columns.

