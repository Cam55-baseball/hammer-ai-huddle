CREATE OR REPLACE FUNCTION public.has_active_evaluator_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('scout'::app_role, 'coach'::app_role)
      AND status = 'active'
  )
$$;

CREATE POLICY "Evaluators can insert coach evaluations"
ON public.vault_scout_grades
FOR INSERT
TO authenticated
WITH CHECK (
  evaluator_id = auth.uid()
  AND grade_source = 'coach_evaluated'
  AND public.has_active_evaluator_role(auth.uid())
);

CREATE POLICY "Evaluators can view their own evaluations"
ON public.vault_scout_grades
FOR SELECT
TO authenticated
USING (evaluator_id = auth.uid());