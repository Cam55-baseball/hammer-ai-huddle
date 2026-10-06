CREATE OR REPLACE FUNCTION public.is_my_account_paused()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT account_paused_at IS NOT NULL FROM public.profiles WHERE id = auth.uid()), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_my_account_paused() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_account_paused() TO authenticated, service_role;

DROP POLICY IF EXISTS "Paused accounts cannot upload" ON storage.objects;
CREATE POLICY "Paused accounts cannot upload" ON storage.objects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_my_account_paused());

REVOKE EXECUTE ON FUNCTION public.is_account_paused(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_paused(uuid) TO service_role;