

# Royal Timing — Advanced Timer Sync, Independent Control & Mobile UI

## Current State

- Timers are separate cards at the bottom of the page, far from videos
- When synced, the timer RAF loop always reads `video.currentTime` — there's no independent start/stop while synced
- No "pause with video" vs "continue running" option
- No "Sync Both Timers" toggle for comparison mode

## Architecture Change

The timer hook needs a new sync model: **synced** means the timer's zero-reference is anchored to the video timeline, but the timer can still be independently started/stopped. Currently synced mode just mirrors `video.currentTime` — we need it to track an offset from when the user pressed Start.

### New Timer Behavior

- **Synced + Running**: Timer reads `video.currentTime * 1000 - syncAnchorMs` (where `syncAnchorMs` is the video time when user pressed Start). This gives elapsed time from the user's chosen start point.
- **Synced + Stopped**: Timer freezes at the last recorded value. Video continues independently.
- **Synced + Video paused**: Configurable — either freeze timer or let it continue via `performance.now()`.
- **Unsynced**: Current independent stopwatch behavior (unchanged).

## Changes

### 1. `src/hooks/useRoyalTimingTimer.ts` — Enhanced sync model

Add new state/refs:
- `syncAnchorMs` ref: video time (in ms) when timer was started while synced
- `pauseWithVideo` state: boolean (default `true`)

Modify `tick`:
- When synced + running: `elapsed = video.currentTime * 1000 - syncAnchorMs`
- When synced + stopped: don't update elapsed
- When synced + running + video paused + `pauseWithVideo`: don't advance

Modify `start`:
- When synced: capture `video.currentTime * 1000` as `syncAnchorMs`, set running
- When not synced: current behavior

Modify `stop`:
- When synced: just set `isRunning = false`, freeze elapsed value
- When not synced: current behavior

Add `setPauseWithVideo(boolean)` to the return interface.

Keep `syncToVideo` and `unsync` — sync just establishes the video reference, start/stop are independent.

### 2. `src/components/royal-timing/TimerDisplay.tsx` — Compact inline timer

Redesign from a full Card to a compact inline element that attaches directly to each video:
- Small overlay-style display: timer value in monospace, compact controls (Start/Stop, Reset, Sync/Unsync)
- Add a toggle for "Pause with video" (small switch)
- Reduce from `text-3xl` to `text-lg` for the timer value
- Keep it readable but non-intrusive

Add a `compact` prop to support both inline (near video) and expanded views.

### 3. `src/components/royal-timing/RoyalTimingModule.tsx` — Move timers next to videos

Move Timer 1 directly below/above Video 1 (inside the video grid area), and Timer 2 below/above Video 2.

On mobile: render timer as a compact bar between the video controls and the video element.

On desktop: render timer as a small overlay or compact row attached to each video card.

Remove the separate "Timers" section at the bottom (lines 430-439). Instead, integrate timers into the video player area.

For comparison mode, add a "Sync Both Timers" toggle that:
- Calls `timer1.syncToVideo(video1Ref)` and `timer2.syncToVideo(video2Ref)` simultaneously
- Shows a single toggle in the master controls area

Remove the Master Timer (it adds confusion) — each video gets its own timer, and master controls handle both videos.

### 4. Layout on mobile (390px viewport)

```text
┌─────────────────────┐
│ Video 1 Controls    │
│ Timer 1 (compact)   │  ← inline, small font
│ Video 1 (player)    │
├─────────────────────┤
│ Master Controls     │
├─────────────────────┤
│ Video 2 (player)    │
│ Timer 2 (compact)   │
│ Video 2 Controls    │
└─────────────────────┘
```

Timer is a single row: `00:03.42 [▶] [↺] [🔗Synced]`

## Files

| File | Change |
|------|--------|
| `src/hooks/useRoyalTimingTimer.ts` | Add `syncAnchorMs`, `pauseWithVideo`, independent start/stop while synced |
| `src/components/royal-timing/TimerDisplay.tsx` | Add `compact` mode, "Pause with video" toggle, reduce size |
| `src/components/royal-timing/RoyalTimingModule.tsx` | Move timers inline with videos, add "Sync Both Timers" toggle, remove master timer, adjust mobile layout |

