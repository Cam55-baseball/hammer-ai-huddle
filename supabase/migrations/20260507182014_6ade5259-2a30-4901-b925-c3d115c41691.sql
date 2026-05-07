ALTER TABLE public.hie_snapshots
ADD COLUMN IF NOT EXISTS season_phase text,
ADD COLUMN IF NOT EXISTS season_phase_source text,
ADD COLUMN IF NOT EXISTS season_phase_label text;