-- Add quizzes_passed column to user_injury_progress table
ALTER TABLE public.user_injury_progress 
ADD COLUMN IF NOT EXISTS quizzes_passed TEXT[] DEFAULT ARRAY[]::TEXT[];