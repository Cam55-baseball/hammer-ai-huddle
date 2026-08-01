## Goal

The landing page demo video currently renders as a black box until someone hits play — `VideoPlayer` renders a bare `<video>` with no poster, and the `landing_demo_video` table has no cover-image field. Give the owner two ways to set a cover image, and show it before playback.

## What the owner gets

In the owner-only "Manage landing demo video" panel, a new **Cover image** section appears once a video exists:

1. **Pick a frame from the video** — a scrubber under a preview of the uploaded video. The owner drags to the moment they want and taps "Use this frame". The frame is captured and saved as the cover.
2. **Upload a cover image** — a "Choose photo" button that opens the phone's camera roll / gallery (or the file picker on desktop).
3. **Current cover thumbnail** with a "Remove cover" option.

Frame-picking is only offered for videos uploaded to our storage (browsers can't read frames out of a YouTube/Vimeo embed). For link-based videos, only the photo upload is offered — and YouTube/Vimeo already show their own thumbnail, so those aren't black anyway.

## What visitors get

The demo video on the welcome page shows the cover image immediately, with a play control over it, instead of a black rectangle. If no cover has been set, behavior is unchanged.

## Technical details

**Database** — one migration adding to `public.landing_demo_video`:
- `poster_url text` (nullable) — stores a storage path in the existing private `landing-demo` bucket, mirroring how `video_url` is stored for uploads. Existing RLS policies and grants already cover the column; no policy changes needed.

**Storage** — reuse the existing private `landing-demo` bucket, with poster objects keyed `poster-<timestamp>.jpg`. Posters are signed on read alongside the video in `resolvePlayableUrl`.

**`src/hooks/useLandingDemoVideo.ts`**
- Select `poster_url`; resolve it to a signed URL in `resolvePlayableUrl` (7-day expiry, same as the video).
- New `uploadPoster(file | blob)` → uploads to the bucket, updates the row's `poster_url`, deletes the previous poster object best-effort.
- New `clearPoster()`; `remove()` also deletes the poster object.
- `save()` and `uploadFile()` preserve/reset `poster_url` appropriately (replacing the video clears a stale frame-grab cover).

**Frame capture** — new `src/lib/landing/captureVideoFrame.ts`: draws the current `<video>` frame to a canvas at native resolution and returns a JPEG `Blob` via `canvas.toBlob` (quality ~0.85). Because the source is a signed same-origin-proxied URL, the canvas is not tainted; if `toBlob` ever throws a security error, the UI falls back to a clear "use the photo upload instead" message rather than failing silently.

**`src/components/landing/LandingDemoVideoManager.tsx`** — new cover section: a muted `<video>` preview with a range slider bound to `currentTime`, a "Use this frame" button, a hidden `<input type="file" accept="image/*">` for the gallery/camera path (validated for type and size before upload), the current cover thumbnail, and remove. Toasts on success/failure, all controls disabled while busy.

**`src/components/video-library/VideoPlayer.tsx`** — add an optional `posterUrl?: string | null` prop passed to the `<video poster>` attribute in the upload branch. Purely additive; every other call site is unaffected.

**`src/components/landing/LandingDemoVideo.tsx`** — pass `video.poster_url` through to the player.

No AI calls and no edge functions are involved — the frame grab happens in the browser.
