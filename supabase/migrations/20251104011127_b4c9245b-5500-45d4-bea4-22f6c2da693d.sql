-- Create a security definer function to check user roles without RLS blocking
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND status = 'active'
  )
$$;

-- Drop the problematic policy that uses EXISTS subqueries
DROP POLICY IF EXISTS "Scouts and coaches can view all player profiles" ON public.profiles;

-- Recreate the policy using the security definer function
CREATE POLICY "Scouts and coaches can view all player profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.user_has_role(id, 'player'::app_role)
  AND (
    public.user_has_role(auth.uid(), 'scout'::app_role) 
    OR public.user_has_role(auth.uid(), 'coach'::app_role)
  )
);