
-- ============================================================================
-- GAME PERFORMANCE SYSTEM — PHASE 1 — HARD WIPE + NEW LEDGER
-- ============================================================================

-- Drop legacy tables (user confirmed destructive wipe, no backup)
DROP TABLE IF EXISTS public.game_plays CASCADE;
DROP TABLE IF EXISTS public.game_opponents CASCADE;
DROP TABLE IF EXISTS public.games CASCADE;

-- Reusable updated_at trigger
CREATE OR REPLACE FUNCTION public.gp_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================================
-- gp_pitcher_dossiers — persistent opponent pitcher memory
-- ============================================================================
CREATE TABLE public.gp_pitcher_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team TEXT,
  sport TEXT NOT NULL CHECK (sport IN ('baseball','softball')),
  throws TEXT CHECK (throws IN ('L','R')),
  arm_slot TEXT,
  repertoire JSONB DEFAULT '[]'::jsonb,
  tendencies JSONB DEFAULT '{}'::jsonb,
  notes_pregame TEXT,
  notes_postgame TEXT,
  strike_zone_plan JSONB DEFAULT '{}'::jsonb,
  last_faced DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_pitcher_dossiers TO authenticated;
GRANT ALL ON public.gp_pitcher_dossiers TO service_role;
ALTER TABLE public.gp_pitcher_dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dossiers" ON public.gp_pitcher_dossiers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER gp_pitcher_dossiers_updated BEFORE UPDATE ON public.gp_pitcher_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.gp_set_updated_at();
CREATE INDEX gp_pitcher_dossiers_user_name_idx ON public.gp_pitcher_dossiers(user_id, name);

-- ============================================================================
-- gp_games
-- ============================================================================
CREATE TABLE public.gp_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_date DATE NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('baseball','softball')),
  opponent_team TEXT,
  home_away TEXT CHECK (home_away IN ('home','away','neutral')),
  venue TEXT,
  weather JSONB,
  my_score INT,
  opp_score INT,
  lineup_slot INT,
  my_positions TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','final','canceled')),
  philosophy_pre TEXT,
  philosophy_post TEXT,
  philosophy_verdict TEXT CHECK (philosophy_verdict IN ('keep','tweak','can')),
  general_notes TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_games TO authenticated;
GRANT ALL ON public.gp_games TO service_role;
ALTER TABLE public.gp_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own games" ON public.gp_games
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER gp_games_updated BEFORE UPDATE ON public.gp_games
  FOR EACH ROW EXECUTE FUNCTION public.gp_set_updated_at();
CREATE INDEX gp_games_user_date_idx ON public.gp_games(user_id, game_date DESC);

-- ============================================================================
-- gp_at_bats
-- ============================================================================
CREATE TABLE public.gp_at_bats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.gp_games(id) ON DELETE CASCADE,
  inning INT NOT NULL,
  inning_half TEXT CHECK (inning_half IN ('top','bot')),
  ab_order INT,
  batting_side TEXT CHECK (batting_side IN ('L','R')),
  position_played TEXT,
  opponent_pitcher_id UUID REFERENCES public.gp_pitcher_dossiers(id) ON DELETE SET NULL,
  result TEXT,
  count_balls INT,
  count_strikes INT,
  contact_quality TEXT,
  exit_direction TEXT,
  exit_velo NUMERIC,
  launch_angle NUMERIC,
  pitch_location JSONB,
  pitch_type TEXT,
  pitch_movement JSONB,
  pitch_velo NUMERIC,
  runners_on TEXT,
  outs INT,
  rbi INT DEFAULT 0,
  lob INT DEFAULT 0,
  h1_time_sec NUMERIC,
  is_pinch_hit BOOLEAN DEFAULT FALSE,
  notes TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_at_bats TO authenticated;
GRANT ALL ON public.gp_at_bats TO service_role;
ALTER TABLE public.gp_at_bats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own at_bats" ON public.gp_at_bats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER gp_at_bats_updated BEFORE UPDATE ON public.gp_at_bats
  FOR EACH ROW EXECUTE FUNCTION public.gp_set_updated_at();
CREATE INDEX gp_at_bats_game_idx ON public.gp_at_bats(game_id, inning, ab_order);
CREATE INDEX gp_at_bats_user_idx ON public.gp_at_bats(user_id);
CREATE INDEX gp_at_bats_pitcher_idx ON public.gp_at_bats(opponent_pitcher_id);

