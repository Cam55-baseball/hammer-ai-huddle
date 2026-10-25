ALTER TABLE public.gp_pitches ADD COLUMN IF NOT EXISTS bunt_type text;
ALTER TABLE public.gp_pitches ADD COLUMN IF NOT EXISTS bunt_side text;
ALTER TABLE public.gp_pitches ADD COLUMN IF NOT EXISTS bunt_success boolean;
COMMENT ON COLUMN public.gp_pitches.bunt_type IS 'Explicit entered bunt type: squeeze, sac_3b, sac_1b, drag, push, hit; historical generic results are not backfilled.';
COMMENT ON COLUMN public.gp_pitches.bunt_side IS 'Actual batting side for this attempt, R or L; switch identity is not a batting side.';
COMMENT ON COLUMN public.gp_pitches.bunt_success IS 'Human-entered success observation; NULL is unknown, never an inferred failure.';
ALTER TABLE public.gp_pitches ADD CONSTRAINT gp_pitches_bunt_type_known CHECK (bunt_type IS NULL OR bunt_type IN ('squeeze','sac_3b','sac_1b','drag','push','hit')) NOT VALID;
ALTER TABLE public.gp_pitches ADD CONSTRAINT gp_pitches_bunt_side_known CHECK (bunt_side IS NULL OR bunt_side IN ('R','L')) NOT VALID;