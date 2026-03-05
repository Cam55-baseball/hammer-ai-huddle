
-- Game Scoring Module: games + game_plays tables

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport TEXT NOT NULL DEFAULT 'baseball',
  team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  league_level TEXT NOT NULL,
  base_distance_ft NUMERIC NOT NULL,
  mound_distance_ft NUMERIC NOT NULL,
  game_date DATE NOT NULL DEFAULT CURRENT_DATE,
  venue TEXT,
  total_innings INTEGER NOT NULL DEFAULT 9,
  status TEXT NOT NULL DEFAULT 'in_progress',
  lineup JSONB NOT NULL DEFAULT '[]'::jsonb,
  starting_pitcher_id TEXT,
  game_summary JSONB DEFAULT '{}'::jsonb,
  coach_insights JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own games" ON public.games FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.game_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  inning INTEGER NOT NULL,
  half TEXT NOT NULL DEFAULT 'top',
  batter_order INTEGER,
  batter_name TEXT,
  pitcher_name TEXT,
  pitch_number INTEGER,
  pitch_type TEXT,
  pitch_velocity_mph NUMERIC,
  velocity_band TEXT,
  pitch_location JSONB,
  pitch_result TEXT NOT NULL,
  exit_velocity_mph NUMERIC,
  launch_angle NUMERIC,
  spray_direction TEXT,
  contact_quality TEXT,
  batted_ball_type TEXT,
  at_bat_outcome TEXT,
  rbi INTEGER DEFAULT 0,
  situational_data JSONB DEFAULT '{}'::jsonb,
  defensive_data JSONB DEFAULT '{}'::jsonb,
  catcher_data JSONB DEFAULT '{}'::jsonb,
  baserunning_data JSONB DEFAULT '{}'::jsonb,
  video_id TEXT,
  video_start_sec NUMERIC,
  video_end_sec NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own game plays" ON public.game_plays FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND user_id = auth.uid()));
