CREATE TABLE public.foundation_replay_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id text NOT NULL,
  user_id uuid,
  video_id uuid,
  ran_at timestamptz NOT NULL DEFAULT now(),
  matched boolean NOT NULL,
  drift_reason text,
  original_score numeric,
  replay_score numeric,
  recommendation_version_then integer,
  recommendation_version_now integer,
  source text NOT NULL DEFAULT 'manual'
);

CREATE INDEX idx_fro_ran_at ON public.foundation_replay_outcomes (ran_at DESC);
CREATE INDEX idx_fro_matched_ran_at ON public.foundation_replay_outcomes (matched, ran_at DESC);
CREATE INDEX idx_fro_trace ON public.foundation_replay_outcomes (trace_id, ran_at DESC);

ALTER TABLE public.foundation_replay_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read replay outcomes"
ON public.foundation_replay_outcomes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'foundation_replay_outcomes'
      AND policyname = 'Service role manages replay outcomes'
  ) THEN
    CREATE POLICY "Service role manages replay outcomes"
    ON public.foundation_replay_outcomes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.foundation_replay_outcomes IS
  'Phase I — persists every replay outcome (manual, cron, admin) to enable rolling drift analytics and the replay_mismatch_high health alert.';
