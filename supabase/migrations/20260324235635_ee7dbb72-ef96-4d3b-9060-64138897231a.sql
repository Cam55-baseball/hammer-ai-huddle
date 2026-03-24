
ALTER TABLE public.athlete_mpi_settings
  RENAME COLUMN season_start_date TO in_season_start_date;
ALTER TABLE public.athlete_mpi_settings
  RENAME COLUMN season_end_date TO in_season_end_date;
ALTER TABLE public.athlete_mpi_settings
  ADD COLUMN IF NOT EXISTS preseason_start_date date,
  ADD COLUMN IF NOT EXISTS preseason_end_date date,
  ADD COLUMN IF NOT EXISTS post_season_start_date date,
  ADD COLUMN IF NOT EXISTS post_season_end_date date;
