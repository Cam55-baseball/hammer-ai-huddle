

# Fix Unviewable External Videos in Video Library

## Problem
`VideoPlayer.tsx` only handles `youtube` and `vimeo` embeds. Videos with `video_type: 'external'` (X/Twitter, TikTok, etc.) fall through to a `<video>` tag that can't play web page URLs — resulting in a broken black box.

3 affected videos: 1 X/Twitter link, 1 TikTok link, 1 empty URL.

## Solution
Add an `external` fallback path in `VideoPlayer` that displays a styled card with the video title and an "Open in Browser" button, rather than attempting inline playback.

## Changes

### `src/components/video-library/VideoPlayer.tsx`

Add a new branch before the `<video>` fallback:

```text
if videoType === 'external' && videoUrl:
  → Render a card with:
    - Title
    - Truncated URL preview
    - "Open in New Tab" button (window.open)
    - ExternalLink icon
```

This keeps the existing YouTube/Vimeo/upload paths untouched and gracefully handles any URL that isn't a direct video file.

### No other files change
- `useVideoLibrary.ts` — no changes needed
- `VideoCard.tsx` — no changes needed (thumbnail fallback already handles missing thumbnails)

| File | Change |
|------|--------|
| `src/components/video-library/VideoPlayer.tsx` | Add `external` type rendering path with "Open in New Tab" button |

