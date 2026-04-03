
-- drill_prescriptions table for adaptive learning loop
CREATE TABLE public.drill_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prescribed_at timestamptz NOT NULL DEFAULT now(),
  weakness_area text NOT NULL,
  drill_name text NOT NULL,
  module text NOT NULL,
  constraints text,
  pre_score numeric,
  post_score numeric,
  effectiveness_score numeric,
  adherence_count integer DEFAULT 0,
  resolved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drill_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own prescriptions"
  ON public.drill_prescriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages prescriptions"
  ON public.drill_prescriptions FOR ALL
  TO service_role
  USING (true);

-- Add unique constraint on hie_snapshots for upsert
CREATE UNIQUE INDEX IF NOT EXISTS hie_snapshots_user_sport_unique
  ON public.hie_snapshots (user_id, sport);

-- engine_settings table for owner admin panel
CREATE TABLE public.engine_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.engine_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read engine settings"
  ON public.engine_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners update engine settings"
  ON public.engine_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Service role manages engine settings"
  ON public.engine_settings FOR ALL
  TO service_role
  USING (true);
