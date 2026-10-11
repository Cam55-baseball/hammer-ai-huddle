-- Renewal reminders: daily 14:00 UTC. OWNER APPLIES. Replace the placeholder privately.
-- Check first: select * from cron.job where jobname = 'renewal-reminders-daily';
select cron.schedule('renewal-reminders-daily', '0 14 * * *', $$
  select net.http_post(
    url := '<LOVABLE_CLOUD_FUNCTIONS_BASE_URL>/renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-job-token', (select decrypted_secret from vault.decrypted_secrets
                     where name = 'wk_daily_plan_job_token')
    ),
    body := '{"mode":"renewal","dry_run":false}'::jsonb
  );
$$);
