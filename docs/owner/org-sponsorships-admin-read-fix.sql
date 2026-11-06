-- NOT APPLIED. Needs owner approval by name.
-- Bug (Nov 6 r5): the org-admin read rule on org_sponsorships passes is_org_admin's arguments
-- in the wrong order (is_org_admin(_user, _org) was called as (organization_id, auth.uid())),
-- so organization admins can never see their own sponsorships ("No sponsored players yet").
-- Every other policy calls is_org_admin(auth.uid(), organization_id). Read-only rule, no data change.
DROP POLICY IF EXISTS "org admins see their sponsorships" ON public.org_sponsorships;
CREATE POLICY "org admins see their sponsorships" ON public.org_sponsorships
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));
