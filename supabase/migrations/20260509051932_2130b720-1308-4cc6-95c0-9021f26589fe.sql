
-- Indexes
CREATE INDEX IF NOT EXISTS library_videos_foundation_class_idx
  ON public.library_videos (video_class)
  WHERE video_class = 'foundation';

CREATE INDEX IF NOT EXISTS library_videos_foundation_meta_gin
  ON public.library_videos USING GIN (foundation_meta jsonb_path_ops)
  WHERE video_class = 'foundation';

CREATE INDEX IF NOT EXISTS library_video_analytics_user_action_created_idx
  ON public.library_video_analytics (user_id, action, created_at DESC);

-- Effectiveness column for learning loop
ALTER TABLE public.library_videos
  ADD COLUMN IF NOT EXISTS foundation_effectiveness jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Outcomes table
CREATE TABLE IF NOT EXISTS public.foundation_video_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.library_videos(id) ON DELETE CASCADE,
  trigger_keys text[] NOT NULL DEFAULT '{}',
  shown_at timestamptz NOT NULL DEFAULT now(),
  clicked_at timestamptz,
  watched_seconds integer,
  helped_flag boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fvo_user_video_idx ON public.foundation_video_outcomes (user_id, video_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS fvo_video_idx ON public.foundation_video_outcomes (video_id, shown_at DESC);

ALTER TABLE public.foundation_video_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own foundation outcomes"
  ON public.foundation_video_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own foundation outcomes"
  ON public.foundation_video_outcomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users read own foundation outcomes"
  ON public.foundation_video_outcomes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners read all foundation outcomes"
  ON public.foundation_video_outcomes FOR SELECT
  TO authenticated
  USING (user_has_role(auth.uid(), 'owner'::app_role));

-- Validation trigger for foundation rows
CREATE OR REPLACE FUNCTION public.validate_foundation_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m jsonb;
BEGIN
  IF NEW.video_class IS DISTINCT FROM 'foundation' THEN
    RETURN NEW;
  END IF;

  m := COALESCE(NEW.foundation_meta, '{}'::jsonb);

  IF NULLIF(m->>'domain', '') IS NULL THEN
    RAISE EXCEPTION 'foundation_meta.domain is required for foundation videos';
  END IF;
  IF NULLIF(m->>'scope', '') IS NULL THEN
    RAISE EXCEPTION 'foundation_meta.scope is required for foundation videos';
  END IF;
  IF jsonb_typeof(m->'audience_levels') <> 'array' OR jsonb_array_length(m->'audience_levels') = 0 THEN
    RAISE EXCEPTION 'foundation_meta.audience_levels must be a non-empty array';
  END IF;
  IF jsonb_typeof(m->'refresher_triggers') <> 'array' OR jsonb_array_length(m->'refresher_triggers') = 0 THEN
    RAISE EXCEPTION 'foundation_meta.refresher_triggers must be a non-empty array';
  END IF;

  -- Stamp version if missing
  IF (m ? 'version') IS FALSE THEN
    NEW.foundation_meta := m || jsonb_build_object('version', 1);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_foundation_meta ON public.library_videos;
CREATE TRIGGER trg_validate_foundation_meta
  BEFORE INSERT OR UPDATE OF foundation_meta, video_class
  ON public.library_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_foundation_meta();

-- Backfill version stamp on existing foundations
UPDATE public.library_videos
SET foundation_meta = COALESCE(foundation_meta, '{}'::jsonb) || jsonb_build_object('version', 1)
WHERE video_class = 'foundation'
  AND (foundation_meta ? 'version') IS FALSE;
