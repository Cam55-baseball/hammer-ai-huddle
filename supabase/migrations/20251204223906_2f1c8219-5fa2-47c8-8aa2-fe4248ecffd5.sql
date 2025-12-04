-- Add weight_log column to track weight lifted per set per exercise
ALTER TABLE public.sub_module_progress
ADD COLUMN IF NOT EXISTS weight_log JSONB DEFAULT '{}'::jsonb;

-- Add experience_level column for adjusting % of 1RM suggestions
ALTER TABLE public.sub_module_progress
ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'intermediate';