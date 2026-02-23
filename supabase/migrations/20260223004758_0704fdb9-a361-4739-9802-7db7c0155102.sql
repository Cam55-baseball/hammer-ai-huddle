
-- Add program_status to sub_module_progress
ALTER TABLE public.sub_module_progress
ADD COLUMN IF NOT EXISTS program_status text NOT NULL DEFAULT 'not_started';

-- Add program_status to speed_goals
ALTER TABLE public.speed_goals
ADD COLUMN IF NOT EXISTS program_status text NOT NULL DEFAULT 'not_started';

-- Set existing sub_module_progress rows with real progress to 'active'
UPDATE public.sub_module_progress
SET program_status = 'active'
WHERE current_week >= 1 AND week_progress IS NOT NULL AND week_progress::text != '{}';

-- Set existing speed_goals rows that have sessions to 'active'
UPDATE public.speed_goals g
SET program_status = 'active'
WHERE EXISTS (
  SELECT 1 FROM public.speed_sessions s
  WHERE s.user_id = g.user_id AND s.sport = g.sport
);
