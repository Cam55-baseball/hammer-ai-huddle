ALTER TABLE public.coach_private_notes ADD COLUMN IF NOT EXISTS issue_area text, ADD COLUMN IF NOT EXISTS issue_label text;
ALTER TABLE public.coach_private_notes ADD CONSTRAINT coach_private_notes_issue_area_chk CHECK (issue_area IS NULL OR issue_area IN ('defense','hitting','throwing','baserunning'));
ALTER TABLE public.coach_private_notes ADD CONSTRAINT coach_private_notes_issue_label_chk CHECK (issue_label IS NULL OR (issue_area IS NOT NULL AND char_length(issue_label) <= 120));
COMMENT ON COLUMN public.coach_private_notes.issue_area IS 'Optional coach tag; only area+label (never body) are shared with the tagged player via my_coach_issue_tags.';
CREATE OR REPLACE FUNCTION public.my_coach_issue_tags(_days integer DEFAULT 28)
RETURNS TABLE(issue_area text, issue_label text, created_at timestamptz, coach_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.issue_area, n.issue_label, n.created_at, coalesce(p.first_name, p.full_name, 'Your coach')
  FROM public.coach_private_notes n
  LEFT JOIN public.profiles p ON p.id = n.coach_id
  WHERE n.athlete_id = auth.uid()
    AND n.issue_area IS NOT NULL
    AND n.created_at >= now() - make_interval(days => greatest(1, least(coalesce(_days, 28), 90)))
    AND public.coach_connected_to(n.coach_id, n.athlete_id)
  ORDER BY n.created_at DESC
  LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.my_coach_issue_tags(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_coach_issue_tags(integer) TO authenticated;