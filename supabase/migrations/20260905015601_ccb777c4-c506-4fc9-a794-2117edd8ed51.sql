-- 1. Keep drill position tags upper-case forever
CREATE OR REPLACE FUNCTION public.normalize_drill_position()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.position := upper(btrim(NEW.position));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_drill_position ON public.drill_positions;
CREATE TRIGGER trg_normalize_drill_position
BEFORE INSERT OR UPDATE ON public.drill_positions
FOR EACH ROW EXECUTE FUNCTION public.normalize_drill_position();

ALTER TABLE public.drill_positions
  DROP CONSTRAINT IF EXISTS drill_positions_position_upper_ck;
ALTER TABLE public.drill_positions
  ADD CONSTRAINT drill_positions_position_upper_ck
  CHECK (position = upper(position));

-- 2. Ordered position list on the profile (existing single value becomes primary)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS positions text[] NOT NULL DEFAULT '{}';

UPDATE public.profiles
   SET positions = ARRAY[upper(btrim(position))]
 WHERE cardinality(positions) = 0
   AND position IS NOT NULL
   AND btrim(position) <> '';

-- 3. Plan adjustments ledger
CREATE TABLE IF NOT EXISTS public.athlete_plan_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  modality text NOT NULL,
  action text NOT NULL CHECK (action IN ('unavailable','swap','position_worked')),
  scope text NOT NULL DEFAULT 'today' CHECK (scope IN ('today','always')),
  original_key text,
  original_name text,
  replacement_name text,
  replacement_dosage text,
  reason text,
  position_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_plan_adjustments TO authenticated;
GRANT ALL ON public.athlete_plan_adjustments TO service_role;

ALTER TABLE public.athlete_plan_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage their own plan adjustments"
ON public.athlete_plan_adjustments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plan_adjustments_user_date
  ON public.athlete_plan_adjustments (user_id, plan_date DESC);
CREATE INDEX IF NOT EXISTS idx_plan_adjustments_always
  ON public.athlete_plan_adjustments (user_id, scope) WHERE scope = 'always';

CREATE TRIGGER trg_plan_adjustments_updated_at
BEFORE UPDATE ON public.athlete_plan_adjustments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();