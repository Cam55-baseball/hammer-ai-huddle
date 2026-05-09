ALTER TABLE public.library_videos
  ADD COLUMN IF NOT EXISTS foundation_health_score smallint,
  ADD COLUMN IF NOT EXISTS foundation_health_flags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS foundation_health_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS lv_foundation_health_idx
  ON public.library_videos (foundation_health_score)
  WHERE video_class = 'foundation';