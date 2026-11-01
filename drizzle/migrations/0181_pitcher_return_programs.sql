CREATE TABLE public.pitcher_return_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball','softball')),
  started_on date NOT NULL,
  days_off integer,
  long_layoff boolean NOT NULL DEFAULT false,
  step text NOT NULL DEFAULT 'flat' CHECK (step IN ('flat','shortbox','bullpen','done')),
  step_started_on date NOT NULL,
  prescribed_dates date[] NOT NULL DEFAULT '{}',
  first_bullpen_on date,
  completed_on date,
  source text NOT NULL CHECK (source IN ('history','answer')),
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pitcher_return_programs TO authenticated;
GRANT ALL ON public.pitcher_return_programs TO service_role;
ALTER TABLE public.pitcher_return_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own pitcher return" ON public.pitcher_return_programs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE UNIQUE INDEX pitcher_return_one_active ON public.pitcher_return_programs (user_id, sport) WHERE completed_on IS NULL;
CREATE INDEX pitcher_return_user_sport ON public.pitcher_return_programs (user_id, sport, started_on DESC);