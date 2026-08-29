ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS evaluator_title text,
  ADD COLUMN IF NOT EXISTS evaluator_organization text;

DROP FUNCTION IF EXISTS public.get_athlete_evaluators(uuid);
DROP FUNCTION IF EXISTS public.get_pending_evaluations();

CREATE OR REPLACE FUNCTION public.get_athlete_evaluators(p_athlete_id uuid)
 RETURNS TABLE(evaluator_id uuid, evaluator_name text, evaluator_role text, evaluator_title text, evaluator_organization text, report_count bigint, latest_graded_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.evaluator_id,
         COALESCE(p.full_name, 'Unnamed evaluator'),
         (SELECT ur.role::text FROM public.user_roles ur
           WHERE ur.user_id = g.evaluator_id
             AND ur.role::text IN ('scout','coach')
             AND ur.status = 'active'
           ORDER BY ur.created_at LIMIT 1),
         NULLIF(btrim(COALESCE(p.evaluator_title, '')), ''),
         COALESCE(
           NULLIF(btrim(COALESCE(p.evaluator_organization, '')), ''),
           (SELECT o.name FROM public.organization_members om
              JOIN public.organizations o ON o.id = om.organization_id
             WHERE om.user_id = g.evaluator_id AND om.status = 'active'
             ORDER BY om.joined_at LIMIT 1)
         ),
         count(*),
         max(g.graded_at)
  FROM public.vault_scout_grades g
  LEFT JOIN public.profiles p ON p.id = g.evaluator_id
  WHERE g.user_id = p_athlete_id
    AND g.grade_source = 'coach_evaluated'
    AND g.player_confirmed = true
    AND g.evaluator_id IS NOT NULL
    AND (
      auth.uid() = p_athlete_id
      OR public.is_linked_coach(auth.uid(), p_athlete_id)
      OR public.has_role(auth.uid(), 'owner')
    )
  GROUP BY g.evaluator_id, p.full_name, p.evaluator_title, p.evaluator_organization
  ORDER BY max(g.graded_at) DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_pending_evaluations()
 RETURNS TABLE(id uuid, graded_at timestamp with time zone, evaluation_context text, event_description text, grade_type text, evaluator_id uuid, evaluator_name text, evaluator_role text, evaluator_title text, evaluator_organization text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.id,
         g.graded_at,
         g.evaluation_context,
         g.event_description,
         g.grade_type,
         g.evaluator_id,
         COALESCE(p.full_name, 'Unnamed evaluator'),
         (SELECT ur.role::text FROM public.user_roles ur
           WHERE ur.user_id = g.evaluator_id
             AND ur.role::text IN ('scout','coach')
             AND ur.status = 'active'
           ORDER BY ur.created_at LIMIT 1),
         NULLIF(btrim(COALESCE(p.evaluator_title, '')), ''),
         COALESCE(
           NULLIF(btrim(COALESCE(p.evaluator_organization, '')), ''),
           (SELECT o.name FROM public.organization_members om
              JOIN public.organizations o ON o.id = om.organization_id
             WHERE om.user_id = g.evaluator_id AND om.status = 'active'
             ORDER BY om.joined_at LIMIT 1)
         )
  FROM public.vault_scout_grades g
  LEFT JOIN public.profiles p ON p.id = g.evaluator_id
  WHERE g.user_id = auth.uid()
    AND g.grade_source = 'coach_evaluated'
    AND g.player_confirmed = false
    AND g.player_rejected = false
  ORDER BY g.graded_at DESC;
$function$;