-- 1. Partial unique index: enforces exactly 0 or 1 active version per video
CREATE UNIQUE INDEX IF NOT EXISTS one_active_version
  ON public.video_versions (video_id)
  WHERE is_active = true;

-- 2. Hardened RPC with row-level locking
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
  SELECT owner_id INTO v_owner
  FROM library_videos
  WHERE id = p_video_id
  FOR UPDATE;

  IF v_owner IS NULL OR v_owner != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM video_versions WHERE video_id = p_video_id;

  UPDATE video_versions
  SET is_active = false, replaced_at = now()
  WHERE video_id = p_video_id AND is_active = true;

  INSERT INTO video_versions (video_id, version_number, video_url, video_type, is_active, file_size_bytes)
  VALUES (p_video_id, v_next_version, p_new_url, p_video_type, true, p_file_size)
  RETURNING id INTO v_new_id;

  UPDATE library_videos
  SET video_url = p_new_url, video_type = p_video_type, updated_at = now()
  WHERE id = p_video_id;

  RETURN v_new_id;
END;
$$;

-- 3. Case-insensitive unique index on library_tags
CREATE UNIQUE INDEX IF NOT EXISTS library_tags_name_lower_key
  ON public.library_tags (lower(name));

-- 4. Normalize tag names to lowercase on insert/update
CREATE OR REPLACE FUNCTION public.normalize_tag_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.name := lower(trim(NEW.name));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_tag_name ON public.library_tags;
CREATE TRIGGER trg_normalize_tag_name
  BEFORE INSERT OR UPDATE ON public.library_tags
  FOR EACH ROW EXECUTE FUNCTION public.normalize_tag_name();