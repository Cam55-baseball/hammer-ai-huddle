ALTER TABLE public.foundation_video_outcomes
  ADD COLUMN IF NOT EXISTS completion_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS rewatched boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS helpful_vote smallint
    CHECK (helpful_vote IS NULL OR helpful_vote IN (-1, 0, 1)),
  ADD COLUMN IF NOT EXISTS post_watch_bqi_delta_7d numeric,
  ADD COLUMN IF NOT EXISTS post_watch_pei_delta_7d numeric,
  ADD COLUMN IF NOT EXISTS trigger_resolved_within_7d boolean,
  ADD COLUMN IF NOT EXISTS recovery_correlation numeric;

CREATE INDEX IF NOT EXISTS fvo_video_trigger_idx
  ON public.foundation_video_outcomes (video_id, shown_at DESC)
  WHERE clicked_at IS NOT NULL;