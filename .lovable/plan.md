

# Machine Mode, Velocity Bands in 5s, Pitching Per-Rep Velo, and Machine Throwing Hand

## 1. Velocity Bands in Increments of 5

**Files: `src/data/baseball/velocityBands.ts` and `src/data/softball/velocityBands.ts`**

Currently baseball uses 10-mph bands (40-50, 50-60…). Change to 5-mph increments:
- Baseball machine: 40-45, 45-50, 50-55, …, 105-110, 110+
- Baseball pitching: <60, 60-65, 65-70, …, 105-110, 110+
- Softball already uses 5-mph bands — no changes needed

## 2. Machine Hitting: "1 Pitch" vs "Mix" Mode Selector

**File: `src/components/practice/RepScorer.tsx`**

When `repSource === 'machine_bp'` in hitting, add a **Machine Mode** toggle before pitch type/velo:
- **1 Pitch**: User pre-sets a single pitch type and velocity band at the top. These are locked for all reps (no per-rep selection). Fields appear once above the rep logger.
- **Mix**: Treat like a live category — each rep gets its own pitch type and velocity band selection (already how `REQUIRES_PITCH_TYPE` and `REQUIRES_VELOCITY` work).

Add `machine_mode` state (`'single' | 'mix'`). When `single`:
- Show pitch type + velo band selectors once (stored in state, applied to all reps)
- Hide per-rep pitch type and velo band fields

When `mix`:
- Show per-rep pitch type and per-rep velocity band (current behavior for machine_bp)

## 3. Machine Hitting: Throwing Hand with RH/LH/Neutral

**File: `src/components/practice/RepScorer.tsx`**

Currently machine_bp is excluded from `REQUIRES_THROWER_HAND` (which only shows L/R for live sources). For machine, add a separate 3-option selector: **RH / LH / Neutral**.

- Show this only when `repSource === 'machine_bp'` in hitting
- Store as `thrower_hand` field with values `'L'`, `'R'`, or `'N'`
- Update `ScoredRep` interface to allow `'N'` for thrower_hand: `thrower_hand?: 'L' | 'R' | 'N'`

## 4. Pitching: Per-Rep Velocity Band for Live/Game

**File: `src/components/practice/RepScorer.tsx`**

Currently pitching velocity band only appears in Advanced mode (line 624-633). For `live_bp` and `game` rep sources, promote the velocity band selector to **always visible** (quick mode too), since pitch velocity matters for every live pitching rep.

For `bullpen` and `flat_ground`, keep it in advanced mode only (athlete may not have a radar).

## 5. Pitching: Hitter Side Already Done

The hitter side L/R toggle for pitching `live_bp` and `game` was implemented in the last diff — no changes needed.

---

## Files Summary

| File | Changes |
|------|---------|
| `src/data/baseball/velocityBands.ts` | Change to 5-mph increments |
| `src/components/practice/RepScorer.tsx` | Add machine mode toggle (1Pitch/Mix), machine throwing hand (RH/LH/Neutral), promote pitching velo band for live reps, update ScoredRep type |

