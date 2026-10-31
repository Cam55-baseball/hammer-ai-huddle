ALTER TABLE public.coach_prescriptions ADD COLUMN IF NOT EXISTS sender_name text;
ALTER TABLE public.coach_prescriptions ADD COLUMN IF NOT EXISTS coach_message text;
ALTER TABLE public.coach_prescriptions ADD COLUMN IF NOT EXISTS locked_fields text[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.coach_prescriptions.sender_name IS 'Server-owned sender display name captured for named workout notifications.';
COMMENT ON COLUMN public.coach_prescriptions.coach_message IS 'Coach note accompanying the canonical sent workout.';