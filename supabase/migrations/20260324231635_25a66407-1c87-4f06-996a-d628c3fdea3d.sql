ALTER TABLE public.athlete_mpi_settings
  ADD COLUMN IF NOT EXISTS season_status text NOT NULL DEFAULT 'in_season',
  ADD COLUMN IF NOT EXISTS season_start_date date,
  ADD COLUMN IF NOT EXISTS season_end_date date;