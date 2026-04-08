
-- 1A. Add progression_level to drills (1=Tee Ball, 2=Youth, 3=Middle School, 4=High School, 5=College, 6=Pro, 7=Elite)
ALTER TABLE public.drills
  ADD COLUMN progression_level int NOT NULL DEFAULT 4;

-- Use a validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_drill_progression_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.progression_level < 1 OR NEW.progression_level > 7 THEN
    RAISE EXCEPTION 'progression_level must be between 1 and 7';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_drill_progression_level_trigger
  BEFORE INSERT OR UPDATE ON public.drills
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_drill_progression_level();

-- 1B. Add sport_modifier to drills
ALTER TABLE public.drills
  ADD COLUMN sport_modifier numeric NOT NULL DEFAULT 1.0;

-- 1C. Add version to drills
ALTER TABLE public.drills
  ADD COLUMN version int NOT NULL DEFAULT 1;

-- 1D. Create pending_drills table (AI review queue)
CREATE TABLE public.pending_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  sport text NOT NULL DEFAULT 'baseball',
  positions text[] DEFAULT '{}',
  progression_level int NOT NULL DEFAULT 4,
  tags jsonb NOT NULL DEFAULT '{}',
  ai_context text,
  module text NOT NULL DEFAULT 'fielding',
  skill_target text,
  source text NOT NULL DEFAULT 'ai',
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pending_drills ENABLE ROW LEVEL SECURITY;

-- Only admins can manage pending drills
CREATE POLICY "Admins can view pending drills"
  ON public.pending_drills FOR SELECT
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pending drills"
  ON public.pending_drills FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pending drills"
  ON public.pending_drills FOR UPDATE
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pending drills"
  ON public.pending_drills FOR DELETE
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

-- 1E. Add performance_improved to drill_usage_tracking
ALTER TABLE public.drill_usage_tracking
  ADD COLUMN performance_improved boolean;

-- Index for progression-level filtering
CREATE INDEX idx_drills_progression_level ON public.drills(progression_level);
CREATE INDEX idx_pending_drills_status ON public.pending_drills(status);
