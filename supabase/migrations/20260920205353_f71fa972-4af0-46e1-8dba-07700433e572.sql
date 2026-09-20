-- Anyone signed in could give themselves the owner or admin role.
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can claim only a self-service role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('player'::app_role, 'coach'::app_role, 'scout'::app_role, 'recruiter'::app_role)
  );

-- Elevated roles must be approved, not merely present.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND COALESCE(status, 'active') = 'active'
  )
$$;

-- Revert the broad athlete-profile read: the shared card view goes back to
-- exposing only its five public columns instead of whole profile rows.
DROP POLICY IF EXISTS "Signed-in users can view athlete profiles" ON public.profiles;
ALTER VIEW public.profiles_public SET (security_invoker = false);