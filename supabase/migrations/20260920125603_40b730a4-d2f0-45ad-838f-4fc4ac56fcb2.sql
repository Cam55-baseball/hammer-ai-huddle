REVOKE EXECUTE ON FUNCTION public.claim_tcs_chunk(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_tcs_run(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_tcs_chunk(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_tcs_run(uuid) TO service_role;