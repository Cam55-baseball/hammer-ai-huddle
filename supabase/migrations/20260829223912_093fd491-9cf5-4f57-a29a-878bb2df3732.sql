DELETE FROM public.follower_report_events WHERE report_id IN (SELECT id FROM public.follower_reports WHERE report_type = 'monthly_deep');
DELETE FROM public.follower_reports WHERE report_type = 'monthly_deep';
SELECT cron.alter_job(47, schedule := '0 13 1 * *');