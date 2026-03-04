

# Fix: Pitching PitchLocationGrid Uses Wrong Side

## Problem
In the pitching section of `RepScorer.tsx` (line 885), the `PitchLocationGrid` receives `batterSide={handedness}` — which is the **pitcher's throwing hand**, not the selected hitter side. So selecting "Left" hitter side has no effect on the pitch location view.

## Fix
Change line 885 from:
```tsx
batterSide={handedness}
```
to:
```tsx
batterSide={(current.batter_side as 'L' | 'R') || 'R'}
```

This makes the pitch location grid dynamically mirror based on the hitter side selection (`current.batter_side`), defaulting to RHH when no hitter side is selected yet.

## Files Changed
| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | Line 885: use `current.batter_side` instead of `handedness` for pitching PitchLocationGrid |

One-line fix. No other files affected.

