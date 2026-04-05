

# Field Diagram & Spray Chart — Verification Results

## What I Found

### Code Quality: STRONG ✅

The implementation is architecturally correct:

1. **Geometry Engine** (`fieldGeometry.ts`) — Real math-based, sport-parameterized. Baseball uses 90ft/60.5ft/330ft, softball uses 60ft/43ft/220ft. All positions computed from home plate origin using trigonometry, not hardcoded pixel positions.

2. **FieldPositionDiagram** — 15-layer SVG with realistic rendering: fair territory wedge, mowing stripes, warning track band, infield dirt with basepath corridors, MLB pentagon home plate, batter's boxes, catcher's circle, pitcher's mound with rubber.

3. **SprayChart** — Uses geometry engine for sport-specific proportions, deterministic jitter (hash-based, no `Math.random()`), correct 45° foul lines, mini-field background.

4. **Coordinate unification** — Both rendering and interaction use the same `getFieldGeometry()` output. Player positions are computed as `positionsNormalized[position]`, eliminating drift.

### Visual Proof: BLOCKED BY UI FLOW

The field diagram is inside `mode === 'advanced'` conditional (line 1541 of `RepScorer.tsx`). Standard mode does not show it. I could not reach it through browser automation without completing several form steps and switching to advanced mode.

### Issues Found: 2

**Issue 1: Field diagram only visible in advanced mode**
The "Mark Field Position" collapsible is gated behind `mode === 'advanced'`. Most users in "Standard Logging" mode will never see the field diagram. This is a UX accessibility problem — the field diagram should be available in standard mode too, since marking field position is a core interaction.

**Issue 2: `type="number"` on inputs in RepScorer fielding section**
Lines 1599, 1893, 1905 still use `type="number"` for decimal inputs (glove-to-glove time, pop time, transfer time). These suffer from the SAME decimal input bug we just fixed in CustomActivityDetailDialog — browser stripping of "9." and mobile keyboard issues.

## Plan

### Fix 1: Move Field Diagram out of advanced-only block
Move the "Mark Field Position" collapsible (lines 1972-1989) outside the `mode === 'advanced'` conditional so it appears in all fielding modes. It's already collapsible so it won't clutter the form.

### Fix 2: Fix decimal inputs in RepScorer
Change `type="number"` to `type="text"` with `inputMode="decimal"` and add the same regex validation pattern on lines 1599, 1893, 1905.

### Files Changed

| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | Move field diagram out of advanced block; fix 3 decimal input fields |

No changes needed to `fieldGeometry.ts`, `FieldPositionDiagram.tsx`, or `SprayChart.tsx` — those are solid.

