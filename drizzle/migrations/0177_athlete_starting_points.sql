CREATE TABLE public.athlete_starting_points (
  user_id uuid NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball','softball')),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  program text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sport)
);
GRANT SELECT, INSERT, UPDATE ON public.athlete_starting_points TO authenticated;
GRANT ALL ON public.athlete_starting_points TO service_role;
ALTER TABLE public.athlete_starting_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own starting points read" ON public.athlete_starting_points FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own starting points insert" ON public.athlete_starting_points FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND updated_by = auth.uid());
CREATE POLICY "own starting points update" ON public.athlete_starting_points FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND updated_by = auth.uid());

CREATE TABLE public.athlete_starting_point_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL,
  answers jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.athlete_starting_point_log TO authenticated;
GRANT ALL ON public.athlete_starting_point_log TO service_role;
ALTER TABLE public.athlete_starting_point_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own starting point log read" ON public.athlete_starting_point_log FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_starting_point_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  INSERT INTO public.athlete_starting_point_log(user_id, sport, answers, changed_by)
  VALUES (NEW.user_id, NEW.sport, NEW.answers, coalesce(NEW.updated_by, auth.uid()));
  RETURN NEW;
END $$;
CREATE TRIGGER athlete_starting_points_log
BEFORE INSERT OR UPDATE ON public.athlete_starting_points
FOR EACH ROW EXECUTE FUNCTION public.log_starting_point_change();