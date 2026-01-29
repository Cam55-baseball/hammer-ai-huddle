

# Fix Plan: Analysis Failed - Missing Frames in Request

## Problem Identified

The "Analysis Failed" error occurs because the `analyze-video` edge function now **requires video frames** but:

1. **The retry function doesn't send frames** - `handleRetryAnalysis` (line 413-456) sends the request without extracting and including frames
2. **Bug in calculateLandingFrameIndex call** - Line 275 passes `videoFile.size` (bytes) instead of video duration (seconds)

The edge function logs confirm:
```
ZodError: frames - Required - expected: "array", received: "undefined"
```

---

## Solution

### Fix 1: Update Retry Function to Re-extract Frames

The retry function needs to re-extract frames from the video before retrying analysis. Since we still have `videoFile` in state, we can extract frames again.

**Changes to `handleRetryAnalysis`:**
```typescript
const handleRetryAnalysis = async () => {
  if (!currentVideoId || !user || !videoFile) return;
  
  setAnalyzing(true);
  setAnalysisError(null);
  
  // Re-extract frames for retry
  let frames: string[] = [];
  let landingFrameIndex: number | null = null;
  
  try {
    setExtractingFrames(true);
    toast.info(t('videoAnalysis.extractingFrames', "Extracting key frames for analysis..."));
    frames = await extractKeyFrames(videoFile, landingTime);
    
    if (landingTime != null && frames.length > 0) {
      landingFrameIndex = calculateLandingFrameIndex(landingTime);
    }
    setExtractingFrames(false);
  } catch (frameError) {
    setExtractingFrames(false);
    toast.error("Failed to extract frames for retry");
    setAnalyzing(false);
    return;
  }
  
  // Rest of the retry logic with frames included...
};
```

### Fix 2: Correct calculateLandingFrameIndex Call

Line 275 incorrectly uses `videoFile.size`:
```typescript
// WRONG:
landingFrameIndex = calculateLandingFrameIndex(landingTime, videoFile.size, frames.length);
```

The function signature expects `videoDuration` but we're passing file size in bytes. However, looking at the actual function implementation, it always returns `3` (center of 7 frames) when landing is marked - so the parameters are unused. 

We should simplify this:
```typescript
// CORRECT:
landingFrameIndex = calculateLandingFrameIndex(landingTime);
```

And update the function signature accordingly.

### Fix 3: Add Guard for Missing Video File on Retry

If the user refreshes the page or the video file reference is lost, we need to show a helpful message instead of failing silently.

---

## Files to Modify

**`src/pages/AnalyzeVideo.tsx`:**
- Update `handleRetryAnalysis` to extract frames before retrying
- Fix `calculateLandingFrameIndex` call (remove unused parameters)
- Add null check for `videoFile` in retry function

**`src/lib/frameExtraction.ts`:**
- Simplify `calculateLandingFrameIndex` signature (remove unused params)

---

## Expected Outcome

After implementation:
1. Initial video analysis will work with frames (already does)
2. **Retry button will correctly re-extract frames and succeed**
3. Clear error message if video file is no longer available for retry
4. No more ZodError for missing frames

