
-- Add new columns to vault_focus_quizzes
ALTER TABLE public.vault_focus_quizzes
  ADD COLUMN IF NOT EXISTS appetite text,
  ADD COLUMN IF NOT EXISTS stress_sources text[],
  ADD COLUMN IF NOT EXISTS movement_restriction jsonb,
  ADD COLUMN IF NOT EXISTS resting_hr integer;

-- Create physio_health_profiles table
CREATE TABLE IF NOT EXISTS public.physio_health_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  blood_type text,
  dietary_style text,
  allergies text[],
  food_intolerances text[],
  medications text[],
  medical_conditions text[],
  injury_history text[],
  supplements text[],
  active_illness text,
  illness_started_at date,
  adult_features_enabled boolean NOT NULL DEFAULT false,
  setup_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.physio_health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own physio health profile"
  ON public.physio_health_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_physio_health_profiles_updated_at
  BEFORE UPDATE ON public.physio_health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create physio_daily_reports table
CREATE TABLE IF NOT EXISTS public.physio_daily_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  regulation_score integer NOT NULL DEFAULT 0 CHECK (regulation_score >= 0 AND regulation_score <= 100),
  regulation_color text NOT NULL DEFAULT 'yellow',
  -- Component scores
  sleep_score integer,
  stress_score integer,
  readiness_score integer,
  restriction_score integer,
  load_score integer,
  fuel_score integer,
  calendar_score integer,
  -- AI report content
  report_headline text,
  report_sections jsonb,
  -- Suggestion responses (apply/modify/decline per section)
  suggestion_responses jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_date)
);

ALTER TABLE public.physio_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own physio daily reports"
  ON public.physio_daily_reports
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_physio_daily_reports_updated_at
  BEFORE UPDATE ON public.physio_daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create physio_adult_tracking table
CREATE TABLE IF NOT EXISTS public.physio_adult_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tracking_date date NOT NULL DEFAULT CURRENT_DATE,
  -- Shared fields
  libido_level integer CHECK (libido_level >= 1 AND libido_level <= 5),
  -- Female-specific
  cycle_phase text,
  cycle_day integer,
  period_active boolean DEFAULT false,
  -- Male-specific
  wellness_consistency boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, tracking_date)
);

ALTER TABLE public.physio_adult_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own physio adult tracking"
  ON public.physio_adult_tracking
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_physio_adult_tracking_updated_at
  BEFORE UPDATE ON public.physio_adult_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
