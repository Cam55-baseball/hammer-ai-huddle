REVOKE EXECUTE ON FUNCTION public.resolve_recruiting_scope(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_recruiting_scope(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_guardian_consent() FROM PUBLIC, anon, authenticated;