

# Owner Video Editing with Versioning

## Overview
Add edit capabilities to the video library with a `video_versions` table for safe video file replacement. Metadata edits go directly to `library_videos`; replacing a video file creates a new version row and only deactivates the old version after successful upload.

## Database Migration

### 1. Create `video_versions` table
```sql
CREATE TABLE public.video_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.library_videos(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  video_url text NOT NULL,
  video_type text NOT NULL DEFAULT 'upload',
  is_active boolean NOT NULL DEFAULT true,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  replaced_at timestamptz,
  file_size_bytes bigint,
  UNIQUE (video_id, version_number)
);

ALTER TABLE public.video_versions ENABLE ROW LEVEL SECURITY;
```

### 2. RLS policies on `video_versions`
- **Select**: Authenticated users can read all versions (needed for playback)
- **Insert/Update/Delete**: Only where `video_id` belongs to a video owned by `auth.uid()`

```sql
CREATE POLICY "Anyone can read video versions"
  ON public.video_versions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owner can insert video versions"
  ON public.video_versions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.library_videos WHERE id = video_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owner can update video versions"
  ON public.video_versions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.library_videos WHERE id = video_id AND owner_id = auth.uid())
  );
```

### 3. Database function for safe version swap
```sql
CREATE OR REPLACE FUNCTION public.replace_video_version(
  p_video_id uuid,
  p_new_url text,
  p_video_type text DEFAULT 'upload',
  p_file_size bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_next_version integer;
  v_new_id uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM library_videos WHERE id = p_video_id;
  IF v_owner IS NULL OR v_owner != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM video_versions WHERE video_id = p_video_id;

  -- Deactivate current active version
  UPDATE video_versions
  SET is_active = false, replaced_at = now()
  WHERE video_id = p_video_id AND is_active = true;

  -- Insert new active version
  INSERT INTO video_versions (video_id, version_number, video_url, video_type, is_active, file_size_bytes)
  VALUES (p_video_id, v_next_version, p_new_url, p_video_type, true, p_file_size)
  RETURNING id INTO v_new_id;

  -- Update the main video_url on library_videos
  UPDATE library_videos
  SET video_url = p_new_url, video_type = p_video_type, updated_at = now()
  WHERE id = p_video_id;

  RETURN v_new_id;
END;
$$;
```

### 4. Seed initial versions
Insert version 1 for every existing `library_videos` row so the versioning system is consistent from the start:
```sql
INSERT INTO video_versions (video_id, version_number, video_url, video_type, is_active)
SELECT id, 1, video_url, video_type, true
FROM library_videos
WHERE video_url IS NOT NULL
ON CONFLICT DO NOTHING;
```

## Frontend Changes

### 1. New `VideoEditForm` component (`src/components/owner/VideoEditForm.tsx`)
- Receives a `LibraryVideo` object + `tags` + `onSuccess` callback
- Pre-fills title, description, notes, sport, category, tags
- Shows current video URL (read-only) with an optional "Replace Video" section
- On save:
  - If only metadata changed → calls `updateVideo()` from the existing admin hook
  - If video file replaced → uploads to storage first, then calls `supabase.rpc('replace_video_version', ...)`, then calls `updateVideo()` for metadata
- Tags are fully replaced on edit (existing behavior in `updateVideo`)

### 2. Update `VideoLibraryManager.tsx`
- Add an Edit button (pencil icon) next to each video's delete button
- Track `editTarget: LibraryVideo | null` state
- When editing, render `VideoEditForm` in a dialog/sheet with the selected video's data
- On success, close dialog and `refetch()`

### 3. Update `useVideoLibraryAdmin.ts`
- Add `replaceVideoFile(videoId, file)` method:
  1. Upload file to `videos` bucket at `{userId}/library/{videoId}_v{timestamp}.{ext}`
  2. Call `supabase.rpc('replace_video_version', { p_video_id, p_new_url, p_video_type, p_file_size })`
  3. If upload succeeds but RPC fails → show error, do NOT deactivate old version (safe by design since the RPC is atomic)

## Security
- RLS on `video_versions` ensures only the video owner can insert/update
- The `replace_video_version` function is `SECURITY DEFINER` but checks `auth.uid() = owner_id` internally
- Metadata updates already enforce `owner_id = auth.uid()` via existing RLS on `library_videos`

## Edge Cases Handled
- **Failed upload**: New version is never inserted (upload happens before RPC call)
- **Existing references**: `library_videos.video_url` always points to the active version, so drills/sessions referencing it continue to work
- **No video_url videos** (link-only): Seed query skips nulls; replacing a link-based video with an upload works via the same RPC

## Files Changed
1. **New migration**: `video_versions` table + RLS + `replace_video_version` function + seed
2. **New**: `src/components/owner/VideoEditForm.tsx`
3. **Modified**: `src/components/owner/VideoLibraryManager.tsx` — add edit button + dialog
4. **Modified**: `src/hooks/useVideoLibraryAdmin.ts` — add `replaceVideoFile()` method

