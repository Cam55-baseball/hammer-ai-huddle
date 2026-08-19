-- Dose-unit repair: time/distance/count movements must not store their dose in default_reps.
UPDATE public.wk_movement_catalog
SET default_duration_seconds = COALESCE(default_duration_seconds, default_reps),
    default_reps = NULL
WHERE lower(coalesce(dosage_unit,'reps')) IN ('seconds','sec','second')
  AND default_reps IS NOT NULL;

UPDATE public.wk_movement_catalog
SET default_distance_feet = COALESCE(default_distance_feet, default_reps),
    default_reps = NULL
WHERE lower(coalesce(dosage_unit,'reps')) IN ('feet','ft','yards','yds')
  AND default_reps IS NOT NULL;

UPDATE public.wk_movement_catalog
SET default_total_reps = COALESCE(default_total_reps, default_reps),
    default_reps = NULL
WHERE lower(coalesce(dosage_unit,'reps')) NOT IN ('reps','rep','seconds','sec','second','feet','ft','yards','yds')
  AND default_reps IS NOT NULL;