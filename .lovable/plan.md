

## Why the previous plan didn't finish

The selector was added but **placed inside the `{isHitting && (<>...</>)}` fragment** (line 792 opens, line 1135 closes). The selector at line 894 is therefore unreachable in pitching sessions. The plan said "place it once outside both blocks" but it was actually nested inside the hitting branch.

## Two bugs to fix in `src/components/practice/RepScorer.tsx`

### Bug 1 — PitchMovementSelector invisible in pitching sessions
Currently at lines 894–906, **inside the `isHitting` fragment**. Needs to be moved out.

**Fix:** Cut the block from lines 894–906 and re-insert it as a **shared block after the pitching `{isPitching && (<>...</>)}` fragment closes** (after line ~1561 — I'll find exact close line at implementation). It will be gated only by `(isHitting || isPitching)` and live at the same indentation level as the `{isHitting && ...}` and `{isPitching && ...}` blocks themselves. This guarantees a single render path for both modules with zero duplication and no `mode === 'advanced'` gating.

### Bug 2 — Duplicate / mislabeled "Pitcher Hand" prompt in pitching sessions
Root cause: when a pitcher picks `live_bp` rep source, `REQUIRES_THROWER_HAND` (line 136 of `RepSourceSelector.tsx`) fires the sub-field at line 700, labeled "Pitcher Hand". For pitching sessions this is meaningless (already captured at SessionIntentGate) — what's actually needed is the **batter's side**.

**Fix:** Change the label and the field it writes based on module:
- In a **pitching** session → label "Batter Side (L/R)", writes to `current.batter_side` only
- In a **hitting** session → keep current "Pitcher Hand (L/R)", writes to `thrower_hand` + `pitcher_hand`

```tsx
{needsThrowerHand && !isMachine && (
  <div>
    <Label className="text-xs text-muted-foreground mb-1 block">
      {isPitching ? 'Batter Side (L/R)' : 'Pitcher Hand (L/R)'} <span className="text-destructive">*</span>
    </Label>
    <div className="grid grid-cols-2 gap-2">
      {(['L', 'R'] as const).map(h => {
        const selected = isPitching ? current.batter_side === h : current.thrower_hand === h;
        return (
          <button
            key={h}
            type="button"
            onClick={() => {
              if (isPitching) {
                updateField('batter_side', h);
              } else {
                updateField('thrower_hand', h);
                updateField('pitcher_hand', h);
              }
            }}
            className={cn(/* unchanged */)}
          >
            {h === 'L' ? 'Left' : 'Right'}
          </button>
        );
      })}
    </div>
  </div>
)}
```

This also makes the existing "Hitter Side (L/R)" advanced-mode block (lines 1185–1207) redundant for `live_bp`/`game`/`sim_game` — but I'll leave it alone for `flat_ground_vs_hitter`/`bullpen_vs_hitter` (which aren't in `REQUIRES_THROWER_HAND`) so those still get a way to set batter side. No regression.

## Verification (after edits)
1. Start a **pitching** session → Movement Direction selector renders (Quick mode, not Advanced).
2. Pick `live_bp` rep source → label says **"Batter Side (L/R)"**, writes to `batter_side`. No "Pitcher Hand" prompt.
3. Start a **hitting** session → Movement Direction renders; `live_bp` still shows "Pitcher Hand".
4. Other modules (fielding/bunting/throwing/baserunning) → Movement Direction does NOT render.

## Files

| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | Move PitchMovementSelector block out of `isHitting` fragment to a shared `(isHitting \|\| isPitching)` block; module-aware label + handler for `needsThrowerHand` sub-field |

