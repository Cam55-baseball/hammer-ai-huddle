-- Add streak tracking columns to sub_module_progress table
ALTER TABLE public.sub_module_progress 
ADD COLUMN IF NOT EXISTS workout_streak_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS workout_streak_longest INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_workouts_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_workout_date DATE,
ADD COLUMN IF NOT EXISTS streak_last_updated TIMESTAMP WITH TIME ZONE;