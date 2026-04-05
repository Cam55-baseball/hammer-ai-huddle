

# Field Diagram + Spray Chart — Elite Redesign

## Current Issues

**Field Diagram:**
- Infield dirt is a rotated polygon — real fields have a rounded dirt cutout with curved edges behind the bases
- No batter's boxes, catcher's circle, or on-deck circles
- Mowing stripes are vertical rectangles — real stripes follow the outfield arc
- Warning track is a single stroke arc — should be a filled band
- Position zones use a separate normalized coordinate system (0-1) that doesn't align with the actual field geometry (pixel coords), causing visual drift
- Home plate shape is wrong (should be a pentagon with specific MLB dimensions)
- No backstop/foul territory detail behind home

**Spray Chart:**
- No sport differentiation — same geometry for baseball and softball
- Foul lines are nearly horizontal (wrong angle — should be 90° apart at 45° each)
- Field outline is a quadratic bezier — should be an arc from home plate
- No field rendering underneath — just dots on a blank canvas
- Jitter uses `Math.random()` causing re-renders to shift dots

## Plan

### 1. Shared Field Geometry Engine

Create `src/components/game-scoring/fieldGeometry.ts`:
- Single source of truth for all field math
- Sport-parameterized: baseball (90ft bases, 60'6" mound, ~330-400ft fences) vs softball (60ft bases, 43ft mound, ~200-220ft fences)
- All positions computed from home plate origin using real proportional ratios
- Exports: `getFieldGeometry(sport, viewboxSize)` returning all computed points
- Position zones computed from the SAME geometry (no separate coordinate system)

### 2. Field Diagram Redesign (`FieldPositionDiagram.tsx`)

**Rendering layers (bottom to top):**
1. Dark green background (foul territory)
2. Fair territory wedge — proper 90° fan from home plate with arc-following mowing stripes using a radial clip pattern
3. Warning track — filled arc band (not a stroke), dirt-brown color
4. Outfield fence — darker green arc with subtle thickness
5. Infield dirt — realistic shape: rounded square behind bases with semi-circle extensions behind 1B, 2B area, 3B, and a full dirt circle around the mound
6. Infield grass — the interior cutout (also rounded, not a sharp polygon)
7. Basepaths — chalk lines connecting bases
8. Batter's boxes — two rectangles flanking home plate
9. Bases — proper white squares at correct positions
10. Home plate — correct MLB pentagon (17" wide, pointed toward pitcher)
11. Mound — dirt circle with rubber rectangle
12. Position labels — computed from field geometry, not a separate map

**Interaction:**
- Keep existing pointer drag system (it works well)
- Position zones now derive from the geometry engine — no drift
- Dot labels use `pointerEvents: none` (already correct)

### 3. Spray Chart Redesign (`SprayChart.tsx`)

**Key changes:**
- Accept `sport` prop (default 'baseball')
- Use `getFieldGeometry()` for field proportions
- Render a mini field underneath the dots (same visual language as the diagram):
  - Fair territory wedge with grass coloring
  - Infield dirt shape
  - Foul lines at true 45° angles
  - Outfield arc at sport-correct distance
- Fix foul line angles: both lines at 45° from home plate (total 90° spread)
- Replace `Math.random()` jitter with deterministic hash-based jitter (seeded from index) to prevent re-render shifting
- Spray point distance scaling uses sport-specific outfield depth

### 4. Coordinate System Unification

**Before:** `POSITION_ZONES` used 0-1 normalized coords mapped independently of field geometry → visual misalignment.

**After:** All position defaults computed from the geometry engine:
```
SS position = midpoint(2B, 3B) shifted toward home by 15%
CF position = home + (outfield_radius * 0.65) at 0° angle
etc.
```

This guarantees positions land visually where they should on the rendered field.

### 5. Files Changed

| File | Change |
|------|--------|
| `src/components/game-scoring/fieldGeometry.ts` | **NEW** — shared geometry engine |
| `src/components/game-scoring/FieldPositionDiagram.tsx` | Full rewrite using geometry engine, realistic layered rendering |
| `src/components/game-scoring/SprayChart.tsx` | Add `sport` prop, mini field background, fix angles, deterministic jitter |
| `src/components/game-scoring/PlayerGameCard.tsx` | Pass sport to SprayChart |
| `src/components/game-scoring/GameSummaryView.tsx` | Pass sport to SprayChart |

### 6. What Stays the Same

- Component API shape (props interface)
- Drag interaction mechanics (pointer capture system)
- `onUpdate` callback format `{ playerPos, ballPos }`
- Normalized 0-1 coordinate storage format
- Color coding for spray chart hit types

