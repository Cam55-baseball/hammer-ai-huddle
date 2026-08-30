ALTER TABLE public.vault_scout_grades
  ADD COLUMN IF NOT EXISTS defense_as_pitcher_grade integer,
  ADD COLUMN IF NOT EXISTS defense_as_pitcher_grade_future integer,
  ADD COLUMN IF NOT EXISTS hold_runners_grade integer,
  ADD COLUMN IF NOT EXISTS hold_runners_grade_future integer;

COMMENT ON COLUMN public.vault_scout_grades.defense_as_pitcher_grade IS 'Pitcher fielding their own position: comebackers, covering first, backing up the correct base on every play. 20-80 scale.';
COMMENT ON COLUMN public.vault_scout_grades.hold_runners_grade IS 'Baseball only. Keeping leads short, varied looks/times, not giving away good jumps on steal breaks. 20-80 scale.';