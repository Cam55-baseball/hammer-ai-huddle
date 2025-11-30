-- Add exit velocity and distance tracking columns to user_workout_progress
ALTER TABLE public.user_workout_progress
ADD COLUMN exit_velocity NUMERIC(5,1),
ADD COLUMN exit_velocity_previous NUMERIC(5,1),
ADD COLUMN exit_velocity_last_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN distance NUMERIC(5,1),
ADD COLUMN distance_previous NUMERIC(5,1),
ADD COLUMN distance_last_updated TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.user_workout_progress.exit_velocity IS 'Current exit velocity in mph';
COMMENT ON COLUMN public.user_workout_progress.exit_velocity_previous IS 'Previous exit velocity for comparison';
COMMENT ON COLUMN public.user_workout_progress.exit_velocity_last_updated IS 'When exit velocity was last updated (controls 2-month update restriction)';
COMMENT ON COLUMN public.user_workout_progress.distance IS 'Current distance in feet';
COMMENT ON COLUMN public.user_workout_progress.distance_previous IS 'Previous distance for comparison';
COMMENT ON COLUMN public.user_workout_progress.distance_last_updated IS 'When distance was last updated (controls 2-month update restriction)';