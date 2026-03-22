

# Mobile Optimization — Royal Timing Comparison View

## Problem

On mobile (390px viewport), in comparison mode the layout is: Video 1 → Video 1 controls → Video 2 → Video 2 controls → Master Controls. After pressing Master Play (at the bottom), users must scroll up to see both videos playing — defeating the purpose of comparison.

## Solution

Three changes to fix the mobile comparison UX:

### 1. VideoPlayer: Add `controlsPosition` prop

**File: `src/components/royal-timing/VideoPlayer.tsx`**

Add an optional `controlsPosition?: 'top' | 'bottom'` prop (default `'bottom'`).

When `'top'`: render the controls (buttons + scrubber + time display) **above** the video element, before the `<video>` tag. When `'bottom'` (default): keep current layout.

This is a simple reorder of the existing JSX blocks within the `<CardContent>` — no logic changes needed. The card header with label stays at the top regardless.

### 2. Move Master Controls between videos on mobile

**File: `src/components/royal-timing/RoyalTimingModule.tsx`**

Currently master controls are rendered after both VideoPlayers (line 340-372). Change this so master controls appear **between** Video 1 and Video 2 on mobile:

- Extract the master controls JSX into a variable/component
- In the comparison grid, render: Video 1 → Master Controls → Video 2
- This places the Master Play button between both videos so both are visible when tapped
- Reduce padding: change `space-y-6` to `space-y-4` on the outer container, and `gap-4` to `gap-3` on the video grid for mobile
- Make master controls more compact on mobile: smaller buttons, tighter spacing

### 3. Pass `controlsPosition="top"` to Video 1 on mobile

**File: `src/components/royal-timing/RoyalTimingModule.tsx`**

- Use the `useIsMobile()` hook
- When mobile + comparison mode: pass `controlsPosition="top"` to Video 1
- Video 2 keeps `controlsPosition="bottom"` (default)

This results in the mobile comparison layout:

```text
┌─────────────────────┐
│ Video 1 Controls    │  ← moved above
│ Video 1 (player)    │
├─────────────────────┤
│ Master Controls     │  ← between videos
├─────────────────────┤
│ Video 2 (player)    │
│ Video 2 Controls    │  ← stays below
└─────────────────────┘
```

Users tap Master Play in the middle and see both videos without scrolling.

### 4. Compact mobile spacing

- Reduce `aspect-video` to a smaller aspect ratio on mobile for comparison mode (optional — only if needed)
- Reduce card padding in comparison mode on mobile: `p-2` instead of default
- Remove the separate master controls section below (line 340-372) — it's now inline

## Files

| File | Change |
|------|--------|
| `src/components/royal-timing/VideoPlayer.tsx` | Add `controlsPosition` prop, conditionally reorder controls vs video |
| `src/components/royal-timing/RoyalTimingModule.tsx` | Move master controls between videos, use `useIsMobile`, pass `controlsPosition`, tighten spacing |

