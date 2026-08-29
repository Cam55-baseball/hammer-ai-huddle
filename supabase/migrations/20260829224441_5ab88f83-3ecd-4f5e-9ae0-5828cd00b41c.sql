ALTER TABLE public.vault_scout_grades
  ADD COLUMN IF NOT EXISTS position_evaluated text,
  ADD COLUMN IF NOT EXISTS is_switch_hitter boolean,
  ADD COLUMN IF NOT EXISTS eye_test_grade integer,
  ADD COLUMN IF NOT EXISTS eye_test_grade_future integer,
  ADD COLUMN IF NOT EXISTS hustle_grade integer,
  ADD COLUMN IF NOT EXISTS hustle_grade_future integer,
  ADD COLUMN IF NOT EXISTS game_iq_grade integer,
  ADD COLUMN IF NOT EXISTS game_iq_grade_future integer,
  ADD COLUMN IF NOT EXISTS mental_makeup_grade integer,
  ADD COLUMN IF NOT EXISTS mental_makeup_grade_future integer,
  ADD COLUMN IF NOT EXISTS plate_discipline_grade integer,
  ADD COLUMN IF NOT EXISTS plate_discipline_grade_future integer,
  ADD COLUMN IF NOT EXISTS pitchability_grade integer,
  ADD COLUMN IF NOT EXISTS pitchability_grade_future integer,
  ADD COLUMN IF NOT EXISTS delivery_arm_action_grade integer,
  ADD COLUMN IF NOT EXISTS delivery_arm_action_grade_future integer,
  ADD COLUMN IF NOT EXISTS deception_grade integer,
  ADD COLUMN IF NOT EXISTS deception_grade_future integer,
  ADD COLUMN IF NOT EXISTS body_type_frame_grade integer,
  ADD COLUMN IF NOT EXISTS body_type_frame_grade_future integer,
  ADD COLUMN IF NOT EXISTS poise_competitiveness_grade integer,
  ADD COLUMN IF NOT EXISTS poise_competitiveness_grade_future integer;

COMMENT ON COLUMN public.vault_scout_grades.position_evaluated IS
  'Position the evaluator watched on this look. defense_grade / throwing_grade on this row are grades AT this position; aggregate per-position by grouping on this column.';

CREATE INDEX IF NOT EXISTS idx_vault_scout_grades_user_position
  ON public.vault_scout_grades (user_id, position_evaluated);