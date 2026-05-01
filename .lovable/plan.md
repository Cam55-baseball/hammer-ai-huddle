## What's actually broken

In the public Video Library, several videos show a blank player even though a link was provided. Three distinct causes, all in `src/components/video-library/VideoPlayer.tsx` and `src/components/video-library/VideoCard.tsx`:

1. **YouTube Shorts and `youtu.be` short links don't parse.**
   The current regex `(?:v=|\/embed\/|youtu\.be\/)([^&?#]+)` does not handle:
   - `https://youtube.com/shorts/<id>` (Shorts) — falls through and uses the original watch URL as the iframe `src`, which YouTube refuses to embed → blank frame.
   - `https://m.youtube.com/watch?v=<id>` parses, but the mobile domain occasionally trips embed cookies. We will normalize to `www.youtube.com/embed/<id>`.
   - URLs with extra params (`?si=`, `&t=`, playlists) — already handled, but Shorts fail before they reach this.

2. **X (Twitter) and TikTok links have no embed at all.**
   Today they're saved as `video_type='external'`, which only renders an "Open in New Tab" button. The card has no thumbnail and the detail page shows no preview, which the user reads as "blank post / no video".

3. **One row has an empty `video_url`** ("Hip Action with Ted Williams Pt.2"). The detail view shows "No video available". This violates the project rule that empty URLs must be stored as NULL and never accepted on insert. It should also surface clearly to the owner so they can fix it.

## Fix plan

### 1. Robust YouTube ID extraction (covers Shorts + every common variant)

Replace the single regex with a helper that recognizes all of:
- `youtube.com/watch?v=<id>` (any subdomain, including `m.` and `www.`)
- `youtu.be/<id>`
- `youtube.com/embed/<id>`
- `youtube.com/shorts/<id>`  ← new
- `youtube.com/live/<id>`     ← new

Apply the same helper in **both**:
- `VideoPlayer.tsx` (for the iframe `src`) — emit `https://www.youtube.com/embed/<id>` (and forward `?t=` as `?start=` when present).
- `VideoCard.tsx` (for the thumbnail) — emit `https://img.youtube.com/vi/<id>/mqdefault.jpg` so Shorts get a thumbnail too.

Extract this into a small shared util (e.g. `src/lib/videoEmbed.ts`) so the two components can never drift again.

### 2. First-class support for X (Twitter) and TikTok

Add two new player branches in `VideoPlayer.tsx`:

- **X / Twitter**: render via `https://platform.twitter.com/embed/Tweet.html?id=<tweetId>` inside an iframe. Parse `tweetId` from `https://(twitter|x).com/<user>/status/<id>` (strip `?s=...`). This produces a fully playable embedded tweet/video.
- **TikTok**: render via `https://www.tiktok.com/embed/v2/<videoId>` iframe. Parse `videoId` from `https://www.tiktok.com/@<user>/video/<id>`.

Auto-detect the platform from `video_url` even when stored as `video_type='external'`, so existing rows start working immediately without needing a re-tag. Order: youtube → vimeo → x/twitter → tiktok → fallback.

Keep the existing "Open in New Tab" button as a secondary action under the embed in case a tweet is later deleted/protected.

### 3. Use detected platform for thumbnails too

Update `VideoCard.tsx`'s `getThumbnail()` to use the same detection helper:
- YouTube (any variant) → `img.youtube.com` thumbnail.
- TikTok → keep the platform play icon (no public thumbnail API), but show the title prominently so the card is not "blank".
- X / Twitter → same as TikTok.

This eliminates the visual "blank post" feel.

### 4. Don't let blank URLs ever ship again

- In `useVideoLibraryAdmin.uploadVideo` and update flows, reject any `video_url` whose trimmed value is empty (already partially enforced for non-upload types — extend it to **all** insert/update paths and store `null` rather than `''`).
- In `VideoLibraryManager`'s readiness signal, surface "Missing video URL" as its own row-level warning so the owner can spot the broken row immediately. The "Hip Action with Ted Williams Pt.2" row is the live example.

### 5. Sanity sweep (no DB migration required)

- Verify existing rows render after the fix using their current `video_type`:
  - `youtube` Shorts → embed via new parser.
  - `external` X / TikTok → auto-routed to the right embed branch.
  - The one empty-URL row → flagged in the owner manager.
- No schema changes. No data backfill needed. The behavior change is purely in the player + card components and a tiny shared helper.

## Files touched

- `src/lib/videoEmbed.ts` — **new** small util: `parseYouTubeId`, `parseVimeoId`, `parseTweetId`, `parseTikTokId`, `detectPlatform`.
- `src/components/video-library/VideoPlayer.tsx` — use the util; add X and TikTok embed branches; auto-detect platform from URL.
- `src/components/video-library/VideoCard.tsx` — use the util for thumbnails so Shorts and other YouTube variants show artwork.
- `src/hooks/useVideoLibraryAdmin.ts` — enforce non-empty `video_url` on every insert/update path; store empty as `null`.
- `src/components/owner/VideoLibraryManager.tsx` — surface "Missing video URL" as a per-card warning so broken rows are obvious.

## Result the user will see

- YouTube Shorts and mobile (`m.youtube.com`) links play inline.
- X / Twitter posts and TikTok posts show an embedded, playable preview right in the library — no more "blank post".
- Any row with a missing URL is loud and actionable in the owner manager instead of silently empty for athletes.