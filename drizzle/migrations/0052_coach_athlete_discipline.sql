CREATE OR REPLACE FUNCTION public.coach_athlete_discipline(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _from date := current_date - 89; _days jsonb; _skips jsonb;
BEGIN
  IF NOT (auth.uid() = _athlete OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  WITH rx AS (
    SELECT p.plan_date, p.slot, EXISTS (SELECT 1 FROM wk_session_logs l WHERE l.prescription_id = p.id) AS done
    FROM wk_prescriptions p
    WHERE p.user_id = _athlete AND p.plan_date BETWEEN _from AND current_date
  )
  SELECT
    COALESCE((SELECT jsonb_agg(jsonb_build_object('date', plan_date, 'prescribed', n, 'done', d) ORDER BY plan_date)
              FROM (SELECT plan_date, count(*) n, count(*) FILTER (WHERE done) d FROM rx GROUP BY plan_date) x), '[]'),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('slot', slot, 'skipped', s, 'prescribed', n) ORDER BY s DESC)
              FROM (SELECT coalesce(slot,'other') slot, count(*) FILTER (WHERE NOT done AND plan_date < current_date) s, count(*) FILTER (WHERE plan_date < current_date) n FROM rx GROUP BY 1) y WHERE n > 0), '[]')
  INTO _days, _skips;
  RETURN jsonb_build_object('days', _days, 'skips', _skips, 'from', _from, 'to', current_date);
END $$;
REVOKE ALL ON FUNCTION public.coach_athlete_discipline(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_discipline(uuid) TO authenticated;