
-- =============================================
-- Migration 2: Settings and Authority Tables
-- =============================================

-- athlete_mpi_settings: Per-user MPI configuration
CREATE TABLE public.athlete_mpi_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  sport text NOT NULL,
  primary_position text,
  secondary_position text,
  primary_coach_id uuid,
  secondary_coach_ids uuid[] DEFAULT '{}',
  league_tier text DEFAULT 'rec',
  date_of_birth date,
  games_minimum_met boolean DEFAULT false,
  integrity_threshold_met boolean DEFAULT false,
  coach_validation_met boolean DEFAULT false,
  data_span_met boolean DEFAULT false,
  ranking_eligible boolean DEFAULT false,
  admin_progression_locked boolean DEFAULT false,
  admin_probability_frozen boolean DEFAULT false,
  admin_ranking_excluded boolean DEFAULT false,
  streak_current integer DEFAULT 0,
  streak_best integer DEFAULT 0,
  is_switch_hitter boolean DEFAULT false,
  is_ambidextrous_thrower boolean DEFAULT false,
  primary_batting_side text DEFAULT 'R',
  primary_throwing_hand text DEFAULT 'R',
  is_college_verified boolean DEFAULT false,
  is_pro_verified boolean DEFAULT false,
  verified_stat_profile_id uuid,
  data_density_level integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_mpi_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own MPI settings"
  ON public.athlete_mpi_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own MPI settings"
  ON public.athlete_mpi_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MPI settings"
  ON public.athlete_mpi_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_athlete_mpi_settings_updated_at
  BEFORE UPDATE ON public.athlete_mpi_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- lesson_trainers: Verified trainer registry
CREATE TABLE public.lesson_trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  facility text,
  verified boolean DEFAULT false,
  verified_by uuid,
  sport text,
  specializations text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_trainers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can select trainers"
  ON public.lesson_trainers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage trainers"
  ON public.lesson_trainers FOR ALL
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

-- coach_grade_overrides: Immutable override log
CREATE TABLE public.coach_grade_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.performance_sessions(id),
  coach_id uuid NOT NULL,
  original_grade numeric,
  override_grade numeric,
  override_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_grade_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can insert overrides"
  ON public.coach_grade_overrides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Admins can select all overrides"
  ON public.coach_grade_overrides FOR SELECT
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin') OR auth.uid() = coach_id);

-- Prevent UPDATE/DELETE on coach_grade_overrides
CREATE OR REPLACE FUNCTION public.prevent_override_modification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Coach grade overrides are immutable and cannot be modified or deleted';
END;
$$;

CREATE TRIGGER prevent_override_update
  BEFORE UPDATE ON public.coach_grade_overrides
  FOR EACH ROW EXECUTE FUNCTION public.prevent_override_modification();

CREATE TRIGGER prevent_override_delete
  BEFORE DELETE ON public.coach_grade_overrides
  FOR EACH ROW EXECUTE FUNCTION public.prevent_override_modification();

-- scout_evaluations: Independent scout submissions (immutable)
CREATE TABLE public.scout_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  sport text NOT NULL,
  evaluation_date date NOT NULL,
  tool_grades jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_grade numeric,
  notes text,
  game_context text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scout_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scouts can insert own evaluations"
  ON public.scout_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = scout_id);

CREATE POLICY "Users can select evaluations about them"
  ON public.scout_evaluations FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id OR auth.uid() = scout_id OR public.user_has_role(auth.uid(), 'admin'));

-- Prevent UPDATE/DELETE on scout_evaluations
CREATE TRIGGER prevent_scout_eval_update
  BEFORE UPDATE ON public.scout_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_override_modification();

CREATE TRIGGER prevent_scout_eval_delete
  BEFORE DELETE ON public.scout_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_override_modification();
