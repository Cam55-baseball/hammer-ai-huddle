
ALTER TABLE public.wk_movement_catalog
  ADD CONSTRAINT wk_movement_catalog_movement_category_canonical
  CHECK (
    movement_category IS NULL OR movement_category IN (
      'compound_lower','compound_upper_push','compound_upper_pull','single_leg',
      'rotation','anti_rotation','carry','core','arm_care','mobility',
      'jump_landing','posterior_chain','hip','shoulder','foot_ankle'
    )
  );

ALTER TABLE public.wk_movement_catalog
  ADD CONSTRAINT wk_movement_catalog_speed_category_canonical
  CHECK (
    speed_category IS NULL OR speed_category IN (
      'acceleration','top_speed','elastic','overspeed','resisted','reactive',
      'deceleration','change_of_direction','plyometric','pap','mobility'
    )
  );

ALTER TABLE public.wk_movement_catalog
  ADD CONSTRAINT wk_movement_catalog_bat_speed_category_canonical
  CHECK (
    bat_speed_category IS NULL OR bat_speed_category IN (
      'overload','underload','elastic_rotation','rotational_strength','pap',
      'med_ball','band','pvc','heavy_implement','light_implement','recovery_swing'
    )
  );

ALTER TABLE public.wk_movement_catalog
  ADD CONSTRAINT wk_movement_catalog_conditioning_category_canonical
  CHECK (
    conditioning_category IS NULL OR conditioning_category IN (
      'aerobic_base','aerobic_power','repeated_sprint','alactic_power',
      'lactic_capacity','recovery_flush','tissue_prep','pitcher_specific'
    )
  );

ALTER TABLE public.wk_movement_catalog
  ADD CONSTRAINT wk_movement_catalog_cross_sport_category_canonical
  CHECK (
    cross_sport_category IS NULL OR cross_sport_category IN (
      'fascial_rotation','footwork','explosive_transfer','recovery_transfer',
      'balance_transfer','visual_reaction','reflex','coordination',
      'rotational_power','low_impact'
    )
  );
