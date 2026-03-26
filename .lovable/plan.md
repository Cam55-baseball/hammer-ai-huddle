

# Hide Optional Rep Fields Behind Advanced Toggle

## Problem
In Practice Hub rep logging, many optional fields are always visible regardless of the quick/advanced toggle. Fielding has no gating at all — all ~20 fields show. Hitting shows pitch location, hit distance, and other optional fields in quick mode. This overwhelms users who just want to log basic reps.

## Required vs Optional Fields Per Module

### Hitting — Quick Mode (Required)
- Execution Score, Pitcher/Thrower Hand, Machine mode presets, Pitch Type (when rep source requires it), Tee Depth Grid (when tee), Switch hitter side, Swing Decision

### Hitting — Advanced (Optional, currently partially gated)
- Pitch Location Grid + ABS Guess, Hit Distance, Exact Pitch Velocity, Contact Quality, Exit Direction, Bat Speed, Exit Velo, Swing Intent, Batted Ball Type, Spin Direction, Approach Quality, Count Situation, Adjustment Tag

### Pitching — Quick Mode (Required)
- Execution Score, Pitch Type, Pitcher Spot Intent, Pitch Location, Pitch Result, Hit Spot, Hitter Side (live contexts)

### Pitching — Advanced (Optional)
- Velocity Band + Exact Velocity (except live_bp/game which stay required), ABS Guess, Pitch Command, In Zone, Spin Direction, Live AB hitter tracking, Pitcher Hitter Outcome details

### Fielding — Quick Mode (Required)
- Fielding Position, Batted Ball Type, Fielding Result, Execution Score

### Fielding — Advanced (Optional — currently NO gating exists)
- Hit Type Hardness, Diving Play, Route Efficiency, Glove-to-Glove, Throwing Velocity, Play Probability, Receiving Quality, Catch Type, Play Direction, Relay/Wall plays, Infield rep types, Tag play quality, Catcher defense details, Throw tracking fields, Footwork Grade, Exchange Time, Throw Spin Quality, Field Position Diagram

### Baserunning/Throwing/Bunting
- These delegate to sub-components; the `mode` prop is already passed to `ThrowingRepFields`. Will pass `mode` to `BaserunningRepFields` and `BuntRepFields` too.

## Changes

| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | **Hitting:** Wrap Pitch Location, Hit Distance, Exact Pitch Velocity inside `mode === 'advanced'` guard (merge with existing advanced block). **Pitching:** Wrap ABS Guess, Live AB fields, Hitter Outcome details, velocity (non-live contexts) in advanced guard. **Fielding:** Wrap all fields except Position, Batted Ball Type, and Fielding Result inside `mode === 'advanced'`. Pass `mode` to `BaserunningRepFields` and `BuntRepFields`. |
| `src/components/practice/BaserunningRepFields.tsx` | Accept `mode` prop; hide optional fields (exact time, exact steps, AI description) in quick mode. |
| `src/components/practice/BuntRepFields.tsx` | Accept `mode` prop; hide optional/granular fields in quick mode. |
| `src/components/practice/RepScorer.tsx` (bottom) | Move "Goal of Rep" and "Actual Outcome" text fields into advanced-only since they're optional. |

## UX
- Quick mode shows only the essential fields needed to log a rep fast
- Advanced toggle (already exists with the switch at the top) reveals all optional fields
- The toggle state persists in localStorage (already implemented)
- No database changes needed

