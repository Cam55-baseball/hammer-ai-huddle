ALTER TABLE public.wk_prescriptions
  ADD COLUMN IF NOT EXISTS intent_tag text,
  ADD COLUMN IF NOT EXISTS execution_note text,
  ADD COLUMN IF NOT EXISTS per_side boolean,
  ADD COLUMN IF NOT EXISTS asymmetry_rule text,
  ADD COLUMN IF NOT EXISTS open_ended boolean,
  ADD COLUMN IF NOT EXISTS set_range_max integer,
  ADD COLUMN IF NOT EXISTS density_target_seconds integer,
  ADD COLUMN IF NOT EXISTS rir_low integer,
  ADD COLUMN IF NOT EXISTS rir_high integer,
  ADD COLUMN IF NOT EXISTS cue_ids text[],
  ADD COLUMN IF NOT EXISTS troubleshoot_video_id uuid,
  ADD COLUMN IF NOT EXISTS intensity_mode text;

COMMENT ON COLUMN public.wk_prescriptions.open_ended IS 'Display only: renders the doctrine reps as "10+". Never changes the stored dose.';
COMMENT ON COLUMN public.wk_prescriptions.set_range_max IS 'Display only: renders "N-M sets" with the doctrine sets as the minimum. Supplemental / warmup / recovery slots only.';
COMMENT ON COLUMN public.wk_prescriptions.density_target_seconds IS 'Display only: time-cap target. Supplemental / warmup / recovery slots only. Banned in-season.';
COMMENT ON COLUMN public.wk_prescriptions.intensity_mode IS 'extensive | intensive. Extensive med-ball work ships as dosage_unit total_reps.';