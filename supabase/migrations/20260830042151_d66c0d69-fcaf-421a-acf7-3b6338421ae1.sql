ALTER TABLE public.vault_scout_grade_positions
  ADD COLUMN IF NOT EXISTS throwing_hand text
  CHECK (throwing_hand IS NULL OR throwing_hand IN ('R','L'));

ALTER TABLE public.vault_scout_grades
  ADD COLUMN IF NOT EXISTS is_ambidextrous_thrower boolean,
  ADD COLUMN IF NOT EXISTS is_ambidextrous_pitcher boolean;

CREATE TABLE public.vault_scout_grade_pitching_sides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES public.vault_scout_grades(id) ON DELETE CASCADE,
  throwing_hand text NOT NULL CHECK (throwing_hand IN ('R','L')),
  fastball_grade smallint,
  fastball_grade_future smallint,
  offspeed_grade smallint,
  offspeed_grade_future smallint,
  breaking_ball_grade smallint,
  breaking_ball_grade_future smallint,
  rise_ball_grade smallint,
  rise_ball_grade_future smallint,
  control_grade smallint,
  control_grade_future smallint,
  pitchability_grade smallint,
  pitchability_grade_future smallint,
  delivery_arm_action_grade smallint,
  delivery_arm_action_grade_future smallint,
  deception_grade smallint,
  deception_grade_future smallint,
  defense_as_pitcher_grade smallint,
  defense_as_pitcher_grade_future smallint,
  hold_runners_grade smallint,
  hold_runners_grade_future smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade_id, throwing_hand)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_scout_grade_pitching_sides TO authenticated;
GRANT ALL ON public.vault_scout_grade_pitching_sides TO service_role;

ALTER TABLE public.vault_scout_grade_pitching_sides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pitching-side grades follow their report's visibility"
  ON public.vault_scout_grade_pitching_sides
  FOR SELECT
  USING (public.can_view_scout_grade(grade_id));

CREATE POLICY "Evaluators manage pitching-side grades on their reports"
  ON public.vault_scout_grade_pitching_sides
  FOR ALL
  USING (public.owns_scout_grade(grade_id))
  WITH CHECK (public.owns_scout_grade(grade_id));

CREATE INDEX idx_scout_pitching_sides_grade ON public.vault_scout_grade_pitching_sides(grade_id);

CREATE TRIGGER trg_scout_pitching_sides_updated_at
  BEFORE UPDATE ON public.vault_scout_grade_pitching_sides
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();