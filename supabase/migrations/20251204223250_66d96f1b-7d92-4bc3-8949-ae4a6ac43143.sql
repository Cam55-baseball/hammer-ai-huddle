-- Add exercise_progress column to sub_module_progress table
ALTER TABLE public.sub_module_progress 
ADD COLUMN IF NOT EXISTS exercise_progress JSONB DEFAULT '{}'::jsonb;