-- ============================================================================
-- gp_pitches (per-pitch detail for hitter AB or pitcher's outing)
-- ============================================================================
CREATE TABLE public.gp_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.gp_games(id) ON DELETE CASCADE,
  at_bat_id UUID REFERENCES public.gp_at_bats(id) ON DELETE CASCADE,
  perspective TEXT NOT NULL CHECK (perspective IN ('hitter','pitcher')),
  inning INT,
  pitch_no INT,
  pitch_type TEXT,
  pitch_velo NUMERIC,
  pitch_movement JSONB,
  location JSONB,
  result TEXT,
  pitcher_arm_slot TEXT,
  pitcher_throws TEXT CHECK (pitcher_throws IN ('L','R')),
  batter_handedness TEXT CHECK (batter_handedness IN ('L','R','S')),
  opponent_hitter_name TEXT,
  count_balls INT,
  count_strikes INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_pitches TO authenticated;
GRANT ALL ON public.gp_pitches TO service_role;
ALTER TABLE public.gp_pitches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pitches" ON public.gp_pitches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gp_pitches_ab_idx ON public.gp_pitches(at_bat_id);
CREATE INDEX gp_pitches_game_idx ON public.gp_pitches(game_id, inning);

-- ============================================================================
-- gp_defense_plays
-- ============================================================================
CREATE TABLE public.gp_defense_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.gp_games(id) ON DELETE CASCADE,
  inning INT,
  position TEXT NOT NULL,
  throwing_side TEXT CHECK (throwing_side IN ('L','R')),
  play_type TEXT,
  batted_ball_type TEXT,
  spray_direction TEXT,
  shift TEXT CHECK (shift IN ('no_shift','left','right','extreme_left','extreme_right','in','back')),
  result TEXT,
  error_flag BOOLEAN DEFAULT FALSE,
  assist BOOLEAN DEFAULT FALSE,
  putout BOOLEAN DEFAULT FALSE,
  time_to_first_sec NUMERIC,
  pop_time_sec NUMERIC,
  arm_velo NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_defense_plays TO authenticated;
GRANT ALL ON public.gp_defense_plays TO service_role;
ALTER TABLE public.gp_defense_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own defense" ON public.gp_defense_plays
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gp_defense_game_idx ON public.gp_defense_plays(game_id, inning);

-- ============================================================================
-- gp_baserun_events
-- ============================================================================
CREATE TABLE public.gp_baserun_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.gp_games(id) ON DELETE CASCADE,
  inning INT,
  event_type TEXT NOT NULL CHECK (event_type IN ('steal','dirtball_read','pickoff','advance','caught','tag_up')),
  base_from INT,
  base_to INT,
  success BOOLEAN,
  lead_steps NUMERIC,
  pitcher_arm_side TEXT CHECK (pitcher_arm_side IN ('L','R')),
  pitcher_time_to_home_sec NUMERIC,
  catcher_pop_time_sec NUMERIC,
  pitch_type_ran_on TEXT,
  run_time_sec NUMERIC,
  notes TEXT,
  is_pinch_run BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_baserun_events TO authenticated;
GRANT ALL ON public.gp_baserun_events TO service_role;
ALTER TABLE public.gp_baserun_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own baserun" ON public.gp_baserun_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gp_baserun_game_idx ON public.gp_baserun_events(game_id, inning);

-- ============================================================================
-- gp_subs (substitutions & role changes mid-game)
-- ============================================================================
CREATE TABLE public.gp_subs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.gp_games(id) ON DELETE CASCADE,
  inning INT,
  sub_type TEXT NOT NULL CHECK (sub_type IN ('pinch_hit','pinch_run','def_replace','relief','position_swap','dh')),
  in_position TEXT,
  out_position TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_subs TO authenticated;
GRANT ALL ON public.gp_subs TO service_role;
ALTER TABLE public.gp_subs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subs" ON public.gp_subs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gp_subs_game_idx ON public.gp_subs(game_id, inning);

-- ============================================================================
-- gp_opponent_hitters (pitcher mirror)
-- ============================================================================
CREATE TABLE public.gp_opponent_hitters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team TEXT,
  sport TEXT NOT NULL CHECK (sport IN ('baseball','softball')),
  bats TEXT CHECK (bats IN ('L','R','S')),
  tendencies JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  last_faced DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_opponent_hitters TO authenticated;
GRANT ALL ON public.gp_opponent_hitters TO service_role;
ALTER TABLE public.gp_opponent_hitters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own opp hitters" ON public.gp_opponent_hitters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER gp_opponent_hitters_updated BEFORE UPDATE ON public.gp_opponent_hitters
  FOR EACH ROW EXECUTE FUNCTION public.gp_set_updated_at();

-- ============================================================================
-- gp_documents (Trackman/GameChanger/Rapsodo/photo ingest)
-- ============================================================================
CREATE TABLE public.gp_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES public.gp_games(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('trackman','gamechanger','rapsodo','photo','other')),
  file_url TEXT,
  file_mime TEXT,
  attached_inning INT,
  parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending','parsing','ready','failed','applied')),
  parse_error TEXT,
  parsed_events JSONB DEFAULT '[]'::jsonb,
  raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_documents TO authenticated;
GRANT ALL ON public.gp_documents TO service_role;
ALTER TABLE public.gp_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gp docs" ON public.gp_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER gp_documents_updated BEFORE UPDATE ON public.gp_documents
  FOR EACH ROW EXECUTE FUNCTION public.gp_set_updated_at();
CREATE INDEX gp_documents_game_idx ON public.gp_documents(game_id);
