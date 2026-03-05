
-- League classifications cache for AI-classified summer leagues
CREATE TABLE public.league_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL,
  league_name TEXT NOT NULL,
  country TEXT,
  difficulty_multiplier NUMERIC NOT NULL DEFAULT 0.85,
  ai_classified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport, league_name)
);
ALTER TABLE public.league_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read league classifications" ON public.league_classifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert league classifications" ON public.league_classifications FOR INSERT TO authenticated WITH CHECK (true);

-- Add competition weighting columns to performance_sessions
ALTER TABLE public.performance_sessions 
  ADD COLUMN IF NOT EXISTS competition_level TEXT,
  ADD COLUMN IF NOT EXISTS competition_weight NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS age_play_up_bonus NUMERIC DEFAULT 0;

-- Add steps tracking to speed_sessions
ALTER TABLE public.speed_sessions 
  ADD COLUMN IF NOT EXISTS steps_per_rep JSONB DEFAULT '{}';
