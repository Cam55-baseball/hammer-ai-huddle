# Landing Page Demo Video (Owner-Managed)

Add a self-serve demo video slot on the landing page (`/`) between the hero paragraph and the "Get Started" button. Owner can upload a video file OR paste a URL (YouTube / Vimeo / X / TikTok / direct MP4) at any time, toggle it hidden/visible, or remove it — no Lovable credits needed. Public visitors see it inline and play it in-page.

## User-visible behavior

**Visitors (logged out or non-owner)**
- If a video exists AND is set to visible → video player renders inline between the hero paragraph and "Get Started". Plays in-page (no redirect).
- If no video, or owner hid it → the whole slot is invisible (no empty box, no placeholder).

**Owner (signed in as owner)**
- Sees the same slot with a small "Manage demo video" panel underneath it:
  - Upload from device (photo library / file picker) OR paste a URL
  - Toggle **Visible to public** on/off
  - **Remove** button clears the slot
- Owner can also see the slot when hidden (with a "Hidden from public" badge) so they can preview before publishing.
- Changes take effect immediately for all visitors on next page load.

## Data model

Single-row settings table (only one demo video exists at a time).

```
public.landing_demo_video
  id            uuid pk default gen_random_uuid()
  video_url     text not null
  video_type    text not null  -- 'upload' | 'youtube' | 'vimeo' | 'twitter' | 'tiktok' | 'external'
  title         text
  is_visible    boolean not null default true
  updated_by    uuid references auth.users(id)
  updated_at    timestamptz not null default now()
```

RLS + GRANTs:
- `GRANT SELECT` to `anon` and `authenticated` — but SELECT policy only returns rows where `is_visible = true` OR caller `has_role(auth.uid(), 'owner')`.
- INSERT / UPDATE / DELETE restricted to `has_role(auth.uid(), 'owner')`.
- `GRANT ALL` to `service_role`.

## Storage

New public bucket `landing-demo` for uploaded video files.
- Public read (so `<video src>` works for everyone).
- RLS on `storage.objects`: only `owner` role may INSERT / UPDATE / DELETE in this bucket.
- File size cap 2 GB, formats reuse `VIDEO_LIMITS` from `src/data/videoLimits.ts`.

## Components

- **`src/hooks/useLandingDemoVideo.ts`** — fetches the single row, exposes `{ video, loading, save, remove, setVisibility }`. Uses existing `supabase` client. Public-safe (no auth required to read).
- **`src/components/landing/LandingDemoVideo.tsx`** — renders the player using the existing `<VideoPlayer>` from `src/components/video-library/VideoPlayer.tsx` (already handles YouTube/Vimeo/X/TikTok/uploads). Returns `null` for public visitors when no visible video exists.
- **`src/components/landing/LandingDemoVideoManager.tsx`** — owner-only card shown directly below the player. URL input + file upload + visibility toggle + remove. Uses `useOwnerAccess()` to gate rendering.

## Integration

Edit `src/pages/Index.tsx` hero block (around line 67–68): insert `<LandingDemoVideo />` between the paragraph `<p>` and the Get Started button div. Owner-only `<LandingDemoVideoManager />` renders just below when `isOwner === true`.

Player wrapper constrains width (`max-w-2xl mx-auto`) and keeps 16:9 aspect ratio to preserve hero layout on mobile (402px viewport) and desktop.

## Technical notes

- Reuses existing `VideoPlayer` — no new embed code paths, so YouTube/Vimeo/X/TikTok/direct MP4 all work out of the box and play in-page.
- Upload flow reuses the pattern from `src/lib/uploadHelpers.ts` (Supabase Storage `upload` with `upsert: true`, then `getPublicUrl`).
- Video type is auto-detected via `detectPlatform()` from `src/lib/videoEmbed.ts`; falls back to `'upload'` for direct file uploads and `'external'` for unknown URLs.
- No changes to auth, routing, or any other page.
- No Lovable credits consumed on updates — pure Supabase storage + one row update.

## Migration

One migration file:
1. `CREATE TABLE public.landing_demo_video ...`
2. `GRANT` statements (SELECT to anon/authenticated, ALL to service_role)
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY` (public read of visible rows, owner full write)
5. Bucket creation handled via `supabase--storage_create_bucket` tool (public=true), then storage.objects policies restricting writes to owner role.
