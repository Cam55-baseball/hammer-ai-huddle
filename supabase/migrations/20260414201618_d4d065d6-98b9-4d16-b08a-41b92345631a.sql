-- 1. Create video_versions table
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

-- 2. RLS policies
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

-- 3. Atomic version swap function
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

-- 4. Seed version 1 for existing videos
INSERT INTO public.video_versions (video_id, version_number, video_url, video_type, is_active)
SELECT id, 1, video_url, video_type, true
FROM public.library_videos
WHERE video_url IS NOT NULL AND video_url != ''
ON CONFLICT DO NOTHING;