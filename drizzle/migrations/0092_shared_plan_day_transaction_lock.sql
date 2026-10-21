-- Named universal Swap prerequisite: serialize trusted writers for one athlete/day.
-- No rows, permissions, training rules, or existing function bodies are replaced otherwise.
CREATE OR REPLACE FUNCTION public.wk_lock_plan_day(p_user uuid, p_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $lock$
BEGIN
  IF p_user IS NULL OR p_date IS NULL THEN
    RAISE EXCEPTION 'A player and plan date are required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('wk-plan-day:' || p_user::text || ':' || p_date::text, 0));
END;
$lock$;
REVOKE ALL ON FUNCTION public.wk_lock_plan_day(uuid,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wk_lock_plan_day(uuid,date) TO service_role;
COMMENT ON FUNCTION public.wk_lock_plan_day(uuid,date) IS 'Shared transaction-held athlete/day lock for trusted plan persistence and certified Swap. Acquire before reading a prescription; an expiring build claim is not a lock. No client execution.';

DO $upgrade$
DECLARE
  signature text;
  definition text;
  marker constant text := E'BEGIN\n';
  guard constant text := E'BEGIN\n  PERFORM public.wk_lock_plan_day(p_user, p_date);\n';
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.wk_persist_prescriptions_atomic(uuid,date,jsonb,jsonb)',
    'public.wk_adjust_prescriptions_atomic(uuid,date,jsonb,text[],text,text,jsonb)'
  ] LOOP
    definition := pg_get_functiondef(signature::regprocedure);
    IF position('public.wk_lock_plan_day(p_user, p_date)' IN definition) > 0 THEN
      RAISE EXCEPTION 'Plan writer already has a lock: %', signature;
    END IF;
    IF position(marker IN definition) = 0 THEN
      RAISE EXCEPTION 'Plan writer body could not be checked: %', signature;
    END IF;
    -- Replace only the first block opening; retain all existing statements and grants.
    definition := overlay(definition placing guard from position(marker IN definition) for length(marker));
    EXECUTE definition;
  END LOOP;
END;
$upgrade$;
