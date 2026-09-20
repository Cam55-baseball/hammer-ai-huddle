-- REVERT for TI-0a-1 safety hotfix (data half).
-- Restores the exact pre-hotfix catalog values captured in
-- public.wk_ti0a1_backup by the forward migration.
-- Pair with a code revert of the runtime guard: season.ts,
-- lift/substitutions.ts, wk-generate-daily/index.ts,
-- useWorkoutCatalog.ts, useBlockedLiftMovements.ts,
-- scripts/check-no-inseason-eccentric.ts (Guard 3).

UPDATE public.wk_movement_catalog c SET
  min_age_years         = (b.payload->>'min_age_years')::int,
  training_age_legality = b.payload->'training_age_legality',
  season_eligibility    = ARRAY(SELECT jsonb_array_elements_text(b.payload->'season_eligibility')),
  phase_allow           = ARRAY(SELECT jsonb_array_elements_text(b.payload->'phase_allow')),
  season_legality       = b.payload->'season_legality',
  game_day_legal        = (b.payload->>'game_day_legal')::boolean,
  equipment             = ARRAY(SELECT jsonb_array_elements_text(b.payload->'equipment')),
  is_eccentric_dominant = (b.payload->>'is_eccentric_dominant')::boolean
FROM public.wk_ti0a1_backup b
WHERE b.slug = c.slug;

-- Once the revert is confirmed:
-- DROP TABLE public.wk_ti0a1_backup;
