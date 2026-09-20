CREATE TABLE public.ti_watch_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  noted_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL CHECK (severity IN ('info','warn','critical')),
  category text NOT NULL,
  user_id uuid,
  decision_id uuid,
  title text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_action text,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ti_watch_notes_noted_at_idx ON public.ti_watch_notes (noted_at DESC);
CREATE INDEX ti_watch_notes_severity_idx ON public.ti_watch_notes (severity, noted_at DESC);
CREATE INDEX ti_watch_notes_category_idx ON public.ti_watch_notes (category, noted_at DESC);
CREATE INDEX ti_watch_notes_user_idx ON public.ti_watch_notes (user_id, noted_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.ti_watch_notes TO authenticated;
GRANT ALL ON public.ti_watch_notes TO service_role;

ALTER TABLE public.ti_watch_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes read their own notes"
  ON public.ti_watch_notes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_training_intel_owner(auth.uid()));

CREATE POLICY "Athletes report their own card"
  ON public.ti_watch_notes FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND category = 'athlete_report' AND severity = 'info')
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_training_intel_owner(auth.uid())
  );

CREATE POLICY "Staff acknowledge notes"
  ON public.ti_watch_notes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_training_intel_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_training_intel_owner(auth.uid()));

CREATE TABLE public.ti_watch_baselines (
  metric text PRIMARY KEY,
  value numeric NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ti_watch_baselines TO authenticated;
GRANT ALL ON public.ti_watch_baselines TO service_role;

ALTER TABLE public.ti_watch_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read baselines"
  ON public.ti_watch_baselines FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_training_intel_owner(auth.uid()));

CREATE TRIGGER ti_watch_baselines_updated_at
  BEFORE UPDATE ON public.ti_watch_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();