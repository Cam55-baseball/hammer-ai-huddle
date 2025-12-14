-- Add grade_type column to distinguish hitting/throwing vs pitching grades
ALTER TABLE public.vault_scout_grades 
ADD COLUMN IF NOT EXISTS grade_type text NOT NULL DEFAULT 'hitting_throwing';

-- Add pitching-specific grade columns
ALTER TABLE public.vault_scout_grades
ADD COLUMN IF NOT EXISTS fastball_grade integer,
ADD COLUMN IF NOT EXISTS offspeed_grade integer,
ADD COLUMN IF NOT EXISTS breaking_ball_grade integer,
ADD COLUMN IF NOT EXISTS control_grade integer,
ADD COLUMN IF NOT EXISTS delivery_grade integer,
ADD COLUMN IF NOT EXISTS rise_ball_grade integer;

-- Add index for grade_type filtering
CREATE INDEX IF NOT EXISTS idx_vault_scout_grades_grade_type ON public.vault_scout_grades(user_id, grade_type);