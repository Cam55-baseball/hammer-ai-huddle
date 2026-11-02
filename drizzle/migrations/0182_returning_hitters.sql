ALTER TABLE public.owner_drills ADD COLUMN IF NOT EXISTS pitch_source text CHECK (pitch_source IS NULL OR pitch_source IN ('tee','front_toss','machine','live'));

CREATE TABLE public.returning_hitter_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball','softball')),
  started_on date NOT NULL,
  reason text NOT NULL CHECK (reason IN ('no_live','layoff','injury','under13')),
  environment text NOT NULL DEFAULT 'normal' CHECK (environment IN ('normal','low_impact')),
  effort text NOT NULL DEFAULT 'low' CHECK (effort IN ('low','medium','full')),
  bridge boolean NOT NULL DEFAULT false,
  last_change_on date NOT NULL,
  prescribed jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_on date,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.returning_hitter_programs TO authenticated;
GRANT ALL ON public.returning_hitter_programs TO service_role;
ALTER TABLE public.returning_hitter_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own hitter return" ON public.returning_hitter_programs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE UNIQUE INDEX returning_hitter_one_active ON public.returning_hitter_programs (user_id, sport) WHERE completed_on IS NULL;

CREATE TABLE public.hitting_swing_efforts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  task_id text NOT NULL,
  drill_name text,
  prescribed text CHECK (prescribed IS NULL OR prescribed IN ('low','medium','full')),
  actual text NOT NULL CHECK (actual IN ('low','medium','full')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, task_id)
);
GRANT SELECT, INSERT, UPDATE ON public.hitting_swing_efforts TO authenticated;
GRANT ALL ON public.hitting_swing_efforts TO service_role;
ALTER TABLE public.hitting_swing_efforts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own swing effort" ON public.hitting_swing_efforts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Players add own swing effort" ON public.hitting_swing_efforts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Players update own swing effort" ON public.hitting_swing_efforts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());