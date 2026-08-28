ALTER TABLE public.combine_sessions ADD COLUMN IF NOT EXISTS recorded_by uuid;
ALTER TABLE public.combine_results ADD COLUMN IF NOT EXISTS recorded_by uuid;

CREATE INDEX IF NOT EXISTS idx_combine_sessions_recorded_by ON public.combine_sessions(recorded_by);
CREATE INDEX IF NOT EXISTS idx_combine_results_recorded_by ON public.combine_results(recorded_by);

-- Evaluators (active scout/coach) may create combine paperwork for an athlete.
CREATE POLICY "Evaluators can record combine sessions"
ON public.combine_sessions FOR INSERT TO authenticated
WITH CHECK (
  public.has_active_evaluator_role(auth.uid())
  AND recorded_by = auth.uid()
  AND user_id <> auth.uid()
);

CREATE POLICY "Evaluators can read combine sessions they recorded"
ON public.combine_sessions FOR SELECT TO authenticated
USING (recorded_by = auth.uid() AND public.has_active_evaluator_role(auth.uid()));

CREATE POLICY "Evaluators can record combine results"
ON public.combine_results FOR INSERT TO authenticated
WITH CHECK (
  public.has_active_evaluator_role(auth.uid())
  AND recorded_by = auth.uid()
  AND user_id <> auth.uid()
  AND source = 'manual_entry'
  AND EXISTS (
    SELECT 1 FROM public.combine_sessions s
    WHERE s.id = session_id AND s.recorded_by = auth.uid() AND s.user_id = combine_results.user_id
  )
);

CREATE POLICY "Evaluators can read combine results they recorded"
ON public.combine_results FOR SELECT TO authenticated
USING (recorded_by = auth.uid() AND public.has_active_evaluator_role(auth.uid()));

-- Eligibility + tier context for an evaluator, without exposing other athlete data.
CREATE OR REPLACE FUNCTION public.combine_evaluator_context(p_athlete uuid, p_sport text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing timestamptz;
  v_tier text;
  v_sport text;
  v_name text;
BEGIN
  IF NOT public.has_active_evaluator_role(auth.uid()) THEN
    RAISE EXCEPTION 'not an active evaluator';
  END IF;

  SELECT created_at INTO v_existing
  FROM public.combine_sessions
  WHERE user_id = p_athlete
    AND sport = p_sport
    AND date_trunc('month', created_at AT TIME ZONE 'UTC') = date_trunc('month', now() AT TIME ZONE 'UTC')
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT tier INTO v_tier FROM public.subscriptions WHERE user_id = p_athlete LIMIT 1;
  SELECT sport INTO v_sport FROM public.athlete_mpi_settings WHERE user_id = p_athlete LIMIT 1;
  SELECT full_name INTO v_name FROM public.profiles WHERE id = p_athlete LIMIT 1;

  RETURN jsonb_build_object(
    'athlete_id', p_athlete,
    'athlete_name', v_name,
    'athlete_sport', v_sport,
    'tier', v_tier,
    'existing_session_created_at', v_existing
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.combine_evaluator_context(uuid, text) TO authenticated;