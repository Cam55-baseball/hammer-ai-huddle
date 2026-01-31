

# Fix: Video Analysis Upload Failing - Frame Size Too Large

## Problem Summary

Users cannot upload videos for analysis. The edge function receives `frames: undefined` because the request body is being truncated due to excessively large frame data.

## Root Cause

The `extractKeyFrames` function in `src/lib/frameExtraction.ts` captures frames at **full video resolution** (1080p, 4K, etc.), resulting in very large base64 strings. With 7 frames at 300-500KB each, the request body can exceed 2-3MB, causing serialization/transport issues.

### Evidence

Edge function logs show:
```
ZodError: frames received "undefined" (expected "array")
```

The frames array is being lost during transmission because the payload is too large.

## Solution

Resize extracted frames to a maximum dimension of 512px (matching the working implementation in `RealTimePlayback.tsx`), which dramatically reduces payload size while maintaining sufficient quality for AI vision analysis.

## File to Update

**`src/lib/frameExtraction.ts`** - Add frame resizing logic in the `onLoadedMetadata` function

## Detailed Changes

### Current Code (lines 55-56)

```typescript
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
```

### Updated Code

```typescript
// Resize frames to max 512px dimension to reduce payload size
// This matches RealTimePlayback implementation and keeps API calls efficient
const maxDim = 512;
let width = video.videoWidth;
let height = video.videoHeight;

if (width > height) {
  if (width > maxDim) {
    height = (height / width) * maxDim;
    width = maxDim;
  }
} else {
  if (height > maxDim) {
    width = (width / height) * maxDim;
    height = maxDim;
  }
}

canvas.width = Math.round(width);
canvas.height = Math.round(height);
```

### Also Update Draw Call (line 101)

**Current:**
```typescript
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
```

This already uses `canvas.width` and `canvas.height`, so it will automatically use the resized dimensions. No change needed here.

## Impact

| Metric | Before | After |
|--------|--------|-------|
| Frame size (1080p source) | ~300-500KB per frame | ~20-40KB per frame |
| Total payload (7 frames) | ~2-3.5MB | ~140-280KB |
| AI analysis quality | Full resolution (unnecessary) | 512px max (sufficient for mechanics analysis) |

## Why This Works

1. AI vision models for mechanics analysis don't need 4K resolution - 512px captures all relevant body positioning details
2. Smaller payload stays well within Edge Function limits (6MB max)
3. Faster upload/transmission
4. Matches the proven implementation in RealTimePlayback that's been working

## Testing Verification

After the fix:
1. Users can upload videos and receive analysis results
2. The edge function receives the frames array correctly
3. Analysis quality is maintained (512px is sufficient for mechanics detection)

