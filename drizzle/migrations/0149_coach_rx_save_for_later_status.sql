DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.coach_rx_commit_choice(uuid,uuid,date,text,jsonb,text[],jsonb,timestamptz)'::regprocedure) INTO definition;
 IF position('WHEN ''add_alongside'' THEN ''added_alongside'' ELSE p_choice END' in definition)=0 THEN
  RAISE EXCEPTION 'Expected canonical choice mapping not found; no change applied';
 END IF;
 definition:=replace(definition, 'WHEN ''add_alongside'' THEN ''added_alongside'' ELSE p_choice END', 'WHEN ''add_alongside'' THEN ''added_alongside'' WHEN ''save_for_later'' THEN ''saved_for_later'' ELSE p_choice END');
 EXECUTE definition;
END $migration$;