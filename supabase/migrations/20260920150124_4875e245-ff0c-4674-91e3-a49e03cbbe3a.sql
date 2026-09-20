-- v1.2 §B2 — planned off days. Nothing existing fits: user_rest_day_overrides
-- is the weekly rest-day mechanism (type limited to manual_rest/auto_recurring,
-- no reason, no source) and is read by the live scheduler.
CREATE TABLE public.planned_off_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  source text NOT NULL DEFAULT 'onboarding',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_off_days TO authenticated;
GRANT ALL ON public.planned_off_days TO service_role;
ALTER TABLE public.planned_off_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own planned off days"
  ON public.planned_off_days FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_planned_off_days_updated_at
  BEFORE UPDATE ON public.planned_off_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- v1.2 §B1 — onboarding answers (behind training_intel_v1, default OFF).
CREATE TABLE public.training_intel_onboarding (
  user_id uuid PRIMARY KEY,
  phase text NOT NULL,
  phase_start_date date,
  days_into_phase integer,
  block_name text,
  first_game_date date,
  offseason_weeks integer,
  recent_overall text,
  recent_lifting_days_per_week integer,
  recent_throwing_status text,
  recent_practices_per_week integer,
  days_since_last_loaded_lift integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_intel_onboarding TO authenticated;
GRANT ALL ON public.training_intel_onboarding TO service_role;
ALTER TABLE public.training_intel_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own training setup"
  ON public.training_intel_onboarding FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_training_intel_onboarding_updated_at
  BEFORE UPDATE ON public.training_intel_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- v1.2 §D1/§D2 — bucket tree and labels.
ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS sub_bucket text,
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS evidence_grade text;
CREATE INDEX IF NOT EXISTS wk_movement_catalog_bucket_idx
  ON public.wk_movement_catalog (bucket, sub_bucket);