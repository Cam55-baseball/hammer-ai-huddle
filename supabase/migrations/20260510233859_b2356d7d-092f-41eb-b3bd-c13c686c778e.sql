ALTER TABLE public.library_videos
  ADD COLUMN IF NOT EXISTS formula_phases text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS formula_notes  text;

CREATE INDEX IF NOT EXISTS library_videos_formula_phases_gin
  ON public.library_videos USING gin (formula_phases);

COMMENT ON COLUMN public.library_videos.formula_phases IS
  'Per-domain teaching phases this video targets (e.g. p1_hip_load, p4_hitters_move). Empty array = unassigned.';
COMMENT ON COLUMN public.library_videos.formula_notes IS
  'Owner free-form notes describing how the video maps to the universal Cause→Effect formula.';