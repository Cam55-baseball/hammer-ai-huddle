
-- SECTION 3: Drop dead fields
ALTER TABLE mpi_scores DROP COLUMN IF EXISTS mlb_season_count;
ALTER TABLE verified_stat_profiles DROP COLUMN IF EXISTS external_metrics;
ALTER TABLE verified_stat_profiles DROP COLUMN IF EXISTS last_synced_at;
ALTER TABLE verified_stat_profiles DROP COLUMN IF EXISTS sync_frequency;

-- SECTION 6: Add MPI breakdown transparency columns
ALTER TABLE mpi_scores ADD COLUMN IF NOT EXISTS tier_multiplier numeric DEFAULT 1.0;
ALTER TABLE mpi_scores ADD COLUMN IF NOT EXISTS age_curve_multiplier numeric DEFAULT 1.0;
ALTER TABLE mpi_scores ADD COLUMN IF NOT EXISTS position_weight numeric DEFAULT 1.0;

-- SECTION 2: Fix retroactive session trigger to 7-day window
CREATE OR REPLACE FUNCTION public.validate_retroactive_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_retroactive = true THEN
    IF (NEW.created_at::date - NEW.session_date) > 7 THEN
      RAISE EXCEPTION 'Retroactive sessions must have session_date within 7 days of creation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
