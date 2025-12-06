-- Add current_cycle and day_completion_times columns to sub_module_progress
ALTER TABLE public.sub_module_progress
ADD COLUMN IF NOT EXISTS current_cycle INTEGER DEFAULT 1;

ALTER TABLE public.sub_module_progress
ADD COLUMN IF NOT EXISTS day_completion_times JSONB DEFAULT '{}'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.sub_module_progress.current_cycle IS 'Current training cycle (1-4), auto-advances after completing all 6 weeks';
COMMENT ON COLUMN public.sub_module_progress.day_completion_times IS 'Timestamps of day completions, used for 24-hour unlock logic. Structure: {"week1": {"day1": "ISO_TIMESTAMP", ...}, ...}';