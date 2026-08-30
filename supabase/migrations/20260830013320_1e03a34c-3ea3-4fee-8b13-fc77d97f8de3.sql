-- 1. Parent report: section flags + "saw both sides" honesty flag
ALTER TABLE public.vault_scout_grades
  ADD COLUMN IF NOT EXISTS includes_position_tools boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS includes_pitching_tools boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saw_both_batting_sides boolean;

-- Backfill flags from existing grade_type so historical reports read correctly.
UPDATE public.vault_scout_grades
   SET includes_pitching_tools = true
 WHERE grade_type = 'pitching' AND includes_pitching_tools = false;

UPDATE public.vault_scout_grades
   SET includes_position_tools = true
 WHERE (grade_type IS NULL OR grade_type <> 'pitching') AND includes_position_tools = false;

-- 2. Visibility helper: mirrors the parent report's SELECT policies exactly.
CREATE OR REPLACE FUNCTION public.can_view_scout_grade(_grade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.vault_scout_grades g
     WHERE g.id = _grade_id
       AND (
            g.evaluator_id = auth.uid()
         OR public.has_role(auth.uid(), 'owner'::app_role)
         OR (g.user_id = auth.uid()
             AND (g.grade_source IS DISTINCT FROM 'coach_evaluated' OR g.player_confirmed = true))
         OR (g.grade_source = ANY (ARRAY['coach_evaluated','cv_measured'])
             AND g.player_confirmed = true
             AND public.is_linked_coach(auth.uid(), g.user_id))
       )
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_scout_grade(_grade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_scout_grades g
     WHERE g.id = _grade_id AND g.evaluator_id = auth.uid()
  )
$$;

-- 3. Multiple position looks on one report
CREATE TABLE IF NOT EXISTS public.vault_scout_grade_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES public.vault_scout_grades(id) ON DELETE CASCADE,
  position text NOT NULL,
  defense_grade integer,
  defense_grade_future integer,
  throwing_grade integer,
  throwing_grade_future integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade_id, position)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_scout_grade_positions TO authenticated;
GRANT ALL ON public.vault_scout_grade_positions TO service_role;

ALTER TABLE public.vault_scout_grade_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Position looks follow their report's visibility"
  ON public.vault_scout_grade_positions FOR SELECT TO authenticated
  USING (public.can_view_scout_grade(grade_id));

CREATE POLICY "Evaluators manage position looks on their reports"
  ON public.vault_scout_grade_positions FOR ALL TO authenticated
  USING (public.owns_scout_grade(grade_id))
  WITH CHECK (public.owns_scout_grade(grade_id));

-- 4. Per-batting-side grades for switch hitters
CREATE TABLE IF NOT EXISTS public.vault_scout_grade_bat_sides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES public.vault_scout_grades(id) ON DELETE CASCADE,
  bat_side text NOT NULL CHECK (bat_side IN ('R','L')),
  hitting_grade integer,
  hitting_grade_future integer,
  power_grade integer,
  power_grade_future integer,
  plate_discipline_grade integer,
  plate_discipline_grade_future integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade_id, bat_side)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_scout_grade_bat_sides TO authenticated;
GRANT ALL ON public.vault_scout_grade_bat_sides TO service_role;

ALTER TABLE public.vault_scout_grade_bat_sides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Batting-side grades follow their report's visibility"
  ON public.vault_scout_grade_bat_sides FOR SELECT TO authenticated
  USING (public.can_view_scout_grade(grade_id));

CREATE POLICY "Evaluators manage batting-side grades on their reports"
  ON public.vault_scout_grade_bat_sides FOR ALL TO authenticated
  USING (public.owns_scout_grade(grade_id))
  WITH CHECK (public.owns_scout_grade(grade_id));

-- 5. updated_at triggers
CREATE TRIGGER update_vault_scout_grade_positions_updated_at
  BEFORE UPDATE ON public.vault_scout_grade_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vault_scout_grade_bat_sides_updated_at
  BEFORE UPDATE ON public.vault_scout_grade_bat_sides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_scout_grade_positions_grade ON public.vault_scout_grade_positions(grade_id);
CREATE INDEX IF NOT EXISTS idx_scout_grade_bat_sides_grade ON public.vault_scout_grade_bat_sides(grade_id);