ALTER TABLE public.owner_drills
  ADD COLUMN IF NOT EXISTS conditioning_programs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contacts integer,
  ADD COLUMN IF NOT EXISTS load_lbs numeric,
  ADD COLUMN IF NOT EXISTS carry_yards integer;
COMMENT ON COLUMN public.owner_drills.conditioning_programs IS 'Programs this conditioning drill aims at: 5tool, pitcher, golden2way. Empty = all subscribers.';

CREATE TABLE IF NOT EXISTS public.conditioning_rep_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  prescription_id uuid NOT NULL,
  rep_index integer NOT NULL CHECK (rep_index >= 0 AND rep_index < 100),
  seconds numeric(7,2) CHECK (seconds IS NULL OR (seconds > 0 AND seconds < 3600)),
  feel text CHECK (feel IS NULL OR feel IN ('fast','same','slower')),
  effort smallint CHECK (effort IS NULL OR effort BETWEEN 1 AND 10),
  pain boolean NOT NULL DEFAULT false,
  verdict text CHECK (verdict IS NULL OR verdict IN ('continue','stop_pain','stop_speed_drop','stop_slower_twice','stop_effort_high','offer_more','done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prescription_id, rep_index)
);
GRANT SELECT, INSERT, UPDATE ON public.conditioning_rep_feedback TO authenticated;
GRANT ALL ON public.conditioning_rep_feedback TO service_role;
ALTER TABLE public.conditioning_rep_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own rep feedback" ON public.conditioning_rep_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Players add own rep feedback" ON public.conditioning_rep_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Players update own rep feedback" ON public.conditioning_rep_feedback FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS conditioning_rep_feedback_user_date ON public.conditioning_rep_feedback (user_id, plan_date);