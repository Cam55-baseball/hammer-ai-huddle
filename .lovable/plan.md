

# Royal Timing — Timer Sync with Delayed Start

## Problem

Currently, when a timer is synced to a video (`syncToVideo`), the RAF loop starts immediately (line 82: `if (isRunning || isSynced)`), and the timer continuously reads `video.currentTime`. There's no concept of "synced but not yet started" — syncing forces the timer to track the video immediately.

The user wants: sync establishes the link, but the timer stays at 0 until the user presses Start. Once started, it reads the video's current position and tracks from there.

## Solution

**File: `src/hooks/useRoyalTimingTimer.ts`**

Introduce a `isStarted` concept that separates "linked to video" from "actively displaying time":

1. **New ref: `syncOffsetRef`** — stores the video timestamp (in ms) at the moment the user presses Start. When synced and started, elapsed = `video.currentTime * 1000 - syncOffsetRef.current`.

2. **Change `syncToVideo`**: Only sets `isSynced = true` and stores the video ref. Does NOT start the RAF loop or update elapsed. Timer stays at 0.

3. **Change `start` (when synced)**: Captures current `video.currentTime * 1000` into `syncOffsetRef`, then sets `isRunning = true`. The RAF loop starts.

4. **Change `tick` (synced branch)**: Instead of `setElapsed(video.currentTime * 1000)`, compute `setElapsed(video.currentTime * 1000 - syncOffsetRef.current)`. This gives elapsed time relative to the moment Start was pressed.

5. **Change RAF trigger**: Only run RAF when `isRunning` (remove `|| isSynced` from the condition). Synced-but-not-started = no RAF = timer shows 0.

6. **`stop` (when synced)**: Captures current elapsed into `accumulatedRef`, sets `isRunning = false`. Timer freezes at last value.

7. **`reset`**: Also resets `syncOffsetRef` to 0 and elapsed to 0.

8. **Scrub behavior**: When synced and running, scrubbing the video naturally updates `video.currentTime`, so the timer follows (minus the offset). When synced but stopped, timer stays frozen — correct behavior.

**No changes to `InlineTimer.tsx` or `RoyalTimingModule.tsx`** — the UI already has separate Sync and Start buttons.

## Files

| File | Change |
|------|--------|
| `src/hooks/useRoyalTimingTimer.ts` | Add `syncOffsetRef`, change tick/start/stop/sync logic to support delayed start |

