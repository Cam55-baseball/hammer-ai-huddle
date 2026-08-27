CREATE POLICY "Linked coaches can view official athlete grades"
ON public.vault_scout_grades
FOR SELECT
TO authenticated
USING (
  grade_source IN ('coach_evaluated', 'cv_measured')
  AND public.is_linked_coach(auth.uid(), user_id)
);