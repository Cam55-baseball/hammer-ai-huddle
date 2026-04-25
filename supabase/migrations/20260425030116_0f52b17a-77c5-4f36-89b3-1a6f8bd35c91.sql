
-- ============================================================
-- PHASE 9 — Step 1: Consistency Snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_consistency_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  consistency_score integer NOT NULL CHECK (consistency_score BETWEEN 0 AND 100),
  logged_days integer NOT NULL DEFAULT 0,
  missed_days integer NOT NULL DEFAULT 0,
  injury_hold_days integer NOT NULL DEFAULT 0,
  performance_streak integer NOT NULL DEFAULT 0,
  discipline_streak integer NOT NULL DEFAULT 0,
  nn_miss_count_7d integer NOT NULL DEFAULT 0,
  identity_tier text NOT NULL DEFAULT 'building'
    CHECK (identity_tier IN ('building','consistent','locked_in','elite','slipping')),
  damping_multiplier numeric NOT NULL DEFAULT 1.0,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_consistency_user_date
  ON public.user_consistency_snapshots (user_id, snapshot_date DESC);

ALTER TABLE public.user_consistency_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own consistency snapshots"
  ON public.user_consistency_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service role manages consistency snapshots"
  ON public.user_consistency_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- PHASE 9 — Step 2: Non-Negotiables flag on templates
-- ============================================================
ALTER TABLE public.custom_activity_templates
  ADD COLUMN IF NOT EXISTS is_non_negotiable boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_templates_user_nn
  ON public.custom_activity_templates (user_id, is_non_negotiable)
  WHERE is_non_negotiable = true;

-- ============================================================
-- PHASE 9 — Step 4: Behavioral Events (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.behavioral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL
    CHECK (event_type IN (
      'completion','skip','delay','recovery_after_miss',
      'nn_miss','nn_streak_break','identity_tier_change',
      'consistency_drop','consistency_recover'
    )),
  event_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  template_id uuid REFERENCES public.custom_activity_templates(id) ON DELETE SET NULL,
  magnitude numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behav_events_user_created
  ON public.behavioral_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behav_events_user_type_date
  ON public.behavioral_events (user_id, event_type, event_date DESC);

ALTER TABLE public.behavioral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own behavioral events"
  ON public.behavioral_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service role manages behavioral events"
  ON public.behavioral_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- PHASE 9 — Step 5: Behavior Patterns
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_behavior_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pattern_key text NOT NULL,
  pattern_type text NOT NULL
    CHECK (pattern_type IN (
      'weekday_skip','time_of_day_drift','post_game_collapse',
      'nn_avoidance','recovery_responder','streak_fragile','streak_resilient'
    )),
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  occurrences integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, pattern_key)
);

CREATE INDEX IF NOT EXISTS idx_patterns_user_conf
  ON public.user_behavior_patterns (user_id, confidence DESC);

ALTER TABLE public.user_behavior_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own patterns"
  ON public.user_behavior_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service role manages patterns"
  ON public.user_behavior_patterns FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
