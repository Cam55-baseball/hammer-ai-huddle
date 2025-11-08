-- Fix security definer view by recreating with security_invoker
DROP VIEW IF EXISTS public.retention_status;

CREATE VIEW public.retention_status
WITH (security_invoker=on)
AS
SELECT 
  'processed_webhook_events' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN processed_at < NOW() - INTERVAL '90 days' THEN 1 END) as records_to_clean,
  MIN(processed_at) as oldest_record,
  MAX(processed_at) as newest_record
FROM public.processed_webhook_events
UNION ALL
SELECT 
  'scout_applications' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN created_at < NOW() - INTERVAL '1 year' AND status IN ('approved', 'rejected') THEN 1 END) as records_to_archive,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM public.scout_applications;