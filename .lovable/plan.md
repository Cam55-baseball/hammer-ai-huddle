

# Move Sync Buttons from Master Controls to Per-Video Timers

## Problem
The "Sync" button currently lives in master controls (both mobile compact and desktop). It should be on each video's timer individually — each video gets its own sync/unsync button.

## Changes

### `src/components/royal-timing/RoyalTimingModule.tsx`

1. **Remove "Sync Both Timers" button from desktop master controls** (lines 449-458) — delete the button entirely
2. **Remove "Sync" button from mobile compact master controls** (lines 370-381) — delete the button entirely
3. The `TimerDisplay` component already has per-video sync/unsync buttons (via the `hasVideo` prop and `Link`/`Unlink` icons) — no changes needed there

### Files

| File | Change |
|------|--------|
| `src/components/royal-timing/RoyalTimingModule.tsx` | Remove sync buttons from both mobile and desktop master control sections |

