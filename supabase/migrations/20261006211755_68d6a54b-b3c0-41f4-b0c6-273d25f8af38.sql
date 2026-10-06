CREATE OR REPLACE FUNCTION public.delete_child_data(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n bigint; out jsonb := '{}'::jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'uid required'; END IF;
  BEGIN PERFORM public.anon_training_remove(_uid); out := out || jsonb_build_object('anon_training_records','removed');
  EXCEPTION WHEN others THEN out := out || jsonb_build_object('anon_training_records','error: '||SQLSTATE); END;
  FOR r IN
    SELECT c.table_name t, c.column_name col
    FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
    WHERE c.table_schema='public' AND c.data_type='uuid'
      AND c.column_name IN ('user_id','athlete_id','player_id','sender_id','recipient_id','follower_id','buyer_user_id','reporter_id','reported_user_id','uploaded_by','subject_id','target_user_id','member_id','profile_id','author_id','viewer_id')
      AND c.table_name NOT IN ('profiles','parent_consents','child_data_deletions','anon_training_records')
      AND c.table_name NOT LIKE '\_snapshot%'
    ORDER BY 1,2
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.t, r.col) USING _uid;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n > 0 THEN out := out || jsonb_build_object(r.t||'.'||r.col, n); END IF;
    EXCEPTION WHEN others THEN
      out := out || jsonb_build_object(r.t||'.'||r.col, 'error: '||SQLSTATE);
    END;
  END LOOP;
  RETURN out;
END $$;
REVOKE ALL ON FUNCTION public.delete_child_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_child_data(uuid) TO service_role;