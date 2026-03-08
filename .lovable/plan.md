

# Fix: Black Video Playback + False AI Results

## Issue 1: Black Screen in Rep Video Review

**Root cause**: WebM blobs recorded by `MediaRecorder` often report `duration` as `Infinity` or `NaN` because the container metadata doesn't include duration until the file is finalized. The `RepReviewPlayer` checks `duration > 0` to show controls — if duration is `Infinity`, the controls may render but seeking won't work. More critically, some browsers won't render the first frame without explicitly seeking or playing.

**Fix in `RepReviewPlayer.tsx`**:
- Add `preload="auto"` to the video element
- After setting `src`, call `video.load()` to force the browser to parse the blob
- Handle `Infinity` duration by listening for `durationchange` and using a workaround: seek to a very large time to force the browser to calculate actual duration, then seek back
- Add an `onLoadedData` handler that seeks to 0 to render the first frame (fixes black screen)

## Issue 2: AI Returns False Positive for No-Movement Videos

**Root cause**: The AI edge function always returns a direction (`go` or `return`) even when confidence is `low` and no actual movement was detected. The network response confirms: `"confidence":"low"`, `"reasoning":"No clear body movement is visible"` — yet the system displayed "Correct Decision!" because the random direction happened to match.

**Fix — two layers**:

### A. Edge function (`analyze-base-stealing-rep/index.ts`)
Add a `movementDetected` boolean to the tool schema so the AI can explicitly report "I see no movement." When confidence is `low` and no movement is detected, the function should return a clear flag.

Add to the function parameters:
```
movementDetected: { type: "boolean", description: "Whether any actual body movement was detected in the frames" }
```

### B. Client-side (`LiveRepRunner.tsx`)
After receiving AI results, check:
- If `confidence === 'low'` AND `movementDetected === false` (or reasoning indicates no movement), treat as "unable to analyze"
- Set `decisionCorrect: null`, `decisionTimeSec: null`
- Set `aiReasoning` to explain that no movement was detected

### C. Display (`PostRepInput.tsx`)
Already handles the `decisionCorrect === null` case with "Analysis Unavailable" — no changes needed there.

## Files Modified

| File | Change |
|------|--------|
| `RepReviewPlayer.tsx` | Fix WebM playback: add `preload="auto"`, force first frame render, handle `Infinity` duration |
| `analyze-base-stealing-rep/index.ts` | Add `movementDetected` boolean to AI tool schema |
| `LiveRepRunner.tsx` | Check `movementDetected` flag; when false with low confidence, return null analysis instead of false positive |

