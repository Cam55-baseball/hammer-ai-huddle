REVOKE EXECUTE ON FUNCTION public.is_training_intel_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_training_intel_owner(uuid) TO authenticated, service_role;