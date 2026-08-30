ALTER TABLE public.org_standards
  ADD COLUMN IF NOT EXISTS recruiting_role text NOT NULL DEFAULT 'position_player',
  ADD COLUMN IF NOT EXISTS target_positions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS position_match_logic text NOT NULL DEFAULT 'any';

ALTER TABLE public.org_standards
  DROP CONSTRAINT IF EXISTS org_standards_recruiting_role_check;
ALTER TABLE public.org_standards
  ADD CONSTRAINT org_standards_recruiting_role_check
  CHECK (recruiting_role IN ('position_player', 'pitcher', 'two_way'));

ALTER TABLE public.org_standards
  DROP CONSTRAINT IF EXISTS org_standards_position_match_logic_check;
ALTER TABLE public.org_standards
  ADD CONSTRAINT org_standards_position_match_logic_check
  CHECK (position_match_logic IN ('any', 'all'));

ALTER TABLE public.org_standard_criteria
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.org_standards.recruiting_role IS
  'Which scouting tool set this standard grades against: position_player, pitcher, or two_way.';
COMMENT ON COLUMN public.org_standards.target_positions IS
  'Positions this standard targets. Empty array means any position.';
COMMENT ON COLUMN public.org_standards.position_match_logic IS
  'any = athlete need fit one selected position; all = athlete must fit every selected position.';
COMMENT ON COLUMN public.org_standard_criteria.is_mandatory IS
  'Mandatory criteria must all pass for a match. Preferred criteria are tracked but never block a match.';