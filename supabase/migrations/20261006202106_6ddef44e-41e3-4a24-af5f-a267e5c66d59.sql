ALTER FUNCTION public.anon_age_band(int) SET search_path = public;
CREATE POLICY "Owners and admins read refresh state" ON public.anon_training_refresh_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.anon_training_refresh_state TO authenticated;