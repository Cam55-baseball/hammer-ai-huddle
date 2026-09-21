DROP POLICY IF EXISTS "Scouts and coaches can view all player profiles" ON public.profiles;

CREATE POLICY "Linked coaches can view their athletes' profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_coach_of(auth.uid(), id)
  AND NOT public.is_blocked_pair(auth.uid(), id)
);

CREATE POLICY "Scouts can view athletes who granted recruiting consent"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.user_has_role(auth.uid(), 'scout'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.athlete_recruiting_consent c
    WHERE c.athlete_id = public.profiles.id
      AND c.visibility_enabled = true
  )
  AND NOT public.is_blocked_pair(auth.uid(), id)
);