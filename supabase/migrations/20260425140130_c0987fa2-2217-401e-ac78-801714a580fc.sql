-- ============================================================
-- Phase 10 — Rest Day System + Amplification
-- ============================================================

-- 1. user_rest_day_rules (one row per user)
CREATE TABLE IF NOT EXISTS public.user_rest_day_rules (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_days int[] NOT NULL DEFAULT '{}',
  max_rest_days_per_week int NOT NULL DEFAULT 2 CHECK (max_rest_days_per_week BETWEEN 0 AND 7),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_rest_day_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rest_rules_owner_select" ON public.user_rest_day_rules
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rest_rules_owner_insert" ON public.user_rest_day_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rest_rules_owner_update" ON public.user_rest_day_rules
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rest_rules_owner_delete" ON public.user_rest_day_rules
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_rest_rules_updated_at
  BEFORE UPDATE ON public.user_rest_day_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. user_rest_day_overrides
CREATE TABLE IF NOT EXISTS public.user_rest_day_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('manual_rest','auto_recurring')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_rest_day_overrides_user_date_unique UNIQUE (user_id, date),
  CONSTRAINT user_rest_day_overrides_no_system_user
    CHECK (user_id <> '00000000-0000-0000-0000-000000000001'::uuid)
);

CREATE INDEX IF NOT EXISTS idx_rest_overrides_user_date
  ON public.user_rest_day_overrides (user_id, date DESC);

ALTER TABLE public.user_rest_day_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rest_overrides_owner_select" ON public.user_rest_day_overrides
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rest_overrides_owner_insert" ON public.user_rest_day_overrides
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rest_overrides_owner_update" ON public.user_rest_day_overrides
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rest_overrides_owner_delete" ON public.user_rest_day_overrides
  FOR DELETE USING (auth.uid() = user_id);

-- 3. daily_standard_checks
CREATE TABLE IF NOT EXISTS public.daily_standard_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_date date NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  tier_at_confirm text,
  CONSTRAINT daily_standard_checks_user_date_unique UNIQUE (user_id, check_date)
);

ALTER TABLE public.daily_standard_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "standard_checks_owner_select" ON public.daily_standard_checks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "standard_checks_owner_insert" ON public.daily_standard_checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. user_consistency_snapshots additions
ALTER TABLE public.user_consistency_snapshots
  ADD COLUMN IF NOT EXISTS rest_days_7d int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rest_days_30d int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_mode_today boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier_entered_at timestamptz;

-- 5. behavioral_events additions
ALTER TABLE public.behavioral_events
  ADD COLUMN IF NOT EXISTS command_text text,
  ADD COLUMN IF NOT EXISTS action_type text,
  ADD COLUMN IF NOT EXISTS action_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 6. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_rest_day_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_rest_day_overrides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_standard_checks;