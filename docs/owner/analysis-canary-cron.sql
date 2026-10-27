-- Owner-applied only. This file has NOT been executed.
-- First register one owner-owned TEST clip + extracted request fixture using
-- analysis-canary-configure. One check per day; no user JWT stored.
-- Replace YOUR_FUNCTIONS_ORIGIN with this app's Cloud functions origin.
SELECT cron.schedule('analysis-canary-daily','10 0 * * *',$job$
 SELECT net.http_post(
   url := 'YOUR_FUNCTIONS_ORIGIN/analysis-canary',
   headers := jsonb_build_object('Content-Type','application/json','x-job-token',
     (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='wk_daily_plan_job_token' LIMIT 1)),
   body := '{}'::jsonb
 );
$job$);