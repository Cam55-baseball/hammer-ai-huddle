-- Add color_preferences column to profiles table for storing user color customizations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS color_preferences JSONB DEFAULT NULL;

-- Add comment to explain the column structure
COMMENT ON COLUMN public.profiles.color_preferences IS 'Stores user color preferences: { gamePlan: { pending: { background, border, icon, text }, completed: {...}, texVision: {...}, tracking: {...} }, modules: { hitting, pitching, throwing }, general: { primary, secondary } }';