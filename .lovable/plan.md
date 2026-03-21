

# Fix: Video Scrubbing Breaks Playback

## Root Cause

The scrubber sets `seekingRef.current = true` to prevent `timeupdate` from overwriting the scrub position. It's only cleared by the `seeked` event. Two problems:

1. **`seeked` may never fire** — if the video is at the end, or the seek target equals the current position, the browser may skip the `seeked` event entirely, leaving `seekingRef` permanently `true`. After that, `timeupdate` is suppressed forever, so the UI freezes and play appears broken.

2. **WebM duration workaround conflict** — on load, the workaround seeks to `1e10` then back to `0`. The main `onSeeked` listener fires during this process, and the workaround's own listener also removes itself from `seeked`. This can cause race conditions on initial load.

## Fix

**File: `src/components/royal-timing/VideoPlayer.tsx`**

1. **Clear `seekingRef` with a safety fallback**: In `handleScrub`, after setting `vid.currentTime`, also schedule a `setTimeout(() => seekingRef.current = false, 300)` so the flag always clears even if `seeked` doesn't fire.

2. **Use `onInput` instead of `onChange` for the range input**: On mobile/touch, `onChange` only fires once on release. Using `onInput` provides continuous feedback during drag, and an `onMouseUp`/`onTouchEnd` to finalize the seek and clear the flag.

3. **Guard the WebM workaround**: Use a separate `resolvingRef` boolean so the main `onSeeked` handler ignores seeks triggered by the duration workaround.

4. **Ensure play works after scrub**: In `togglePlayPause`, force `seekingRef.current = false` before calling `play()` so that timeupdate is never blocked when the user hits play after scrubbing.

