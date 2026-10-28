-- Owner-applied only. This file has NOT been executed.
-- Removes analysis uploads that were never saved to Players Club, 24 hours
-- after upload. Runs hourly; each run handles up to 100 expired uploads and
-- logs every removal (temporary_upload_cleanup_log) before deleting anything.
-- Replace YOUR_FUNCTIONS_ORIGIN with this app's Cloud functions origin
-- (the same value used in analysis-canary-cron.sql).
SELECT cron.schedule('temporary-upload-cleanup-hourly','25 * * * *',$job$
 SELECT net.http_post(
   url := 'YOUR_FUNCTIONS_ORIGIN/cleanup-temporary-uploads',
   headers := jsonb_build_object('Content-Type','application/json','x-job-token',
     (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='wk_daily_plan_job_token' LIMIT 1)),
   body := '{}'::jsonb
 );
$job$);
