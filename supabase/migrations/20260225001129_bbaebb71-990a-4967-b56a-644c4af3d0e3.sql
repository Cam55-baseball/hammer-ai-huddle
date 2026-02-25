-- P0: Drop the dangerous blanket SELECT policy that exposes all PII
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- Recreate profiles_public WITHOUT security_invoker
-- This makes the view run as the owner (superuser), bypassing base table RLS
-- while only exposing the 5 safe columns
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT id, full_name, avatar_url, position, experience_level
FROM public.profiles;

-- Grant authenticated users SELECT on the view only
GRANT SELECT ON public.profiles_public TO authenticated;

-- P2: Add governance_flags INSERT policy for resilience
CREATE POLICY "Users can insert own governance flags"
ON public.governance_flags FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);