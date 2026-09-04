CREATE OR REPLACE FUNCTION public.save_equipment_context(
  p_scope text,
  p_equipment text[],
  p_venue text DEFAULT NULL,
  p_source text DEFAULT 'self_report',
  p_valid_until timestamptz DEFAULT NULL
)
RETURNS public.athlete_equipment_context
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.athlete_equipment_context;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_scope NOT IN ('persistent','session','temporary','inferred') THEN
    RAISE EXCEPTION 'invalid scope %', p_scope USING ERRCODE = '22023';
  END IF;

  IF p_scope IN ('persistent','session') THEN
    UPDATE public.athlete_equipment_context
       SET equipment = COALESCE(p_equipment, '{}'),
           venue = p_venue,
           source = COALESCE(p_source, 'self_report'),
           valid_until = p_valid_until
     WHERE user_id = v_uid AND scope = p_scope
    RETURNING * INTO v_row;

    IF FOUND THEN
      RETURN v_row;
    END IF;
  END IF;

  INSERT INTO public.athlete_equipment_context (user_id, scope, equipment, venue, source, valid_until)
  VALUES (v_uid, p_scope, COALESCE(p_equipment, '{}'), p_venue, COALESCE(p_source, 'self_report'), p_valid_until)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.save_equipment_context(text, text[], text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_equipment_context(text, text[], text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_equipment_context(text, text[], text, text, timestamptz) TO service_role;