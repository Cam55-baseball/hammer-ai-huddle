ALTER TABLE public.pitcher_schedule_settings
  ADD COLUMN IF NOT EXISTS primary_focus text,
  ADD COLUMN IF NOT EXISTS pitching_role text,
  ADD COLUMN IF NOT EXISTS limit_pitching boolean NOT NULL DEFAULT false;
ALTER TABLE public.pitcher_schedule_settings
  ADD CONSTRAINT pss_primary_focus CHECK (primary_focus IS NULL OR primary_focus IN ('pitcher','position')),
  ADD CONSTRAINT pss_pitching_role CHECK (pitching_role IS NULL OR pitching_role IN ('starter','bullpen','closer'));