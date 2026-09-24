CREATE TABLE public.phase_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('owner','athlete')),
  user_id uuid,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  version text NOT NULL,
  computed_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, user_id, computed_on)
);
CREATE UNIQUE INDEX phase_insights_owner_day ON public.phase_insights (computed_on) WHERE scope = 'owner';
GRANT SELECT ON public.phase_insights TO authenticated;
GRANT ALL ON public.phase_insights TO service_role;
ALTER TABLE public.phase_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and admins read all insights" ON public.phase_insights FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Athletes read their own insights" ON public.phase_insights FOR SELECT TO authenticated
  USING (scope = 'athlete' AND user_id = auth.uid());
CREATE POLICY "Coaches read their athletes' insights" ON public.phase_insights FOR SELECT TO authenticated
  USING (scope = 'athlete' AND user_id IS NOT NULL AND public.is_coach_of(auth.uid(), user_id));
CREATE TRIGGER phase_insights_updated_at BEFORE UPDATE ON public.phase_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();