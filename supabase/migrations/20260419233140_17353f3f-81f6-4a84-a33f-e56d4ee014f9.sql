-- Drop the old unique constraint that limited one log per template per day
ALTER TABLE public.custom_activity_logs
  DROP CONSTRAINT IF EXISTS custom_activity_logs_user_id_template_id_entry_date_key;

-- Add instance_index column to differentiate multiple Quick Adds on the same day
ALTER TABLE public.custom_activity_logs
  ADD COLUMN IF NOT EXISTS instance_index INTEGER NOT NULL DEFAULT 0;

-- New unique constraint that includes instance_index
ALTER TABLE public.custom_activity_logs
  ADD CONSTRAINT custom_activity_logs_user_template_date_instance_key
  UNIQUE (user_id, template_id, entry_date, instance_index);

-- Helpful index for MAX(instance_index) lookups
CREATE INDEX IF NOT EXISTS idx_custom_activity_logs_user_template_date
  ON public.custom_activity_logs (user_id, template_id, entry_date);