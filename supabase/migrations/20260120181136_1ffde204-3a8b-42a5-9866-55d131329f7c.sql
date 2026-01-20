-- Add applying_as column to scout_applications table for role selection
ALTER TABLE public.scout_applications 
ADD COLUMN IF NOT EXISTS applying_as TEXT DEFAULT 'scout' 
CHECK (applying_as IN ('scout', 'coach'));