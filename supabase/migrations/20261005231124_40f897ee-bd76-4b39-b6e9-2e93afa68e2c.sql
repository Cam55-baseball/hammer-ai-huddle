CREATE TABLE public.pitcher_schedule_settings (
  user_id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'starter',
  rotation_anchor_date date,
  rotation_every_days integer,
  rotation_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pss_role CHECK (role IN ('starter','reliever','both')),
  CONSTRAINT pss_every CHECK (rotation_every_days IS NULL OR rotation_every_days BETWEEN 2 AND 10)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitcher_schedule_settings TO authenticated;
GRANT ALL ON public.pitcher_schedule_settings TO service_role;
ALTER TABLE public.pitcher_schedule_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pitcher settings" ON public.pitcher_schedule_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pitcher_outings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  outing_type text NOT NULL DEFAULT 'start',
  planned_date date,
  actual_date date,
  status text NOT NULL DEFAULT 'planned',
  source text NOT NULL DEFAULT 'athlete',
  pitch_count integer,
  innings numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT po_type CHECK (outing_type IN ('start','relief','bullpen')),
  CONSTRAINT po_status CHECK (status IN ('planned','thrown','skipped')),
  CONSTRAINT po_has_date CHECK (planned_date IS NOT NULL OR actual_date IS NOT NULL),
  CONSTRAINT po_thrown_has_actual CHECK (status <> 'thrown' OR actual_date IS NOT NULL)
);
CREATE INDEX pitcher_outings_user_dates ON public.pitcher_outings (user_id, planned_date, actual_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitcher_outings TO authenticated;
GRANT ALL ON public.pitcher_outings TO service_role;
ALTER TABLE public.pitcher_outings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pitcher outings" ON public.pitcher_outings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pitcher_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  available boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitcher_availability TO authenticated;
GRANT ALL ON public.pitcher_availability TO service_role;
ALTER TABLE public.pitcher_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pitcher availability" ON public.pitcher_availability FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.pitcher_sched_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER pss_touch BEFORE UPDATE ON public.pitcher_schedule_settings FOR EACH ROW EXECUTE FUNCTION public.pitcher_sched_touch();
CREATE TRIGGER po_touch BEFORE UPDATE ON public.pitcher_outings FOR EACH ROW EXECUTE FUNCTION public.pitcher_sched_touch();
CREATE TRIGGER pa_touch BEFORE UPDATE ON public.pitcher_availability FOR EACH ROW EXECUTE FUNCTION public.pitcher_sched_touch();