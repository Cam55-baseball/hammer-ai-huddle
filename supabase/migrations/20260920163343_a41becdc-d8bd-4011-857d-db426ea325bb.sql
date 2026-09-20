ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS plyo_tier smallint;

ALTER TABLE public.wk_movement_catalog
  DROP CONSTRAINT IF EXISTS wk_movement_catalog_plyo_tier_range;
ALTER TABLE public.wk_movement_catalog
  ADD CONSTRAINT wk_movement_catalog_plyo_tier_range CHECK (plyo_tier IS NULL OR plyo_tier BETWEEN 1 AND 3);

COMMENT ON COLUMN public.wk_movement_catalog.plyo_tier IS
  'Jump tier: 1 low hops, 2 jumps and bounds, 3 depth/shock work. Feeds contact budgeting.';

-- Record of TI-0a-1: minimum ages on deep-bend movements were raised (tighten-only)
-- in an earlier data step. No row is loosened here; this migration exists so the
-- age raise appears in migration history.
COMMENT ON COLUMN public.wk_movement_catalog.min_age_years IS
  'Minimum age in years. TI-0a-1 raised this on deep-bend movements; ages are tighten-only and are never lowered.';