-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests (if needed)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update scout_applications status to include 'archived'
ALTER TABLE public.scout_applications 
DROP CONSTRAINT IF EXISTS scout_applications_status_check;

ALTER TABLE public.scout_applications 
ADD CONSTRAINT scout_applications_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'archived'));

-- Function to cleanup old webhook events (90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete webhook events older than 90 days
  DELETE FROM public.processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup action
  INSERT INTO public.audit_log (user_id, action, table_name, metadata)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'automated_cleanup',
    'processed_webhook_events',
    jsonb_build_object(
      'deleted_count', deleted_count,
      'retention_days', 90,
      'cutoff_date', NOW() - INTERVAL '90 days'
    )
  );
END;
$$;

-- Function to archive old scout applications (1 year)
CREATE OR REPLACE FUNCTION public.archive_old_scout_applications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Archive approved or rejected applications older than 1 year
  UPDATE public.scout_applications
  SET status = 'archived',
      updated_at = NOW()
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND status IN ('approved', 'rejected')
    AND status != 'archived';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the archival action
  INSERT INTO public.audit_log (user_id, action, table_name, metadata)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'automated_archival',
    'scout_applications',
    jsonb_build_object(
      'archived_count', updated_count,
      'retention_years', 1,
      'cutoff_date', NOW() - INTERVAL '1 year'
    )
  );
END;
$$;

-- Manual trigger function for webhook cleanup
CREATE OR REPLACE FUNCTION public.manual_cleanup_webhooks()
RETURNS TABLE(deleted_count INTEGER, cutoff_date TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  count INTEGER;
  cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff := NOW() - INTERVAL '90 days';
  
  DELETE FROM public.processed_webhook_events
  WHERE processed_at < cutoff;
  
  GET DIAGNOSTICS count = ROW_COUNT;
  
  RETURN QUERY SELECT count, cutoff;
END;
$$;

-- Manual trigger function for scout application archival
CREATE OR REPLACE FUNCTION public.manual_archive_scout_applications()
RETURNS TABLE(archived_count INTEGER, cutoff_date TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  count INTEGER;
  cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff := NOW() - INTERVAL '1 year';
  
  UPDATE public.scout_applications
  SET status = 'archived',
      updated_at = NOW()
  WHERE created_at < cutoff
    AND status IN ('approved', 'rejected')
    AND status != 'archived';
  
  GET DIAGNOSTICS count = ROW_COUNT;
  
  RETURN QUERY SELECT count, cutoff;
END;
$$;

-- Create retention status monitoring view
CREATE OR REPLACE VIEW public.retention_status AS
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