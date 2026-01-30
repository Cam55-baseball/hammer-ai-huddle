
# Fix Plan: Reset "Mark Landing Moment" State on New Video Upload

## Problem

When uploading a new pitching video, the "Mark Landing Moment" button retains its previous selection state from the last video. This means if you marked the landing moment on video A, then upload video B, it still shows the landing time from video A even though you never clicked it for the new video.

## Root Cause

The `landingTime` state variable is not being reset in three key places where video state is cleared:

1. **Module/Sport Change Effect** - When switching between modules or sports
2. **handleRemoveVideo** - When clicking to remove the current video  
3. **handleFileSelect** - When selecting a new video file

## Solution

Add `setLandingTime(null)` to all three state reset locations.

## Changes Required

### File: `src/pages/AnalyzeVideo.tsx`

**Change 1: Module/Sport Change Effect (around line 202)**

Add `setLandingTime(null)` after the existing state resets in the `useEffect` that handles module/sport changes.

**Change 2: handleRemoveVideo Function (around line 228)**

Add `setLandingTime(null)` after the existing state resets when removing a video.

**Change 3: handleFileSelect Function (around line 250)**

Add `setLandingTime(null)` after `setCurrentVideoId(null)` when selecting a new video file.

## Summary

| Location | Line | Change |
|----------|------|--------|
| Module/sport change effect | ~202 | Add `setLandingTime(null);` |
| `handleRemoveVideo` function | ~228 | Add `setLandingTime(null);` |
| `handleFileSelect` function | ~250 | Add `setLandingTime(null);` |

## Expected Outcome

After this fix:
- Uploading a new video will always start with no landing moment marked
- Switching sports or modules will reset the landing marker
- Removing a video will clear the landing marker
- Users must explicitly mark the landing moment for each new video they upload
