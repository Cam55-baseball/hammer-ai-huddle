-- Unified day state classification source
CREATE TABLE IF NOT EXISTS public.user_day_state_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rest','skip','push')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_day_state_overrides_user_date
  ON public.user_day_state_overrides (user_id, date DESC);

ALTER TABLE public.user_day_state_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own day state"
  ON public.user_day_state_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own day state"
  ON public.user_day_state_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own day state"
  ON public.user_day_state_overrides FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own day state"
  ON public.user_day_state_overrides FOR DELETE
  USING (auth.uid() = user_id);

-- Backfill from rest overrides (best-effort, ignore conflicts)
INSERT INTO public.user_day_state_overrides (user_id, date, type, created_at)
SELECT user_id, date, 'rest', created_at
FROM public.user_rest_day_overrides
ON CONFLICT (user_id, date) DO NOTHING;

-- Snapshot extensions
ALTER TABLE public.user_consistency_snapshots
  ADD COLUMN IF NOT EXISTS day_type_today TEXT,
  ADD COLUMN IF NOT EXISTS push_days_7d INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skip_days_7d INTEGER NOT NULL DEFAULT 0;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_day_state_overrides;