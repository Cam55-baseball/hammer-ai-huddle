

# Fix: Frame Extraction Timeout in Base Stealing AI Analysis

## Root Cause

The `extractFrames` function in `LiveRepRunner.tsx` (line 46-94) loads the recorded WebM blob and tries to seek through it. But WebM blobs from `MediaRecorder` report `duration` as `Infinity` because the container metadata lacks duration info. When `video.currentTime` is set with an `Infinity`-based calculation, the `seeked` event never fires, the promise hangs, and the 20-second timeout triggers.

## Fix: `LiveRepRunner.tsx` — `extractFrames` function

After `loadedmetadata` fires, check if `duration` is `Infinity` or `NaN`. If so, use the standard workaround:

1. Seek to a very large time (e.g. `1e10`) to force the browser to calculate the real duration
2. Wait for `seeked` or `durationchange` to fire with a finite value
3. Then proceed with the normal frame extraction loop

Additionally, add a safety timeout on each individual seek (3 seconds) so one stuck seek doesn't hang the entire extraction.

```text
loadedmetadata fires
  └─ duration === Infinity?
       ├─ YES → seek to 1e10, wait for duration to resolve, seek back to 0
       └─ NO  → proceed normally
  └─ extract frames with per-seek timeout
```

### Changes
- After `loadedmetadata`, if `duration` is not finite, seek to `1e10` and wait for `durationchange` or `seeked` with a finite duration (up to 5s fallback)
- Add a 3-second per-seek timeout so a single stuck frame doesn't cause total failure
- If duration still can't be resolved, fall back to extracting frames at fixed small intervals (0, 0.5s, 1s, etc.) rather than failing entirely

| File | Change |
|------|--------|
| `src/components/base-stealing/LiveRepRunner.tsx` | Fix `extractFrames` to handle WebM `Infinity` duration before seeking |

