CREATE OR REPLACE FUNCTION public.swap_v2_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.wk_feature_switches s WHERE s.feature_key = 'swap_v2'
  AND (s.mode = 'all' OR auth.uid() = ANY(COALESCE(s.allowlist, ARRAY[]::uuid[]))
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()
      AND r.role IN ('owner'::public.app_role, 'admin'::public.app_role) AND r.status = 'active'))
);
$$;
REVOKE ALL ON FUNCTION public.swap_v2_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.swap_v2_enabled() TO authenticated, service_role;