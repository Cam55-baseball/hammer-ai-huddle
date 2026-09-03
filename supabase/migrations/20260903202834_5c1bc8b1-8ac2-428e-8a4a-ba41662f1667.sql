ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS parent_video_id uuid NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS variant text NOT NULL DEFAULT 'original';

ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_variant_check;

ALTER TABLE public.videos
  ADD CONSTRAINT videos_variant_check CHECK (variant IN ('original', 'annotated'));

CREATE INDEX IF NOT EXISTS idx_videos_parent_video_id
  ON public.videos (parent_video_id)
  WHERE parent_video_id IS NOT NULL;

COMMENT ON COLUMN public.videos.parent_video_id IS
  'When set, this row is a derived copy (e.g. a marked-up export) of the referenced original video.';
COMMENT ON COLUMN public.videos.variant IS
  'original = the recorded session; annotated = a copy with drawings burned into the picture.';