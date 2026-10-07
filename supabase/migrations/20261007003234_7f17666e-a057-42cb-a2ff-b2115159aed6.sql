-- Round 7 (owner-authorized, performance only): the plan save sends blocks that
-- are identical on every card (e.g. why_v2.why_substitution_path ~26 KB per card)
-- once, and this wrapper copies them back onto every card before calling the
-- unchanged save. The stored plan is byte-for-byte the same jsonb.
CREATE OR REPLACE FUNCTION public.wk_persist_prescriptions_shared(
  p_user uuid, p_date date, p_rows jsonb, p_diag jsonb, p_shared jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rows jsonb;
  s_why jsonb := COALESCE(p_shared->'why_payload', '{}'::jsonb);
  s_why2 jsonb := COALESCE(p_shared->'why_v2', '{}'::jsonb);
  s_vr jsonb := p_shared->'validator_report';
BEGIN
  IF jsonb_typeof(p_rows) = 'array' AND jsonb_array_length(p_rows) > 0 THEN
    SELECT jsonb_agg(
      r
      || CASE WHEN s_why <> '{}'::jsonb THEN jsonb_build_object('why_payload', COALESCE(r->'why_payload','{}'::jsonb) || s_why) ELSE '{}'::jsonb END
      || CASE WHEN s_why2 <> '{}'::jsonb THEN jsonb_build_object('why_v2', COALESCE(r->'why_v2','{}'::jsonb) || s_why2) ELSE '{}'::jsonb END
      || CASE WHEN s_vr IS NOT NULL THEN jsonb_build_object('validator_report', s_vr) ELSE '{}'::jsonb END
      ORDER BY ord)
    INTO v_rows
    FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS t(r, ord);
  ELSE
    v_rows := p_rows;
  END IF;
  RETURN public.wk_persist_prescriptions_atomic(p_user, p_date, v_rows, p_diag);
END;
$$;
REVOKE ALL ON FUNCTION public.wk_persist_prescriptions_shared(uuid, date, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wk_persist_prescriptions_shared(uuid, date, jsonb, jsonb, jsonb) TO service_role;