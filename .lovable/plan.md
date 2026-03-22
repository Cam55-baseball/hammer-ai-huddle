

# Royal Timing — Auto Start/Stop Toggle

## Overview

Add an `autoStartStop` boolean to the timer hook. When enabled and synced, the timer automatically starts/stops with video play/pause events. When disabled (default), current manual behavior is preserved.

## Changes

### 1. `src/hooks/useRoyalTimingTimer.ts`

- Add `autoStartStop` state (default `false`) and `setAutoStartStop` to the return interface
- Add a `useEffect` that listens to the synced video element's `play` and `pause` events when `autoStartStop && isSynced`:
  - On `play`: call `start()`
  - On `pause`/`ended`: call `stop()`
- Clean up listeners on unsync or toggle off
- Export `autoStartStop` and `setAutoStartStop` in the return object

### 2. `src/components/royal-timing/InlineTimer.tsx`

- Accept `autoStartStop` and `onToggleAutoStartStop` in timer prop interface
- When synced, show a small toggle (Switch component) labeled "Auto" next to the Synced badge
- Compact styling: tiny switch + "Auto" text label, fits in the existing row

## Files

| File | Change |
|------|--------|
| `src/hooks/useRoyalTimingTimer.ts` | Add `autoStartStop` state, video event listeners for auto start/stop |
| `src/components/royal-timing/InlineTimer.tsx` | Add Auto toggle switch when synced |

