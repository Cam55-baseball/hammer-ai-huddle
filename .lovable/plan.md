

# Royal Timing — Timer UI Placement Optimization

## Current Layout

Timers are rendered in a separate grid section (lines 430–439) **below all videos and master controls**. This forces users to scroll away from the video to see the timer, especially on mobile.

## Plan

### 1. Create a compact `InlineTimer` component

**New file: `src/components/royal-timing/InlineTimer.tsx`**

A minimal, compact timer display designed to sit directly above or overlaid on its video. No Card wrapper — just a small row showing:
- Timer value (mono font, smaller text ~`text-lg` on mobile, `text-xl` on desktop)
- Start/Stop toggle (icon-only button)
- Reset (icon-only)
- Sync/Unsync toggle (icon-only)
- Synced badge (tiny)

Same props as `TimerDisplay` — reuses the same timer hook interface. Pure UI change.

Layout: single horizontal row, compact spacing, semi-transparent background when used as overlay.

### 2. Move timers next to their videos in `RoyalTimingModule.tsx`

**File: `src/components/royal-timing/RoyalTimingModule.tsx`**

- Remove the separate timer grid section (lines 430–439)
- Wrap each `VideoPlayer` + its `InlineTimer` in a small container div
- Render `InlineTimer` directly **above** its associated VideoPlayer
- In comparison mode: Timer 1 above Video 1, Timer 2 above Video 2
- Master Timer: render inline with master controls (as a small readout)
- In single mode: Timer 1 above Video 1

This keeps each timer visually attached to its video with zero extra scrolling.

### 3. Mobile sizing

- `InlineTimer` uses smaller text (`text-base` on mobile) and icon-only buttons (`h-6 w-6`)
- Minimal vertical padding (`py-1 px-2`)
- No Card/CardHeader overhead — just a `div` with `rounded-md bg-muted/50`

### No Logic Changes

- Same timer hook instances (`timer1`, `timer2`, `masterTimer`)
- Same sync/unsync behavior
- Same start/stop/reset/clear functions
- `TimerDisplay.tsx` kept as-is (unused but not deleted, in case needed elsewhere)

## Files

| File | Change |
|------|--------|
| `src/components/royal-timing/InlineTimer.tsx` | New — compact inline timer row |
| `src/components/royal-timing/RoyalTimingModule.tsx` | Move timers above their videos, remove separate timer grid, add master timer to master controls |

