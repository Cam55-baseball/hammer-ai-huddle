-- 1. Columns
ALTER TABLE public.vault_scout_grades
  ADD COLUMN IF NOT EXISTS player_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS player_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_description text;

-- Grandfather existing official reports so historical data stays visible.
UPDATE public.vault_scout_grades
SET player_confirmed = true,
    player_confirmed_at = COALESCE(player_confirmed_at, graded_at)
WHERE grade_source = 'coach_evaluated' AND player_confirmed = false;

-- Self-reported / cv rows are inherently "confirmed"
UPDATE public.vault_scout_grades
SET player_confirmed = true
WHERE grade_source IS DISTINCT FROM 'coach_evaluated' AND player_confirmed = false;

CREATE INDEX IF NOT EXISTS idx_vsg_user_confirmed
  ON public.vault_scout_grades (user_id, grade_source, player_confirmed);
CREATE INDEX IF NOT EXISTS idx_vsg_evaluator
  ON public.vault_scout_grades (evaluator_id, graded_at DESC);

-- 2. RLS: an unconfirmed coach evaluation is readable ONLY by its author.
DROP POLICY IF EXISTS "Users can view own scout grades" ON public.vault_scout_grades;
CREATE POLICY "Users can view own scout grades"
ON public.vault_scout_grades
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND (grade_source IS DISTINCT FROM 'coach_evaluated' OR player_confirmed = true)
);

DROP POLICY IF EXISTS "Linked coaches can view official athlete grades" ON public.vault_scout_grades;
CREATE POLICY "Linked coaches can view official athlete grades"
ON public.vault_scout_grades
FOR SELECT
TO authenticated
USING (
  grade_source = ANY (ARRAY['coach_evaluated'::text, 'cv_measured'::text])
  AND player_confirmed = true
  AND public.is_linked_coach(auth.uid(), user_id)
);

-- 3. Player confirms attendance (SECURITY DEFINER: the row is not SELECT-visible yet)
CREATE OR REPLACE FUNCTION public.confirm_evaluation_attendance(p_evaluation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rows int;
BEGIN
  UPDATE public.vault_scout_grades
  SET player_confirmed = true,
      player_confirmed_at = now()
  WHERE id = p_evaluation_id
    AND user_id = auth.uid()
    AND grade_source = 'coach_evaluated'
    AND player_confirmed = false;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- 4. Pending stubs for the athlete: context only, never grades or notes.
CREATE OR REPLACE FUNCTION public.get_pending_evaluations()
RETURNS TABLE (
  id uuid,
  graded_at timestamptz,
  evaluation_context text,
  event_description text,
  grade_type text,
  evaluator_id uuid,
  evaluator_name text,
  evaluator_role text,
  evaluator_organization text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
         (SELECT o.name FROM public.organization_members om
            JOIN public.organizations o ON o.id = om.organization_id
           WHERE om.user_id = g.evaluator_id AND om.status = 'active'
           ORDER BY om.joined_at LIMIT 1)
  FROM public.vault_scout_grades g
  LEFT JOIN public.profiles p ON p.id = g.evaluator_id
  WHERE g.user_id = auth.uid()
    AND g.grade_source = 'coach_evaluated'
    AND g.player_confirmed = false
  ORDER BY g.graded_at DESC;
$$;

-- 5. Evaluator directory for an athlete (confirmed reports only).
CREATE OR REPLACE FUNCTION public.get_athlete_evaluators(p_athlete_id uuid)
RETURNS TABLE (
  evaluator_id uuid,
  evaluator_name text,
  evaluator_role text,
  evaluator_organization text,
  report_count bigint,
  latest_graded_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.evaluator_id,
         COALESCE(p.full_name, 'Unnamed evaluator'),
         (SELECT ur.role::text FROM public.user_roles ur
           WHERE ur.user_id = g.evaluator_id
             AND ur.role::text IN ('scout','coach')
             AND ur.status = 'active'
           ORDER BY ur.created_at LIMIT 1),
         (SELECT o.name FROM public.organization_members om
            JOIN public.organizations o ON o.id = om.organization_id
           WHERE om.user_id = g.evaluator_id AND om.status = 'active'
           ORDER BY om.joined_at LIMIT 1),
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
  GROUP BY g.evaluator_id, p.full_name
  ORDER BY max(g.graded_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_evaluation_attendance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_evaluations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_athlete_evaluators(uuid) TO authenticated;