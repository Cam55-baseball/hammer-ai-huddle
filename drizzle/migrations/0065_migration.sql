-- Snapshot before touching coach setup answers (nothing is ever lost).
CREATE TABLE IF NOT EXISTS public._snapshot_coach_context_20261014 AS SELECT * FROM public.coach_context;
ALTER TABLE public._snapshot_coach_context_20261014 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._snapshot_coach_context_20261014 FROM anon, authenticated;

-- Move existing answers into the structured chip form (e.g. "12u " -> "12U"); only rows that have answers.
UPDATE public.coach_context
SET age_groups = (
  SELECT array_agg(DISTINCT CASE WHEN btrim(g) ~* '^\d{1,2}u$' THEN upper(btrim(g)) ELSE btrim(g) END)
  FROM unnest(age_groups) g WHERE btrim(g) <> ''
)
WHERE age_groups IS NOT NULL AND cardinality(age_groups) > 0;

-- Read-only coach program summary for coach search, matching and organization views.
CREATE OR REPLACE FUNCTION public.coach_program_summaries(_ids uuid[])
RETURNS TABLE(user_id uuid, org_name text, program_name text, age_groups text[], primary_disciplines text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.user_id, c.org_name, c.program_name, c.age_groups, c.primary_disciplines
  FROM public.coach_context c
  WHERE auth.uid() IS NOT NULL
    AND c.user_id = ANY(_ids)
    AND cardinality(_ids) <= 200
    AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = c.user_id AND r.role = 'coach' AND r.status = 'active');
$$;
REVOKE ALL ON FUNCTION public.coach_program_summaries(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_program_summaries(uuid[]) TO authenticated;