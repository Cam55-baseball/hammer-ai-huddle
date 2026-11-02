DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.initial_plan_missing(uuid)'::regprocedure) INTO definition;
 IF position('WHEN ''days'' THEN' IN definition) = 0 THEN
  RAISE EXCEPTION 'Expected availability gate was not found; refusing unrelated change';
 END IF;
 definition := replace(definition, '''season'',''days'',''equipment''', '''season'',''equipment''');
 definition := regexp_replace(definition, 'WHEN ''days'' THEN[^\n]+\n', '', 'g');
 EXECUTE definition;
END $migration$;
COMMENT ON FUNCTION public.initial_plan_missing(uuid) IS 'Availability is information only. Start retains all age, consent, program, health and starting-input requirements.';