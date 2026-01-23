-- Add soft delete columns to custom_activity_templates
ALTER TABLE public.custom_activity_templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_permanently_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient filtering of deleted items
CREATE INDEX IF NOT EXISTS idx_custom_activity_templates_deleted_at 
ON public.custom_activity_templates(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_custom_activity_templates_permanently_at 
ON public.custom_activity_templates(deleted_permanently_at) 
WHERE deleted_permanently_at IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.custom_activity_templates.deleted_at IS 'Timestamp when soft-deleted. NULL means active.';
COMMENT ON COLUMN public.custom_activity_templates.deleted_permanently_at IS 'Scheduled permanent deletion date (deleted_at + 30 days).';

-- Function to permanently delete expired templates
CREATE OR REPLACE FUNCTION public.cleanup_deleted_activity_templates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete templates where 30-day grace period has expired
  DELETE FROM public.custom_activity_templates
  WHERE deleted_at IS NOT NULL
    AND deleted_permanently_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup if any records were deleted
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'automated_cleanup',
      'custom_activity_templates',
      jsonb_build_object(
        'deleted_count', deleted_count,
        'retention_days', 30,
        'cutoff_date', NOW()
      )
    );
  END IF;
END;
$$;