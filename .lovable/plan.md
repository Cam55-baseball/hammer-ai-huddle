

# Fix: Frame Extraction Using Wrong Duration (Always Falls Back to 5s)

## Root Cause

Console logs confirm every extraction hits: `"Could not resolve duration, using fallback"` → `duration = 5`. The actual recording is ~15-20 seconds (10s countdown + random delay + 3s signal + 2s buffer). With `duration = 5`, the frame extraction clamps `extractEnd` to 5s max, meaning all extracted frames come from the countdown phase (before any signal or movement). The AI correctly reports "no movement" because it literally only sees pre-signal frames.

The `seek-to-1e10` workaround doesn't work reliably on all browsers for WebM blobs.

## Fix Strategy

Two changes in `LiveRepRunner.tsx`:

### 1. Remove clamping against duration — use known timestamps instead

We already know the exact recording timeline from `recordingStartTimeRef` and `sig.firedAt`. We don't need `video.duration` at all. Instead of clamping `extractEnd` to `duration`, simply attempt the seeks at the calculated timestamps. If a seek fails (timeout), skip that frame — the per-frame 3-second timeout already handles this.

Change `extractFrames` to:
- Remove the `resolveVideoDuration` call entirely
- Remove clamping of start/end against duration  
- Just try seeking to each calculated timestamp directly
- If a seek times out, skip that frame (already handled)

### 2. Alternative duration resolution — use `play()` then `pause()`

As a secondary improvement, if we do need duration for any reason, use `video.play()` briefly then `video.pause()` — this forces most browsers to parse the full WebM container and resolve a finite duration. This is more reliable than the `seek-to-1e10` trick.

## Files Modified

| File | Change |
|------|--------|
| `src/components/base-stealing/LiveRepRunner.tsx` | Remove duration-based clamping from `extractFrames`; seek directly to known timestamps |

