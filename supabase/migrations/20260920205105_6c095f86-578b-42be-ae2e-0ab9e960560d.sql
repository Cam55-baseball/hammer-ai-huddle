-- profiles_public bypassed row-level security entirely. Make it respect the
-- caller's permissions, and replace the de-facto access it granted with an
-- explicit, auditable policy limited to athlete (player) profiles.
ALTER VIEW public.profiles_public SET (security_invoker = true);

CREATE POLICY "Signed-in users can view athlete profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.user_has_role(id, 'player'::app_role)
    AND NOT public.is_blocked_pair(auth.uid(), id)
  );