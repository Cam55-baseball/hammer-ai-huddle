

# Inline Side Switching — Switch Hitter/Pitcher Rep Flow

## Current State

RepScorer.tsx **already has** a switch hitter toggle (lines 839-861) but it has three problems:
1. **Buried** — it's deep in the form below velocity fields, not a compact top-level control
2. **Hitting only** — no toggle exists for ambidextrous pitchers (`is_ambidextrous_thrower` / `primary_throwing_hand = 'S'`)
3. **Redundant gate** — switch hitters still see the HandednessGate on session start, then override via toggle (unnecessary friction)

`useSwitchHitterProfile` already fetches `is_ambidextrous_thrower` and `primary_throwing_hand` but only exposes `isSwitchHitter`.

## Changes

### 1. `src/hooks/useSwitchHitterProfile.ts`
- Expose `isAmbidextrousThrower: settings.data?.is_ambidextrous_thrower ?? false`
- No new queries — data already fetched

### 2. `src/components/practice/SideToggle.tsx` (NEW)
Compact inline segmented control component:
- Two-button `R | L` toggle, styled as a tight pill/segmented control
- Props: `value: 'L' | 'R'`, `onChange`, `label` (e.g., "Batting Side" or "Throwing Hand")
- Compact: ~32px tall, inline with rep input area
- Subtle visual: selected side gets `bg-primary/20 border-primary`, unselected is muted
- No modal, no toast, no popup — instant state change on tap

### 3. `src/components/practice/RepScorer.tsx`
**A. Skip HandednessGate for switch players:**
- If `isHitting && isSwitchHitter` → skip gate, use `switchSide` directly
- If `isPitching && isAmbidextrousThrower` → skip gate, use new `switchThrowSide` state

**B. Add `switchThrowSide` state** (parallel to existing `switchSide`):
- `const [switchThrowSide, setSwitchThrowSide] = useState<'L' | 'R'>('R')`

**C. Update `effectiveBatterSide` / add `effectivePitcherHand`:**
- Existing: `effectiveBatterSide = (isHitting && isSwitchHitter) ? switchSide : handedness`
- New: `effectivePitcherHand = (isPitching && isAmbidextrousThrower) ? switchThrowSide : handedness`

**D. Move toggle to top of rep input** (remove from buried position at line 839):
- Render `SideToggle` immediately after the rep feed badges, before execution score
- Hitting + switch hitter → show "Batting Side" toggle
- Pitching + ambidextrous → show "Throwing Hand" toggle
- All other cases → nothing shown (no clutter for non-switch players)

**E. Update `commitRep`:**
- Line 387: Change `pitcher_hand: handedness` → `pitcher_hand: effectivePitcherHand` when ambidextrous
- Line 386 already uses `effectiveBatterSide` ✅
- Each rep stores `batter_side` or `pitcher_hand` per-rep, not inferred

### 4. HandednessGate bypass logic
In the gate check (line 415):
```
if (!handedness && !isBaserunning && !(isHitting && isSwitchHitter) && !(isPitching && isAmbidextrousThrower)) {
  return <HandednessGate ... />;
}
```
Switch players skip the gate entirely — the inline toggle handles side selection.

## What This Does NOT Touch
- Base stealing trainer (isolated)
- Session-level `batting_side_used` / `throwing_hand_used` fields (session level remains as-is)
- No new queries, no new DB changes
- Non-switch players see zero UI changes

## Files

| File | Change |
|------|--------|
| `src/hooks/useSwitchHitterProfile.ts` | Expose `isAmbidextrousThrower` |
| `src/components/practice/SideToggle.tsx` | **NEW** — compact R\|L segmented control |
| `src/components/practice/RepScorer.tsx` | Move toggle to top, add pitching toggle, skip gate for switch players, update commitRep |

