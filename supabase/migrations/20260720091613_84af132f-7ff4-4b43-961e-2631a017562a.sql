
ALTER TABLE public.iq_defensive_alignments
  ADD COLUMN IF NOT EXISTS positions_vs_rhh jsonb,
  ADD COLUMN IF NOT EXISTS positions_vs_lhh jsonb,
  ADD COLUMN IF NOT EXISTS anchors_vs_rhh   jsonb,
  ADD COLUMN IF NOT EXISTS anchors_vs_lhh   jsonb;

ALTER TABLE public.iq_situations
  ADD COLUMN IF NOT EXISTS alignment_selector jsonb;
