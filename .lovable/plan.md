

# Fix Double-Prompt Bug — Bunting + Switch Hitter

## Problem
Two bugs causing the user to be asked batting side twice:

1. **Identity gate doesn't bypass for bunting switch hitters** — Line 446 checks `!(isHitting && isSwitchHitter)` but bunting sets `isBunting = true`, not `isHitting = true`. So the identity gate re-appears for bunting even when the user already identified as a switch hitter.

2. **Session intent gate fires separately** — After the identity gate finally passes, the session intent gate asks "Today's Batting Side" again. Two prompts that feel like the same question.

## Fix — Single File: `src/components/practice/RepScorer.tsx`

### Change 1: Fix identity gate bypass for bunting (line 446)
Replace:
```
!(isHitting && isSwitchHitter)
```
With:
```
!((isHitting || isBunting) && isSwitchHitter)
```

This ensures bunting switch hitters skip the identity gate just like hitting switch hitters do.

### Change 2: Auto-set sideMode from identity when unambiguous
After the identity gate block (around line 461), add logic to auto-resolve `sideMode` for non-switch players so they never see the SessionIntentGate:

- If `primaryBattingSide` is `'R'` or `'L'` (not switch) → auto-set `sideMode` to that value, skip the intent gate entirely
- If `primaryThrowingHand` is `'R'` or `'L'` (not ambidextrous) → same
- Only show SessionIntentGate for switch hitters / ambidextrous throwers (they genuinely need to choose)

This means:
- **Right-handed hitter** → identity already set → sideMode auto-set to `'R'` → goes straight to rep logging
- **Switch hitter** → identity already set → SessionIntentGate shown once → done
- **No double prompts ever**

### Summary
| What | Before | After |
|------|--------|-------|
| Bunting + switch hitter | Shows HandednessGate again | Skips correctly |
| Non-switch player | Shows SessionIntentGate unnecessarily | Auto-resolves, straight to reps |
| Switch player | Shows SessionIntentGate (correct) | Same — one prompt only |

