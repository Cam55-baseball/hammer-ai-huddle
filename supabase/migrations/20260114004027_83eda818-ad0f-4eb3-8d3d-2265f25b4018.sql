-- Add reminder_minutes column to custom_activity_templates if it doesn't exist
-- This column stores how many minutes before the display_time to send reminders
ALTER TABLE public.custom_activity_templates 
ADD COLUMN IF NOT EXISTS reminder_minutes integer DEFAULT 15;