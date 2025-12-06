-- Add last_checkin_at column to track 12-hour cooldown
ALTER TABLE mind_fuel_challenges 
ADD COLUMN last_checkin_at TIMESTAMPTZ;