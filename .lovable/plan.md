

# Fix Session Side Flow — Single Source of Truth

## Problem
Two competing gates: `HandednessGate` (permanent DB identity, "never asked again") and `SessionIntentGate` (per-session). This creates duplicate prompts, especially for switch hitters in bunting. The permanent gate is architecturally wrong — side selection must be session-scoped.

## Architecture After Fix

```text
Session Start → SessionIntentGate (ONCE) → Rep Logging
                     ↓
              R / L / Switch(or Ambi)
                     ↓
         R or L → side locked, no toggle
         Switch  → SideToggle shown inline
```

One gate. One prompt. Zero re-asks. No DB-persisted blocking gate.

## Changes

### 1. `src/components/practice/RepScorer.tsx`

**Remove HandednessGate entirely:**
- Delete import of `HandednessGate`
- Delete the `handedness` state + its `useEffect` sync (lines 279-296)
- Delete the `dbIdentity` check + `HandednessGate` render block (lines 442-461)
- Remove `useSwitchHitterProfile` import and all references to `isSwitchHitter`, `isAmbidextrousThrower`, `primaryBattingSide`, `primaryThrowingHand`, `saveIdentity`, `isSavingIdentity`

**Expand SessionIntentGate to ALL modules (except baserunning):**
- Change `needsSessionIntent` to: `!isBaserunning` (covers hitting, bunting, pitching, fielding, throwing)
- Remove the `defaultSideMode` logic that reads from DB identity
- Default to `'R'` for all modules

**Replace `handedness` with `sideMode` everywhere:**
- `effectiveBatterSide`: for hitting/bunting → `sideMode === 'BOTH' ? switchSide : sideMode`
- `effectivePitcherHand`: for pitching → `sideMode === 'BOTH' ? switchThrowSide : sideMode`
- For fielding/throwing → `sideMode === 'BOTH' ? switchThrowSide : sideMode` (used as `throwing_hand`)
- Update `commitRep` to use these instead of `handedness`

**Expand SideToggle visibility:**
- Show for bunting when `sideMode === 'BOTH'` (currently only hitting)
- Show for fielding/throwing when `sideMode === 'BOTH'`

### 2. `src/components/practice/SessionIntentGate.tsx`

**Add fielding/throwing support:**
- Add throwing options: `{ R: 'Right', L: 'Left', BOTH: 'Ambidextrous' }`
- Update module detection: hitting/bunting use batting options, pitching/fielding/throwing use throwing options
- Update title: fielding/throwing → "Today's Throwing Hand"
- Remove "defaultMode" prop — no pre-selection needed, user must tap

### 3. No DB Changes
- `athlete_mpi_settings` columns remain (they're used elsewhere for analytics/profiles)
- `useSwitchHitterProfile` hook remains available for profile display — just no longer gates session flow

### 4. `src/components/practice/HandednessGate.tsx`
- Can be deleted (no remaining imports)

## Validation Criteria
1. Every session (hitting/bunting/pitching/fielding/throwing) shows exactly one side prompt
2. Selecting Switch/Ambi → immediate session start + SideToggle visible
3. Selecting R or L → immediate session start, no toggle
4. Zero re-prompts during session
5. Each rep stores correct `batter_side` / `pitcher_hand` / `throwing_hand`
6. Baserunning skips the gate entirely

## Files

| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | Remove HandednessGate, expand SessionIntentGate to all modules, replace `handedness` with `sideMode` |
| `src/components/practice/SessionIntentGate.tsx` | Add fielding/throwing options, remove defaultMode prop |
| `src/components/practice/HandednessGate.tsx` | Delete file |

