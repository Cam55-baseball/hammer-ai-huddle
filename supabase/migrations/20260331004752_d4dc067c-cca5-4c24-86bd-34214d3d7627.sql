
-- UDL Phase 1+2: 3 new tables

-- 1. Owner-editable constraint overrides (hybrid config)
CREATE TABLE public.udl_constraint_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_key text UNIQUE NOT NULL,
  threshold_overrides jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  prescription_overrides jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.udl_constraint_overrides ENABLE ROW LEVEL SECURITY;

-- Only owner can read/write overrides
CREATE POLICY "Owner can manage constraint overrides"
  ON public.udl_constraint_overrides
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- 2. Daily plans per player
CREATE TABLE public.udl_daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  constraints_detected jsonb DEFAULT '[]'::jsonb,
  prescribed_drills jsonb DEFAULT '[]'::jsonb,
  readiness_adjustments jsonb DEFAULT '{}'::jsonb,
  player_state jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plan_date)
);

ALTER TABLE public.udl_daily_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plans"
  ON public.udl_daily_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert plans"
  ON public.udl_daily_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can read all plans"
  ON public.udl_daily_plans
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- 3. Drill completions tracking
CREATE TABLE public.udl_drill_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.udl_daily_plans(id) ON DELETE CASCADE,
  drill_key text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  result_notes text
);

ALTER TABLE public.udl_drill_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own completions"
  ON public.udl_drill_completions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can read all completions"
  ON public.udl_drill_completions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));
