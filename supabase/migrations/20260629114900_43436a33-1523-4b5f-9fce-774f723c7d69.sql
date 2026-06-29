
-- 1) Side preferences table (sticky default per discipline)
CREATE TABLE IF NOT EXISTS public.athlete_side_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL CHECK (discipline IN ('hit','throw')),
  last_used_side TEXT CHECK (last_used_side IN ('L','R')),
  dominant_side TEXT CHECK (dominant_side IN ('L','R')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, discipline)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_side_preferences TO authenticated;
GRANT ALL ON public.athlete_side_preferences TO service_role;

ALTER TABLE public.athlete_side_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage own side preferences"
  ON public.athlete_side_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_athlete_side_preferences_updated_at ON public.athlete_side_preferences;
CREATE TRIGGER update_athlete_side_preferences_updated_at
  BEFORE UPDATE ON public.athlete_side_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Additive side columns on capture surfaces (all nullable)
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS batting_side TEXT CHECK (batting_side IN ('L','R')),
  ADD COLUMN IF NOT EXISTS throwing_hand TEXT CHECK (throwing_hand IN ('L','R'));

ALTER TABLE public.vault_saved_drills
  ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('L','R','both'));

ALTER TABLE public.drill_assignments
  ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('L','R','both'));

ALTER TABLE public.pending_drills
  ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('L','R','both'));

ALTER TABLE public.athlete_body_goals
  ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('L','R','both')) DEFAULT 'both';

ALTER TABLE public.daily_standard_checks
  ADD COLUMN IF NOT EXISTS side_focus TEXT CHECK (side_focus IN ('L','R','both'));

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS side_focus TEXT CHECK (side_focus IN ('L','R','both'));

ALTER TABLE public.mpi_scores
  ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('L','R'));

-- 3) Helpful indexes for side-stratified rollups
CREATE INDEX IF NOT EXISTS idx_videos_user_batting_side ON public.videos(user_id, batting_side) WHERE batting_side IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_user_throwing_hand ON public.videos(user_id, throwing_hand) WHERE throwing_hand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mpi_scores_user_side ON public.mpi_scores(user_id, side) WHERE side IS NOT NULL;
