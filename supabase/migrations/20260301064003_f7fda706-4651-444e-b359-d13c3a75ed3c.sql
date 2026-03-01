
-- Stream 1C: Attach coach immutability trigger
CREATE TRIGGER prevent_coach_override_modification
  BEFORE UPDATE OR DELETE ON public.coach_grade_overrides
  FOR EACH ROW EXECUTE FUNCTION public.prevent_override_modification();

-- Stream 2A: Create athlete_daily_log table
CREATE TABLE public.athlete_daily_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL,
  day_status text NOT NULL DEFAULT 'full_training',
  rest_reason text,
  coach_override boolean DEFAULT false,
  coach_override_by uuid,
  injury_mode boolean DEFAULT false,
  injury_body_region text,
  injury_expected_days integer,
  game_logged boolean DEFAULT false,
  cns_load_actual numeric DEFAULT 0,
  consistency_impact numeric DEFAULT 0,
  momentum_impact numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

ALTER TABLE public.athlete_daily_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily log"
  ON public.athlete_daily_log FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches view athlete daily logs"
  ON public.athlete_daily_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_mpi_settings ams
      WHERE ams.user_id = athlete_daily_log.user_id
        AND ams.primary_coach_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all daily logs"
  ON public.athlete_daily_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_athlete_daily_log_updated_at
  BEFORE UPDATE ON public.athlete_daily_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stream 5B: Add governance columns to verified_stat_profiles
ALTER TABLE public.verified_stat_profiles
  ADD COLUMN IF NOT EXISTS confidence_weight numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS admin_verified boolean DEFAULT false;
