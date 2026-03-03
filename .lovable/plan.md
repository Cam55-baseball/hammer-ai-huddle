

# Handedness Selectors, Pitcher/Hitter Side, and Pitch Distance Scoping

## 1. Hitting Reps: Rename "Thrower Hand" → "Pitcher Hand" with L/R

**File: `src/components/practice/RepScorer.tsx`** — Lines 324-346

The `needsThrowerHand` check already covers BP, flips, game, coach pitch, etc. The label says "Thrower Hand" which is unclear. Changes:
- Rename label from "Thrower Hand" to "Pitcher Hand (L/R)"
- Store value in both `thrower_hand` and `pitcher_hand` fields on the rep for clarity
- This selector is already gated by `REQUIRES_THROWER_HAND` which covers: `flip`, `live_bp`, `regular_bp`, `coach_pitch`, `soft_toss`, `front_toss`, `game`

## 2. Pitching Reps: Add "Hitter Side" L/R Selector

**File: `src/components/practice/RepScorer.tsx`** — Pitching section (~line 523)

Currently pitching has no hitter side selector. For live BP and game reps, knowing the batter's stance matters. Changes:
- Add a "Hitter Side" L/R toggle in the pitching section
- Show it when `repSource` is in `['live_bp', 'game']` (sources where a live batter is present)
- Store as `batter_side` on the rep (field already exists in `ScoredRep` interface)

## 3. Pitch Release Distance: Only Show for Hitting and Pitching

**File: `src/components/practice/SessionConfigPanel.tsx`** — Line 151-192

Currently pitch distance shows for ALL modules (fielding, catching, baserunning) which makes no sense. Changes:
- Wrap the pitch distance section with `(isHitting || isPitching) &&` guard
- Same for velocity band section — already has `(isHitting || isPitching)` guard, confirmed correct
- Override distance in RepScorer (line 358-367) also needs the same `(isHitting || isPitching)` guard

**File: `src/components/practice/RepScorer.tsx`** — Lines 358-367 (override section)
- Guard the override distance slider with `(isHitting || isPitching)`

## Files Summary

| File | Changes |
|------|---------|
| `src/components/practice/RepScorer.tsx` | Rename "Thrower Hand" → "Pitcher Hand" for hitting; add "Hitter Side" L/R for pitching live reps; guard override distance to hitting/pitching only |
| `src/components/practice/SessionConfigPanel.tsx` | Guard pitch distance to hitting/pitching modules only |

