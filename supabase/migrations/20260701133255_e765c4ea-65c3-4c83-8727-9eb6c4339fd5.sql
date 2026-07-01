
-- ============================================================
-- WIC Stage 2 — catalog backfill
-- ============================================================
UPDATE public.wk_movement_catalog SET
  movement_pattern = COALESCE(movement_pattern, pattern, 'accessory'),
  primary_adaptation = COALESCE(primary_adaptation, CASE
    WHEN category = 'compound' AND is_eccentric_dominant THEN 'max_strength'
    WHEN category = 'compound' THEN 'max_strength'
    WHEN category IN ('unilateral','unilateral_lower') THEN 'muscle_capacity'
    WHEN category = 'bat_speed' THEN 'bat_speed_development'
    WHEN category = 'speed_lab' THEN 'speed_development'
    WHEN category = 'conditioning' THEN 'conditioning_repeat_explosive'
    WHEN category = 'arm_care' THEN 'in_season_maintenance'
    WHEN category = 'cross_sport' THEN 'movement_literacy'
    WHEN category IN ('kot','functional_patterning') THEN 'movement_literacy'
    WHEN category = 'trunk' THEN 'muscle_capacity'
    WHEN category = 'carry' THEN 'muscle_capacity'
    ELSE 'muscle_capacity'
  END),
  secondary_adaptation = COALESCE(secondary_adaptation, CASE
    WHEN category = 'compound' AND is_eccentric_dominant THEN 'strength_to_power'
    WHEN category = 'compound' THEN 'in_season_maintenance'
    WHEN category = 'bat_speed' THEN 'power_transfer'
    WHEN category = 'speed_lab' THEN 'power_transfer'
    ELSE NULL
  END),
  season_eligibility = CASE
    WHEN season_eligibility IS NULL OR array_length(season_eligibility, 1) = 6 THEN
      CASE
        WHEN is_eccentric_dominant OR intensity_class = 'os_only' THEN ARRAY['os_q1','os_q2','os_q3','os_q4']::text[]
        WHEN category = 'cross_sport' THEN ARRAY['os_q1','os_q2','os_q3','os_q4','post_season']::text[]
        ELSE ARRAY['os_q1','os_q2','os_q3','os_q4','in_season','post_season']::text[]
      END
    ELSE season_eligibility
  END,
  min_age_years = COALESCE(min_age_years, GREATEST(0, FLOOR(min_training_age_years)::int + 6)),
  equipment = COALESCE(NULLIF(equipment, ARRAY[]::text[]), CASE
    WHEN category = 'compound' THEN ARRAY['barbell','rack']::text[]
    WHEN category IN ('unilateral','unilateral_lower') THEN ARRAY['dumbbell']::text[]
    WHEN category = 'bat_speed' THEN ARRAY['med_ball','bat']::text[]
    WHEN category = 'speed_lab' THEN ARRAY['open_space']::text[]
    WHEN category = 'conditioning' THEN ARRAY['field']::text[]
    WHEN category = 'arm_care' THEN ARRAY['bands']::text[]
    WHEN category = 'cross_sport' THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
  END),
  joint_stress = COALESCE(NULLIF(joint_stress, 3), CASE
    WHEN category = 'compound' AND is_eccentric_dominant THEN 5
    WHEN category = 'compound' THEN 4
    WHEN category = 'bat_speed' THEN 3
    WHEN category = 'speed_lab' THEN 4
    WHEN category = 'arm_care' THEN 1
    WHEN category = 'cross_sport' THEN 2
    ELSE 3
  END),
  recovery_cost = COALESCE(NULLIF(recovery_cost, 3), GREATEST(1, LEAST(5, cns_cost))),
  volume_cost = COALESCE(NULLIF(volume_cost, 3), CASE
    WHEN category = 'compound' THEN 4
    WHEN category IN ('unilateral','unilateral_lower') THEN 3
    WHEN category = 'arm_care' THEN 1
    ELSE 2
  END),
  bias = CASE
    WHEN bias IS NULL OR bias = 'mixed' THEN
      CASE
        WHEN is_eccentric_dominant THEN 'eccentric'
        WHEN intensity_class = 'compound' THEN 'concentric'
        WHEN category = 'arm_care' THEN 'isometric'
        ELSE 'mixed'
      END
    ELSE bias
  END,
  power_emphasis = COALESCE(power_emphasis, category IN ('bat_speed','speed_lab') OR intensity_class = 'max_effort_compound'),
  speed_emphasis = COALESCE(speed_emphasis, category = 'speed_lab'),
  elastic_emphasis = COALESCE(elastic_emphasis, category = 'bat_speed' OR pattern = 'plyo'),
  throw_compatible = COALESCE(throw_compatible, true),
  bat_compatible = COALESCE(bat_compatible, true),
  sprint_compatible = COALESCE(sprint_compatible, true),
  duplicate_group = COALESCE(duplicate_group, family, category),
  replacement_pool = COALESCE(NULLIF(replacement_pool, ARRAY[]::text[]), ARRAY[]::text[]),
  game_day_eligible = COALESCE(game_day_eligible, category IN ('cross_sport','arm_care','functional_patterning') OR pattern = 'mobility'),
  recovery_window_hours = COALESCE(NULLIF(recovery_window_hours, 48), CASE
    WHEN category = 'compound' AND is_eccentric_dominant THEN 72
    WHEN category = 'compound' THEN 48
    WHEN category = 'speed_lab' THEN 48
    WHEN category = 'bat_speed' THEN 24
    WHEN category = 'arm_care' THEN 12
    ELSE 24
  END),
  wic_metadata_complete = true;

-- ============================================================
-- WIC adaptation compatibility helper
-- Used by the validator to check that a chosen movement's
-- primary adaptation is legal for today's day-level adaptation.
-- ============================================================
CREATE OR REPLACE FUNCTION public.wic_adaptations_compatible(day_adaptation text, movement_adaptation text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN day_adaptation IS NULL OR movement_adaptation IS NULL THEN true
    WHEN day_adaptation = movement_adaptation THEN true
    WHEN day_adaptation = 'recovery_only' THEN movement_adaptation IN ('in_season_maintenance','movement_literacy')
    WHEN day_adaptation = 'game_readiness' THEN movement_adaptation IN ('speed_development','bat_speed_development','movement_literacy','in_season_maintenance')
    WHEN day_adaptation = 'muscle_capacity' THEN movement_adaptation IN ('max_strength','muscle_capacity','in_season_maintenance','speed_development','bat_speed_development','conditioning_repeat_explosive','movement_literacy')
    WHEN day_adaptation = 'max_strength' THEN movement_adaptation IN ('max_strength','muscle_capacity','strength_to_power','speed_development','bat_speed_development','movement_literacy')
    WHEN day_adaptation = 'strength_to_power' THEN movement_adaptation IN ('strength_to_power','max_strength','power_transfer','speed_development','bat_speed_development','movement_literacy')
    WHEN day_adaptation = 'power_transfer' THEN movement_adaptation IN ('power_transfer','strength_to_power','speed_development','bat_speed_development','in_season_maintenance','movement_literacy')
    WHEN day_adaptation = 'in_season_maintenance' THEN movement_adaptation IN ('in_season_maintenance','max_strength','muscle_capacity','speed_development','bat_speed_development','power_transfer','movement_literacy')
    WHEN day_adaptation = 'movement_literacy' THEN movement_adaptation IN ('movement_literacy','muscle_capacity','in_season_maintenance')
    ELSE true
  END;
$$;

GRANT EXECUTE ON FUNCTION public.wic_adaptations_compatible(text, text) TO authenticated, anon, service_role;
