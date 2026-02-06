
-- =====================================================
-- Speed Lab Tables for Speed Intelligence Submodule
-- =====================================================

-- Table: speed_sessions
CREATE TABLE public.speed_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball', 'softball')),
  session_number integer NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  distances jsonb DEFAULT '{}',
  rpe integer CHECK (rpe >= 1 AND rpe <= 10),
  body_feel_before text CHECK (body_feel_before IN ('good', 'okay', 'tight')),
  body_feel_after text CHECK (body_feel_after IN ('good', 'okay', 'tight')),
  sleep_rating integer CHECK (sleep_rating >= 1 AND sleep_rating <= 5),
  pain_areas jsonb DEFAULT '[]',
  drill_log jsonb DEFAULT '[]',
  is_break_day boolean DEFAULT false,
  readiness_score integer CHECK (readiness_score >= 0 AND readiness_score <= 100),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.speed_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own speed sessions"
  ON public.speed_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own speed sessions"
  ON public.speed_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own speed sessions"
  ON public.speed_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own speed sessions"
  ON public.speed_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_speed_sessions_user_sport ON public.speed_sessions (user_id, sport);
CREATE INDEX idx_speed_sessions_date ON public.speed_sessions (user_id, session_date DESC);

-- Table: speed_goals
CREATE TABLE public.speed_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball', 'softball')),
  current_track text NOT NULL DEFAULT 'building_speed' CHECK (current_track IN ('building_speed', 'competitive_speed', 'elite_speed', 'world_class')),
  goal_distances jsonb DEFAULT '{}',
  weeks_without_improvement integer DEFAULT 0,
  last_adjustment_date date,
  adjustment_history jsonb DEFAULT '[]',
  personal_bests jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sport)
);

ALTER TABLE public.speed_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own speed goals"
  ON public.speed_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own speed goals"
  ON public.speed_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own speed goals"
  ON public.speed_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own speed goals"
  ON public.speed_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Table: speed_partner_timings
CREATE TABLE public.speed_partner_timings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.speed_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  distance text NOT NULL,
  time_seconds numeric NOT NULL,
  timed_by text NOT NULL DEFAULT 'self' CHECK (timed_by IN ('self', 'partner')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.speed_partner_timings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own partner timings"
  ON public.speed_partner_timings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partner timings"
  ON public.speed_partner_timings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partner timings"
  ON public.speed_partner_timings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own partner timings"
  ON public.speed_partner_timings FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_speed_partner_timings_session ON public.speed_partner_timings (session_id);

-- Trigger for updated_at on speed_goals
CREATE TRIGGER update_speed_goals_updated_at
  BEFORE UPDATE ON public.speed_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
