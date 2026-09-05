ALTER TABLE public.library_video_likes
  ADD COLUMN IF NOT EXISTS fault_tag_key text,
  ADD COLUMN IF NOT EXISTS fault_tag_layer text,
  ADD COLUMN IF NOT EXISTS skill_domain text,
  ADD COLUMN IF NOT EXISTS source text;

CREATE TABLE IF NOT EXISTS public.library_video_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.library_videos(id) ON DELETE CASCADE,
  skill_domain text,
  fault_tag_key text,
  fault_tag_layer text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_library_video_saves_video ON public.library_video_saves (video_id);
CREATE INDEX IF NOT EXISTS idx_library_video_likes_fault ON public.library_video_likes (video_id, fault_tag_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_video_saves TO authenticated;
GRANT ALL ON public.library_video_saves TO service_role;

ALTER TABLE public.library_video_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saves"
ON public.library_video_saves FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);