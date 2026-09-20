-- STEP 8 revert — remove shadow mode entirely.
-- After this the app is exactly as it was before Step 8: the shadow call in
-- wk-generate-daily is wrapped in try/catch and simply logs a warning, and no
-- card, prescription or engine reads any of these tables.

select cron.unschedule('tcs-shadow-nightly');
select cron.unschedule('tcs-shadow-determinism');
select cron.unschedule('tcs-shadow-weekly');

drop table if exists public.wk_shadow_weekly_reports;
drop table if exists public.tcs_shadow_checks;
drop table if exists public.wk_schedule_decisions;

-- Then delete the tcs-shadow-run function and the shadow block in
-- supabase/functions/wk-generate-daily/index.ts (search "TCS stage S3").
