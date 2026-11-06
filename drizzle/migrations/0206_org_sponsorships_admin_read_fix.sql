DROP POLICY IF EXISTS "org admins see their sponsorships" ON public.org_sponsorships;
CREATE POLICY "org admins see their sponsorships" ON public.org_sponsorships
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));