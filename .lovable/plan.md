

# Fix AtBatPanel Reset After Finalize

## Problem
When "Finalize At-Bat" is clicked, `handleAtBatComplete` advances the batter index, but the `AtBatPanel` component keeps its internal state (pitches array, selected outcome, RBI count, etc.) because React reuses the same component instance. The panel needs to fully reset for the next hitter.

## Solution
Add a `key` prop to `AtBatPanel` that changes each time the batter advances. This forces React to unmount and remount the component, clearing all internal state.

## Change

### `src/components/game-scoring/LiveScorebook.tsx` (line ~307)
Add a `key` combining `currentBatterIndex`, `currentInning`, and `currentHalf`:

```tsx
<AtBatPanel
  key={`${currentInning}-${currentHalf}-${currentBatterIndex}`}
  batterName={currentBatter.name}
  ...
/>
```

Single-line addition. All internal `AtBatPanel` state (pitches, outcome, RBI, situational data, catcher data) resets automatically on remount.

