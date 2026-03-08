

# Fix: Full-Screen Cue Flash + Recording at "Take Lead"

## Root Cause

**The full-screen signal flash disappears immediately.** When `handleSignalFired` is called, it sets `phase` to `signal_active`, which unmounts the `ReactionSignal` component (it's only rendered during `waiting_signal`). Since the overlay lives inside `ReactionSignal`'s internal state, unmounting kills the full-screen color flash instantly — the athlete never sees it.

Recording at countdown=3 is already implemented correctly in the code, so that part just needs verification that it works E2E.

## Fix

### `LiveRepRunner.tsx` — Keep ReactionSignal mounted during signal display

Render `ReactionSignal` during both `waiting_signal` AND `signal_active` phases so the full-screen overlay stays visible for the full 3 seconds:

```tsx
{(phase === 'waiting_signal' || phase === 'signal_active') && (
  <ReactionSignal
    mode={config.signalMode}
    delay={randomDelay}
    active={phase === 'waiting_signal'}
    onSignalFired={handleSignalFired}
    onSignalDismissed={handleSignalDismissed}
  />
)}
```

Key: `active` is only `true` during `waiting_signal` (so the delay timer only fires once), but the component stays mounted during `signal_active` so the internal signal state and its full-screen overlay persist until auto-dismiss.

### `ReactionSignal.tsx` — Don't clear signal when `active` goes false

Currently, the effect clears `signal` state when `active` becomes false (line 32-33: `if (!active) { setSignal(null); return; }`). This would kill the overlay when phase transitions to `signal_active`. Fix: only prevent *firing* a new signal when inactive, don't clear existing signal display.

```tsx
useEffect(() => {
  if (!active) return; // Don't clear signal, just don't start new timer
  // ... rest of timer logic
}, [active, delay, mode, onSignalFired, onSignalDismissed]);
```

## Files Modified

| File | Change |
|------|--------|
| `LiveRepRunner.tsx` | Render `ReactionSignal` during both `waiting_signal` and `signal_active` phases |
| `ReactionSignal.tsx` | Remove `setSignal(null)` when `active` becomes false, so the overlay persists until auto-dismiss |

## What's Already Working (No Changes Needed)

- Recording starts at countdown=3 ("TAKE LEAD") — already implemented
- Edge function `analyze-base-stealing-rep` — already deployed
- Frame extraction and AI analysis pipeline — already wired
- PostRepInput with AI confidence badges — already implemented
- RepReviewPlayer — already working

