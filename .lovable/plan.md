

# Fix Reaction Time Test Accuracy

## Changes in `src/components/vault/quiz/QuickReactionTest.tsx`

| Issue | Fix |
|-------|-----|
| `onClick` adds mobile tap delay | Switch to `onPointerDown` on the tap zone |
| `Date.now()` has ~ms precision | Use `performance.now()` throughout |
| Start time captured before render | Use `requestAnimationFrame` to set `startTimeRef` after the green target paints |

### Implementation Details

1. **Replace `Date.now()` with `performance.now()`** in `startTimeRef` assignment and reaction time calculation (lines 49, 65).

2. **Wrap start timestamp in `requestAnimationFrame`** so the timer begins after the browser has actually rendered the green target:
   ```ts
   timeoutRef.current = setTimeout(() => {
     setPhase('tap');
     requestAnimationFrame(() => {
       startTimeRef.current = performance.now();
     });
   }, delay);
   ```
   Apply this pattern in both `startTest` and the next-round logic inside `handleTap`.

3. **Switch tap zone from `onClick` to `onPointerDown`** on the div at ~line 156 for immediate touch response (no 300ms delay).

4. **Update reaction time calculation** in `handleTap`:
   ```ts
   const reactionTime = Math.round(performance.now() - startTimeRef.current);
   ```

No other files affected. Scoring formula, averaging, and anti-anticipation logic remain unchanged.

