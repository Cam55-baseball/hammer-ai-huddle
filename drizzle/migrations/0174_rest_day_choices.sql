CREATE TABLE public.rest_day_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rest_dow smallint NOT NULL CHECK (rest_dow BETWEEN 0 AND 6),
  scope text NOT NULL CHECK (scope IN ('week','indefinite')),
  week_start date NOT NULL,
  source text NOT NULL DEFAULT 'calendar' CHECK (source IN ('calendar','check_in')),
  created_at timestamptz NOT NULL DEFAULT now(),
  undone_at timestamptz
);
CREATE INDEX rest_day_choices_user_idx ON public.rest_day_choices (user_id, week_start);
GRANT SELECT, INSERT ON public.rest_day_choices TO authenticated;
GRANT ALL ON public.rest_day_choices TO service_role;
ALTER TABLE public.rest_day_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own rest choices" ON public.rest_day_choices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Players add own rest choices" ON public.rest_day_choices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);