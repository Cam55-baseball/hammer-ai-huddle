
-- 1. Extend dossier tables
ALTER TABLE public.gp_pitcher_dossiers
  ADD COLUMN IF NOT EXISTS archetype text,
  ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS league_avg_context jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.gp_opponent_hitters
  ADD COLUMN IF NOT EXISTS archetype text,
  ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- 2. Probable pitcher on game
ALTER TABLE public.gp_games
  ADD COLUMN IF NOT EXISTS probable_pitcher_dossier_id uuid REFERENCES public.gp_pitcher_dossiers(id) ON DELETE SET NULL;

-- 3. Snapshot archetype on each at-bat (so historical lookups stay stable)
ALTER TABLE public.gp_at_bats
  ADD COLUMN IF NOT EXISTS pitcher_archetype_snapshot text;

-- 4. Pregame plans
CREATE TABLE IF NOT EXISTS public.gp_pregame_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL,
  dossier_kind text NOT NULL CHECK (dossier_kind IN ('pitcher','hitter')),
  pitcher_dossier_id uuid REFERENCES public.gp_pitcher_dossiers(id) ON DELETE CASCADE,
  hitter_dossier_id uuid REFERENCES public.gp_opponent_hitters(id) ON DELETE CASCADE,
  game_id uuid REFERENCES public.gp_games(id) ON DELETE SET NULL,
  plan_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_markdown text,
  inputs_snapshot jsonb DEFAULT '{}'::jsonb,
  model text,
  engine_version text,
  user_feedback text,
  user_rating int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_pregame_plans TO authenticated;
GRANT ALL ON public.gp_pregame_plans TO service_role;
ALTER TABLE public.gp_pregame_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pregame plans" ON public.gp_pregame_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Plan outcomes (learning loop)
CREATE TABLE IF NOT EXISTS public.gp_plan_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.gp_pregame_plans(id) ON DELETE CASCADE,
  ab_id uuid REFERENCES public.gp_at_bats(id) ON DELETE SET NULL,
  recommendation_key text NOT NULL,
  recommendation_text text,
  followed boolean,
  worked boolean,
  evidence jsonb DEFAULT '{}'::jsonb,
  user_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_plan_outcomes TO authenticated;
GRANT ALL ON public.gp_plan_outcomes TO service_role;
ALTER TABLE public.gp_plan_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan outcomes" ON public.gp_plan_outcomes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. AB swing analyses
CREATE TABLE IF NOT EXISTS public.gp_ab_swing_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ab_id uuid NOT NULL REFERENCES public.gp_at_bats(id) ON DELETE CASCADE,
  game_id uuid REFERENCES public.gp_games(id) ON DELETE CASCADE,
  pitcher_dossier_id uuid REFERENCES public.gp_pitcher_dossiers(id) ON DELETE SET NULL,
  video_url text,
  mechanics_json jsonb DEFAULT '{}'::jsonb,
  pitcher_context jsonb DEFAULT '{}'::jsonb,
  drills text[] DEFAULT '{}',
  cues text[] DEFAULT '{}',
  summary text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_ab_swing_analyses TO authenticated;
GRANT ALL ON public.gp_ab_swing_analyses TO service_role;
ALTER TABLE public.gp_ab_swing_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ab swing analyses" ON public.gp_ab_swing_analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Planner priors per user (learning weights)
CREATE TABLE IF NOT EXISTS public.gp_planner_priors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL,
  role text NOT NULL CHECK (role IN ('hitter','pitcher')),
  archetype text NOT NULL,
  prior_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_size int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sport, role, archetype)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_planner_priors TO authenticated;
GRANT ALL ON public.gp_planner_priors TO service_role;
ALTER TABLE public.gp_planner_priors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own planner priors" ON public.gp_planner_priors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Indexes for the hot lookups
CREATE INDEX IF NOT EXISTS idx_gp_pregame_plans_user_dossier ON public.gp_pregame_plans(user_id, pitcher_dossier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gp_pregame_plans_user_hitter ON public.gp_pregame_plans(user_id, hitter_dossier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gp_pregame_plans_game ON public.gp_pregame_plans(game_id);
CREATE INDEX IF NOT EXISTS idx_gp_at_bats_pitcher ON public.gp_at_bats(user_id, opponent_pitcher_id);
CREATE INDEX IF NOT EXISTS idx_gp_at_bats_archetype ON public.gp_at_bats(user_id, pitcher_archetype_snapshot);
CREATE INDEX IF NOT EXISTS idx_gp_plan_outcomes_user ON public.gp_plan_outcomes(user_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_gp_swing_user_ab ON public.gp_ab_swing_analyses(user_id, ab_id);

-- 9. Updated_at triggers
CREATE OR REPLACE FUNCTION public.gp_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_gp_pregame_plans_touch ON public.gp_pregame_plans;
CREATE TRIGGER trg_gp_pregame_plans_touch BEFORE UPDATE ON public.gp_pregame_plans
  FOR EACH ROW EXECUTE FUNCTION public.gp_touch_updated_at();

DROP TRIGGER IF EXISTS trg_gp_planner_priors_touch ON public.gp_planner_priors;
CREATE TRIGGER trg_gp_planner_priors_touch BEFORE UPDATE ON public.gp_planner_priors
  FOR EACH ROW EXECUTE FUNCTION public.gp_touch_updated_at();
