
-- 1A. Extend drill_tag_category ENUM
ALTER TYPE public.drill_tag_category ADD VALUE IF NOT EXISTS 'error_type';
ALTER TYPE public.drill_tag_category ADD VALUE IF NOT EXISTS 'situation';

-- 1B. Add columns to drills
ALTER TABLE public.drills
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS subscription_tier_required text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 1C. Create drill_positions table
CREATE TABLE IF NOT EXISTS public.drill_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  position text NOT NULL,
  UNIQUE(drill_id, position)
);

ALTER TABLE public.drill_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read drill positions" ON public.drill_positions FOR SELECT USING (true);
CREATE POLICY "Owner manages drill positions" ON public.drill_positions FOR ALL
  USING (public.user_has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'::app_role));

-- 1D. Add weight to drill_tag_map
ALTER TABLE public.drill_tag_map ADD COLUMN IF NOT EXISTS weight int NOT NULL DEFAULT 1;

-- 1E. Add detected_issues to performance_sessions
ALTER TABLE public.performance_sessions
  ADD COLUMN IF NOT EXISTS detected_issues text[] DEFAULT '{}';

-- 1F. Create drill_usage_tracking table
CREATE TABLE IF NOT EXISTS public.drill_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drill_id uuid NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now(),
  success_rating smallint
);

ALTER TABLE public.drill_usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own drill usage" ON public.drill_usage_tracking FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drill usage" ON public.drill_usage_tracking FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
