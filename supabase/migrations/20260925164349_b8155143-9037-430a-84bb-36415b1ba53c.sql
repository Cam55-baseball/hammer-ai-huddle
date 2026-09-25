CREATE TABLE public.athlete_height_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  measured_on date NOT NULL DEFAULT current_date,
  inches numeric NOT NULL,
  source text NOT NULL DEFAULT 'profile',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_on)
);
GRANT SELECT ON public.athlete_height_checks TO authenticated;
GRANT ALL ON public.athlete_height_checks TO service_role;
ALTER TABLE public.athlete_height_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete reads own height checks" ON public.athlete_height_checks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "linked coach reads height checks" ON public.athlete_height_checks FOR SELECT TO authenticated USING (public.is_linked_coach(auth.uid(), user_id));
COMMENT ON TABLE public.athlete_height_checks IS 'Height readings over time; read by growth-adjusted pitching age (youthThrowing.growthAdjustment). Written only by trigger on profiles.height_inches.';

CREATE OR REPLACE FUNCTION public.log_height_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.height_inches IS NOT NULL AND NEW.height_inches > 0
     AND (TG_OP = 'INSERT' OR NEW.height_inches IS DISTINCT FROM OLD.height_inches) THEN
    INSERT INTO public.athlete_height_checks (user_id, measured_on, inches)
    VALUES (NEW.id, current_date, NEW.height_inches)
    ON CONFLICT (user_id, measured_on) DO UPDATE SET inches = EXCLUDED.inches;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_height_check() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_log_height_check AFTER INSERT OR UPDATE OF height_inches ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_height_check();