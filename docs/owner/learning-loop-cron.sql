-- OWNER APPLIES ONLY. This file has not been run. No existing schedule is changed.
-- Target: intel-recheck-job; nightly at 04:30 UTC; body {"mode":"recheck"}.
-- Requires the deployed callback and the existing wk_daily_plan_job_token in Vault.
-- Derive the backend URL from the existing plan schedule rather than printing an internal URL.
DO $owner_apply$
DECLARE plan_url text; callback_url text; command_sql text;
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'intelligence-learning-loop-nightly') THEN
    RAISE EXCEPTION 'intelligence-learning-loop-nightly already exists; no schedule was changed.';
  END IF;
  SELECT substring(command FROM 'https://[^''[:space:]]+/functions/v1/wk-daily-plan-job')
    INTO plan_url FROM cron.job WHERE jobname = 'wk-daily-plan-build';
  IF plan_url IS NULL THEN RAISE EXCEPTION 'Existing plan job URL not found; nothing was scheduled.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'wk_daily_plan_job_token') THEN
    RAISE EXCEPTION 'Existing plan job token not found; nothing was scheduled.';
  END IF;
  callback_url := regexp_replace(plan_url, 'wk-daily-plan-job$', 'intel-recheck-job');
  command_sql := format($callback$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-job-token',
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='wk_daily_plan_job_token')),
      body := '{"mode":"recheck"}'::jsonb,
      timeout_milliseconds := 120000
    );
  $callback$, callback_url);
  PERFORM cron.schedule('intelligence-learning-loop-nightly', '30 4 * * *', command_sql);
END $owner_apply$;
-- Check afterward (never print command; it may contain private scheduling details):
-- SELECT jobname,schedule,active FROM cron.job WHERE jobname='intelligence-learning-loop-nightly';