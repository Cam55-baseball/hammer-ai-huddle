

# Fix: Master Play Only Plays One Video

## Root Cause

The `masterPlay` function at line 79-82 of `RoyalTimingModule.tsx` guards the second video's `.play()` behind `if (mode === 'comparison')`. This is correct, but the issue is that both `.play()` calls are fired as independent fire-and-forget promises. On some browsers, especially mobile, the second `.play()` can be rejected if the first one hasn't resolved yet — the browser treats only the first as the "user-gesture-initiated" playback.

Additionally, if either video's `seekingRef` is stuck `true` from a prior frame-step, the `timeupdate` handler is suppressed, making the video appear frozen even if it is actually playing.

## Fix

**File: `src/components/royal-timing/RoyalTimingModule.tsx`**

1. **Simultaneous play with `Promise.all`**: Replace the sequential fire-and-forget pattern with `Promise.all([v1.play(), v2.play()])` so both play requests originate from the same microtask, satisfying browser autoplay policies.

2. **Clear stale flags before play**: Before calling `.play()`, reset each VideoPlayer's state by pausing first (no-op if already paused), then playing. This ensures no stale `seekingRef` or `isDragging` flag blocks the UI update.

3. **Retry fallback**: If either `.play()` rejects, retry once after a short delay (50ms).

4. **Remove mode guard for ref access**: Simply check if `video2Ref.current` exists rather than checking `mode`, since the ref is only set when the component is rendered.

**File: `src/components/royal-timing/VideoPlayer.tsx`**

5. **Clear flags on external play event**: In the `onPlay` event listener, also clear `seekingRef` and `isDragging` so that externally triggered plays (from master controls) always allow `timeupdate` to resume.

### Code Changes

**`RoyalTimingModule.tsx` — `masterPlay` (line 79-82):**
```ts
const masterPlay = useCallback(() => {
  const videos = [video1Ref.current, video2Ref.current].filter(Boolean);
  // Clear any stale state, then play all simultaneously
  videos.forEach(v => v!.pause());
  Promise.all(videos.map(v => v!.play())).catch(() => {
    // Retry once on failure
    setTimeout(() => {
      videos.forEach(v => { v!.play().catch(console.warn); });
    }, 50);
  });
}, []);
```

**`VideoPlayer.tsx` — `onPlay` event listener:**
```ts
const onPlay = () => {
  seekingRef.current = false;
  isDragging.current = false;
  setIsPlaying(true);
};
```

### Files

| File | Change |
|------|--------|
| `src/components/royal-timing/RoyalTimingModule.tsx` | Rewrite `masterPlay` to use `Promise.all`, remove `mode` guard, add retry |
| `src/components/royal-timing/VideoPlayer.tsx` | Clear `seekingRef` and `isDragging` in `onPlay` handler |

