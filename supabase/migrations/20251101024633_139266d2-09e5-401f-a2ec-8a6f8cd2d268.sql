-- Add tutorial_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN tutorial_completed BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.tutorial_completed IS 'Tracks whether user has completed the interactive tutorial walkthrough';