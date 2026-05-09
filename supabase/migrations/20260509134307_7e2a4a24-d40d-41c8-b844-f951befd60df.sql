-- Wave B: Trigger State Machine + Fatigue

-- 1. athlete_foundation_state — one row per user, current developmental state
CREATE TABLE IF NOT EXISTS public.athlete_foundation_state (
  user_id UUID PRIMARY KEY,
  current_state TEXT NOT NULL DEFAULT 'healthy_foundation'
    CHECK (current_state IN (
      'healthy_foundation','fragile','active_recovery','lost_feel',
      'post_recovery','chronic_decline','post_layoff_rebuild'
    )),
  prev_state TEXT,
  state_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  last_transition_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_foundation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own foundation state"
  ON public.athlete_foundation_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users upsert own foundation state"
  ON public.athlete_foundation_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own foundation state"
  ON public.athlete_foundation_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_foundation_state_state_updated
  ON public.athlete_foundation_state (current_state, updated_at DESC);

-- 2. foundation_trigger_events — history of fired triggers
CREATE TABLE IF NOT EXISTS public.foundation_trigger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger TEXT NOT NULL,
  fired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  resolved_at TIMESTAMPTZ,
  resolution_reason TEXT,
  metadata JSONB
);

ALTER TABLE public.foundation_trigger_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own trigger events"
  ON public.foundation_trigger_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own trigger events"
  ON public.foundation_trigger_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own trigger events"
  ON public.foundation_trigger_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_foundation_trigger_events_user_fired
  ON public.foundation_trigger_events (user_id, fired_at DESC);

CREATE INDEX IF NOT EXISTS idx_foundation_trigger_events_unresolved
  ON public.foundation_trigger_events (user_id, trigger)
  WHERE resolved_at IS NULL;

-- 3. updated_at trigger for state table
CREATE OR REPLACE FUNCTION public.touch_foundation_state_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_foundation_state_updated_at ON public.athlete_foundation_state;
CREATE TRIGGER trg_foundation_state_updated_at
  BEFORE UPDATE ON public.athlete_foundation_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_foundation_state_updated_at();