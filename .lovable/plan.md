

# Royal Timing — Full E2E Video Control Restoration

## Root Cause Analysis

The core problem is a **split-brain architecture**: each `VideoPlayer` child manages its own local state (`isPlaying`, `currentTime`, `seekingRef`), but the parent's master controls directly mutate `videoRef.current` (play, pause, seek, speed) without the child knowing. This causes:

1. **Play/Pause desync**: Master calls `video1Ref.current.play()` but the child's `isPlaying` state stays `false` until a native `play` event fires — which may be delayed or missed
2. **Scrub/seek desync**: Master frame-step and skip mutate `currentTime` directly, but the child's `seekingRef` isn't set, so `timeupdate` may overwrite the scrubber position mid-seek
3. **Speed desync**: `onSpeedChange` prop is passed to `VideoPlayer` but never called — local speed changes don't propagate back to the parent
4. **Timer drift**: Synced timers read `video.currentTime` via RAF, but when master controls pause the video, the timer's RAF loop may still be running with stale state

## Architecture Fix

Eliminate the split-brain by making VideoPlayer fully event-driven from the native `<video>` element. The child already has `onPlay`, `onPause`, `onSeeked`, `onTimeUpdate` listeners — these correctly handle master-initiated mutations. The issue is that some edge cases aren't covered.

## Changes

### 1. `src/components/royal-timing/VideoPlayer.tsx` — Hardened event-driven state

**Remove the `onSpeedChange` prop** from the interface (it's unused internally and creates confusion). Speed is already synced via the `speed` prop + `useEffect`.

**Fix the scrubber**: Replace the native `<input type="range">` with a proper controlled component that:
- Uses `onPointerDown` to set a `isDragging` ref (replaces `seekingRef` for scrub interactions)
- Uses `onPointerMove` (when dragging) for continuous updates
- Uses `onPointerUp` to finalize the seek and clear the dragging flag
- This eliminates the stuck-`seekingRef` problem entirely for scrub operations

**Separate concerns for `seekingRef`**: Only use it for programmatic seeks (frame-step, skip), and always clear it in the `onSeeked` handler + 300ms fallback. The scrubber uses its own `isDragging` ref.

**Ensure `onTimeUpdate` respects both flags**: Skip update if `seekingRef.current || isDragging.current`.

**Add `onRateChange` listener**: Sync `localSpeed` state from the native `ratechange` event so master speed changes are reflected in the UI dropdown.

### 2. `src/components/royal-timing/RoyalTimingModule.tsx` — Safer master controls

**Master play**: Already calls `.play().catch()` — keep as-is. The child's `onPlay` event listener will update `isPlaying`.

**Master pause**: Already calls `.pause()` — keep as-is. The child's `onPause` event listener will update `isPlaying`.

**Master frame-step**: After setting `currentTime`, the child's `onSeeked` handler fires and clears any seeking state. No change needed — but add a small safety: call `.pause()` on both videos and let the child's `onPause` listener handle state.

**Master skip/rewind**: Same — the child's `onTimeUpdate` and `onSeeked` handlers will pick up the new position.

**Master speed**: Already sets `playbackRate` directly on both refs + updates `masterSpeed` state → child's `useEffect([speed])` syncs `localSpeed`. Add the `ratechange` listener as backup.

**Remove `onSpeedChange` prop** from both `<VideoPlayer>` instances (unused).

### 3. `src/hooks/useRoyalTimingTimer.ts` — Stable sync

The timer hook is mostly correct. One fix:
- In the `tick` callback, when `isSynced`, also check if the video is paused — if paused, still read `currentTime` but don't schedule another RAF tick (reduces CPU waste). Actually, the current approach of always reading `currentTime` via RAF is fine since it ensures frame-step changes are reflected immediately. Keep as-is.

- Fix the `tick` dependency: `isSynced` is in the dependency array of `useCallback`, which means a new `tick` function is created on every sync/unsync toggle, and the `useEffect` re-subscribes. This is correct behavior.

No changes needed to the timer hook.

### 4. Scrubber Implementation Detail

Replace the current `<input type="range">` scrubber with a pointer-event-driven approach:

```text
onPointerDown → set isDragging = true, capture pointer
onPointerMove → if dragging, calculate position, set video.currentTime, update state
onPointerUp   → set isDragging = false, release pointer
```

This provides:
- Continuous feedback during drag (no waiting for `onChange`)
- Clean release semantics (no stuck flags)
- Works on both touch and mouse

Alternatively, keep the `<input type="range">` but use a simpler `isDragging` ref pattern:
- `onPointerDown` → `isDragging.current = true`
- `onInput` → update `currentTime` and `video.currentTime`
- `onPointerUp` → `isDragging.current = false`
- `onTimeUpdate` → skip if `isDragging.current`

This second approach is simpler and preserves the existing UI. Use this.

### 5. `VideoPlayer` prop interface cleanup

Remove `onSpeedChange` from the interface and all call sites. The master speed is already propagated via the `speed` prop.

## Files Summary

| File | Change |
|------|--------|
| `src/components/royal-timing/VideoPlayer.tsx` | Replace seekingRef scrub logic with isDragging ref, add ratechange listener, remove onSpeedChange prop, harden event-driven state |
| `src/components/royal-timing/RoyalTimingModule.tsx` | Remove onSpeedChange prop from VideoPlayer instances, clamp master skip/rewind values |

