

# Elite Video Library System — Implementation Plan

## Overview

Build an owner-controlled video knowledge library where the owner uploads/manages videos with a deep tagging system, and subscribed users search, filter, and like videos. No user uploads, no comments.

## New Database Tables

### 1. `library_videos`
Stores all owner-uploaded videos.

```sql
CREATE TABLE public.library_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text,
  video_url text, -- direct file URL (uploaded) or external link
  video_type text NOT NULL DEFAULT 'upload', -- 'upload' | 'youtube' | 'vimeo' | 'external'
  thumbnail_url text,
  tags text[] NOT NULL DEFAULT '{}',
  sport text[] NOT NULL DEFAULT '{}', -- ['baseball','softball','both']
  category text, -- hitting, pitching, etc.
  likes_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: Owner can CRUD all. Authenticated subscribers can SELECT.

### 2. `library_video_likes`
Tracks user likes (like the drill favoriting pattern).

```sql
CREATE TABLE public.library_video_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES public.library_videos(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);
```

RLS: Users can INSERT/DELETE their own likes, SELECT their own.

### 3. `library_tags`
Pre-populated tag taxonomy for consistent tagging + expandability.

```sql
CREATE TABLE public.library_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text, -- 'sport','category','position','skill_type','topic'
  parent_category text, -- e.g. 'hitting' for hitting-specific tags
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: Owner can CRUD. Authenticated can SELECT.

### 4. `library_video_analytics` (owner analytics)
```sql
CREATE TABLE public.library_video_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.library_videos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'view' | 'search'
  search_term text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: Users can INSERT their own. Owner can SELECT all.

### Indexes for search performance
```sql
CREATE INDEX idx_library_videos_tags ON public.library_videos USING GIN (tags);
CREATE INDEX idx_library_videos_sport ON public.library_videos USING GIN (sport);
CREATE INDEX idx_library_videos_title_search ON public.library_videos USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_library_video_likes_video ON public.library_video_likes(video_id);
CREATE INDEX idx_library_video_likes_user ON public.library_video_likes(user_id);
```

### Seed data
Insert ~400 tags from the full taxonomy (sport, category, position, skill type, detailed topic) into `library_tags`.

## New Files

### Data Layer
- **`src/hooks/useVideoLibrary.ts`** — Fetch videos with search/filter/sort, like/unlike, pagination
- **`src/hooks/useVideoLibraryAdmin.ts`** — Owner: upload, edit, delete videos, manage tags, view analytics

### Pages
- **`src/pages/VideoLibrary.tsx`** — User-facing library with search bar, tag filters, video grid, saved tab
- **`src/pages/VideoLibraryPlayer.tsx`** — Single video view page (title, player, description, tags, like button)

### Components
- **`src/components/video-library/VideoCard.tsx`** — Thumbnail, title, description preview, tags, like count
- **`src/components/video-library/VideoFilters.tsx`** — Sport filter, category filter, skill filter, topic filter
- **`src/components/video-library/VideoSearchBar.tsx`** — Full-text search across title/description/tags
- **`src/components/video-library/SavedVideos.tsx`** — "Saved Videos" tab showing liked videos
- **`src/components/video-library/VideoPlayer.tsx`** — Renders uploaded video or embeds YouTube/Vimeo

### Owner Admin Components
- **`src/components/owner/VideoLibraryManager.tsx`** — Full CRUD panel: upload/link videos, edit tags, delete, analytics
- **`src/components/owner/VideoUploadForm.tsx`** — Upload file or paste link, set title/description/tags
- **`src/components/owner/TagManager.tsx`** — Add/edit/delete tags
- **`src/components/owner/VideoAnalytics.tsx`** — Most watched, most liked, search keywords

## Existing Files to Edit

| File | Change |
|------|--------|
| `src/App.tsx` | Add routes: `/video-library`, `/video-library/:id` |
| `src/components/AppSidebar.tsx` | Add "Video Library" sidebar item, visible only to subscribed users |
| `src/components/owner/OwnerSidebar.tsx` | Add "Video Library" section to owner sidebar |
| `src/pages/OwnerDashboard.tsx` | Add `video-library` section rendering `VideoLibraryManager` |

## Access Control

- **Sidebar visibility**: Only shown if `modules.length > 0` (any active subscription)
- **Page guard**: `SubscriptionGate` with `requiredAccess='any'`
- **Owner admin panel**: Gated by `useOwnerAccess()` — completely hidden from normal users
- **RLS**: Owner role checked via `public.user_has_role(auth.uid(), 'owner')` for write operations

## Video Upload Flow (Owner)

1. Owner selects "Upload Video" or "Add Video Link"
2. For uploads: file goes to `videos` storage bucket under `library/{videoId}.ext`, max 500MB
3. For links: YouTube/Vimeo URLs stored directly, embedded via iframe
4. Owner fills title, description, selects tags from taxonomy (multi-select with search)
5. Thumbnail auto-generated for uploads or manually set

## User Search & Filter

- **Search bar**: Full-text search on title + description + tags array using `to_tsvector` or `ilike` with array overlap
- **Tag filters**: Sport → Category → Skill Area → Topic (cascading, multi-select)
- **Sort**: Newest (default), Most Liked
- **Pagination**: 20 videos per page, infinite scroll

## Like System

Mirrors existing drill favoriting pattern:
- Heart icon on video card and detail page
- Toggle INSERT/DELETE on `library_video_likes`
- Increment/decrement `likes_count` on `library_videos` via trigger or client update
- "Saved Videos" tab shows all liked videos

