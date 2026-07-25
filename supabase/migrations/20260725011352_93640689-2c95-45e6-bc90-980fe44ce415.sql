CREATE OR REPLACE FUNCTION public.iq_apply_backfill(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

REVOKE ALL ON FUNCTION public.iq_apply_backfill(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.iq_apply_backfill(text) TO PUBLIC;
COMMENT ON FUNCTION public.iq_apply_backfill(text) IS 'Temporary: drop after IQ actor enrichment backfill is applied.';