CREATE OR REPLACE FUNCTION public.staff_athlete_timeline(p_athlete uuid, p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, tag text, start_date date, end_date date, dates date[], summary text, typed_text text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e.tag, e.start_date, e.end_date, e.dates, e.summary,
         NULLIF(e.payload->>'text', '') AS typed_text, e.created_at
  FROM public.schedule_timeline_entries e
  WHERE e.user_id = p_athlete
    AND e.undone_at IS NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.wk_staff_access a
                WHERE a.staff_user_id = auth.uid() AND a.athlete_user_id = p_athlete AND a.revoked_at IS NULL)
    AND NOT public.has_role(auth.uid(), 'scout')
    AND NOT public.has_role(auth.uid(), 'recruiter')
  ORDER BY e.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;
REVOKE ALL ON FUNCTION public.staff_athlete_timeline(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_athlete_timeline(uuid, integer) TO authenticated;