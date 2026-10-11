CREATE OR REPLACE FUNCTION public.record_my_test(p_key text, p_value double precision, p_unit text, p_side text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF p_key NOT IN ('test.broad_jump_in','test.vertical_jump_in','test.sl_broad_jump_in','test.sprint_10yd_s','test.sprint_30yd_s','test.sprint_60yd_s','test.rot_mb_throw_ft','test.throw_velo_mph','test.bat_speed_mph','test.exit_velo_mph') THEN
    RAISE EXCEPTION 'unknown test'; END IF;
  IF p_value IS NULL OR p_value <= 0 OR p_value > 1000 THEN RAISE EXCEPTION 'bad value'; END IF;
  IF p_side IS NOT NULL AND p_side NOT IN ('left','right') THEN RAISE EXCEPTION 'bad side'; END IF;
  RETURN public.ledger_record(v_uid, 'self_test', p_key, p_value, p_unit, NULL, NULL, gen_random_uuid()::text,
    jsonb_build_object('side', COALESCE(p_side,'any'), 'capture', 'logged'), NULL, NULL, 'self_test_v1', now());
END $$;
REVOKE ALL ON FUNCTION public.record_my_test(text,double precision,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_my_test(text,double precision,text,text) TO authenticated;