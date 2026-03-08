

# Bug: Full-Screen Signal Overlay Sticks Forever

## Root Cause

In `ReactionSignal.tsx`, the `useEffect` (line 30-65) manages both the **delay timer** (to fire the signal) and the **dismiss timer** (to clear it after 3s). The problem:

1. Signal fires → `onSignalFired` called → parent sets phase to `signal_active`
2. Parent re-renders → `active` prop changes from `true` to `false`
3. The effect's **cleanup function runs** (lines 61-64), clearing **both** timers — including the dismiss timer
4. Effect re-runs with `active=false`, returns early on line 31
5. Result: `setSignal(null)` never fires. The full-screen overlay stays forever.

The dismiss timer is being killed by the effect cleanup before it can fire.

## Fix

### `ReactionSignal.tsx`
Separate the dismiss timer from the signal-firing effect so it survives the `active` prop change:

- Use a **separate `useRef`** to track whether the dismiss timer is already running
- In the cleanup, only clear the **delay timer**, not the dismiss timer if it's active
- OR (cleaner): move dismiss logic into a separate `useEffect` that triggers when `signal` state becomes non-null

**Chosen approach**: Use a ref flag to protect the dismiss timer from being cleared by the main effect cleanup.

```tsx
useEffect(() => {
  if (!active) return;

  const timer = setTimeout(() => {
    // ... generate signal, call onSignalFired ...
    
    dismissTimerRef.current = setTimeout(() => {
      setSignal(null);
      onSignalDismissed();
    }, SIGNAL_DISPLAY_MS);
  }, delay);

  return () => {
    clearTimeout(timer);
    // Only clear dismiss timer if signal hasn't fired yet
    if (!signal) {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    }
  };
}, [active, delay, mode]); // Remove onSignalFired/onSignalDismissed from deps
```

**Key changes**:
1. Remove `onSignalFired` and `onSignalDismissed` from the dependency array (use refs instead) — this prevents the effect from re-running when parent re-renders with new callback references
2. Store callbacks in refs so they're always current but don't trigger effect re-runs
3. This ensures the dismiss timer survives the `active` → `false` transition

### `LiveRepRunner.tsx`
No changes needed — the rendering logic already keeps `ReactionSignal` mounted during both `waiting_signal` and `signal_active` phases (line 365).

## Files Modified

| File | Change |
|------|--------|
| `ReactionSignal.tsx` | Store `onSignalFired`/`onSignalDismissed` in refs; remove from effect deps so dismiss timer isn't killed on re-render |

