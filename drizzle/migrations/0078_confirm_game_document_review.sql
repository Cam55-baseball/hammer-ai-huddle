CREATE OR REPLACE FUNCTION public.confirm_game_document(_document_id uuid, _selection jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE d public.gp_documents%ROWTYPE; k text; idx jsonb; item jsonb; n int; added int := 0; ids jsonb := '[]'; new_id uuid; result_code text; raw_result text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.gp_documents WHERE id=_document_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.gp_games WHERE id=d.game_id AND user_id=auth.uid() AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Document not available' USING ERRCODE='42501'; END IF;
 IF d.parse_status='applied' THEN RETURN jsonb_build_object('already_applied',true,'added',coalesce((d.parsed_events->>'added')::int,0)); END IF;
 IF d.parse_status<>'ready' OR d.parsed_events->>'review_status' IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'Document is not ready to review'; END IF;
 IF jsonb_typeof(_selection) IS DISTINCT FROM 'object' OR EXISTS (SELECT 1 FROM jsonb_object_keys(_selection) x WHERE x NOT IN ('at_bats','pitches','defense','baserun')) THEN RAISE EXCEPTION 'Invalid selection'; END IF;
 FOREACH k IN ARRAY ARRAY['at_bats','pitches','defense','baserun'] LOOP
  IF _selection ? k AND jsonb_typeof(_selection->k)<>'array' THEN RAISE EXCEPTION 'Invalid selection'; END IF;
  IF jsonb_array_length(coalesce(_selection->k,'[]'))>500 THEN RAISE EXCEPTION 'Too many entries'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(_selection->k,'[]')) x GROUP BY x HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate selection'; END IF;
  FOR idx IN SELECT value FROM jsonb_array_elements(coalesce(_selection->k,'[]')) LOOP
   IF jsonb_typeof(idx)<>'number' OR idx::text !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Invalid entry number'; END IF;
   n := idx::text::int; item := d.parsed_events->'raw'->k->n;
   IF item IS NULL OR jsonb_typeof(item)<>'object' OR jsonb_typeof(item->'inning') IS DISTINCT FROM 'number' OR item->>'inning' !~ '^[0-9]+$' OR (item->>'inning')::int NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Missing inning'; END IF;
   IF k='at_bats' THEN
    raw_result := item->>'result';
    result_code := CASE regexp_replace(lower(trim(raw_result)),'[^a-z0-9]','','g')
     WHEN '1b' THEN '1B' WHEN 'single' THEN '1B' WHEN '2b' THEN '2B' WHEN 'double' THEN '2B' WHEN '3b' THEN '3B' WHEN 'triple' THEN '3B' WHEN 'hr' THEN 'HR' WHEN 'homerun' THEN 'HR' WHEN 'bb' THEN 'BB' WHEN 'walk' THEN 'BB' WHEN 'hbp' THEN 'HBP' WHEN 'hitbypitch' THEN 'HBP'
     WHEN 'kswinging' THEN 'K_swinging' WHEN 'strikeoutswinging' THEN 'K_swinging' WHEN 'klooking' THEN 'K_looking' WHEN 'strikeoutlooking' THEN 'K_looking' WHEN 'fo' THEN 'FO' WHEN 'flyout' THEN 'FO' WHEN 'go' THEN 'GO' WHEN 'groundout' THEN 'GO' WHEN 'lo' THEN 'LO' WHEN 'lineout' THEN 'LO' WHEN 'po' THEN 'PO' WHEN 'popout' THEN 'PO' WHEN 'fc' THEN 'FC' WHEN 'fielderschoice' THEN 'FC' WHEN 'sac' THEN 'SAC' WHEN 'sacrificebunt' THEN 'SAC' WHEN 'sf' THEN 'SF' WHEN 'sacrificefly' THEN 'SF' WHEN 'e' THEN 'E' WHEN 'error' THEN 'E' WHEN 'roe' THEN 'ROE' WHEN 'reachedonerror' THEN 'ROE' ELSE NULL END;
    INSERT INTO public.gp_at_bats(user_id,game_id,inning,ab_order,result,rbi,exit_velo,launch_angle,batting_side,notes,entry_source)
    VALUES(auth.uid(),d.game_id,(item->>'inning')::int,(item->>'pa_no')::int,result_code,(item->>'rbi')::int,(item->>'exit_velo_mph')::numeric,(item->>'launch_angle_deg')::numeric,item->>'batter_handedness',concat_ws(E'\n',nullif(item->>'notes',''),CASE WHEN raw_result IS NOT NULL AND result_code IS NULL THEN 'Unmapped imported result: '||raw_result END),'imported') RETURNING id INTO new_id;
   ELSIF k='pitches' THEN
    IF item->>'perspective' IS NULL OR item->>'perspective' NOT IN ('pitcher','hitter') THEN RAISE EXCEPTION 'Missing pitch perspective'; END IF;
    INSERT INTO public.gp_pitches(user_id,game_id,inning,perspective,pitch_no,pitch_type,pitch_velo,location,result,entry_source)
    VALUES(auth.uid(),d.game_id,(item->>'inning')::int,item->>'perspective',(item->>'pitch_no')::int,item->>'pitch_type',(item->>'pitch_velo')::numeric,CASE WHEN item->>'zone' IS NOT NULL THEN jsonb_build_object('zone',(item->>'zone')::int) ELSE NULL END,item->>'result','imported') RETURNING id INTO new_id;
   ELSIF k='defense' THEN
    IF nullif(trim(item->>'position'),'') IS NULL THEN RAISE EXCEPTION 'Missing position'; END IF;
    INSERT INTO public.gp_defense_plays(user_id,game_id,inning,position,play_type,result,notes,error_flag,assist,putout,entry_source)
    VALUES(auth.uid(),d.game_id,(item->>'inning')::int,item->>'position',item->>'play_type',item->>'result',item->>'notes',NULL,NULL,NULL,'imported') RETURNING id INTO new_id;
   ELSE
    IF item->>'event_type' IS NULL OR item->>'event_type' NOT IN ('steal','dirtball_read','pickoff','advance','caught','tag_up') THEN RAISE EXCEPTION 'Missing baserunning event type'; END IF;
    INSERT INTO public.gp_baserun_events(user_id,game_id,inning,event_type,base_from,base_to,success,notes,entry_source)
    VALUES(auth.uid(),d.game_id,(item->>'inning')::int,item->>'event_type',(item->>'from_base')::int,(item->>'to_base')::int,CASE WHEN item->>'result'='success' THEN true WHEN item->>'result'='failed' THEN false ELSE NULL END,item->>'notes','imported') RETURNING id INTO new_id;
   END IF;
   added:=added+1; ids:=ids||jsonb_build_array(jsonb_build_object('kind',k,'index',n,'id',new_id));
  END LOOP;
 END LOOP;
 IF added=0 THEN RAISE EXCEPTION 'Select at least one entry'; END IF;
 UPDATE public.gp_documents SET parse_status='applied',parsed_events=parsed_events||jsonb_build_object('review_status','confirmed','selection',_selection,'added',added,'event_ids',ids,'confirmed_at',now(),'confirmed_by',auth.uid()) WHERE id=d.id;
 RETURN jsonb_build_object('already_applied',false,'added',added);
END $$;
REVOKE ALL ON FUNCTION public.confirm_game_document(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_game_document(uuid,jsonb) TO authenticated;
COMMENT ON FUNCTION public.confirm_game_document(uuid,jsonb) IS 'Owned document review: explicitly selected saved draft rows only, atomic insert and applied stamp; retries never duplicate entries. Uses caller RLS.';