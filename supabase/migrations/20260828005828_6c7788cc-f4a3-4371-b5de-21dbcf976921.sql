CREATE TABLE public.combine_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball', 'softball')),
  completed_at timestamp with time zone,
  tier_at_time text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.combine_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.combine_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event text NOT NULL,
  value numeric,
  unit text,
  source text CHECK (source IN ('video_detected', 'manual_entry')),
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  missing_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.combine_sessions TO authenticated;
GRANT ALL ON public.combine_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combine_results TO authenticated;
GRANT ALL ON public.combine_results TO service_role;

ALTER TABLE public.combine_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combine_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own combine sessions"
  ON public.combine_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Linked coaches can read athlete combine sessions"
  ON public.combine_sessions FOR SELECT
  USING (is_coach_of(auth.uid(), user_id));

CREATE POLICY "Users manage own combine results"
  ON public.combine_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Linked coaches can read athlete combine results"
  ON public.combine_results FOR SELECT
  USING (is_coach_of(auth.uid(), user_id));

CREATE INDEX idx_combine_sessions_user ON public.combine_sessions(user_id);
CREATE INDEX idx_combine_results_session ON public.combine_results(session_id);
CREATE INDEX idx_combine_results_user ON public.combine_results(user_id);

-- One combine attempt per athlete, per sport, per calendar month.
CREATE UNIQUE INDEX idx_combine_sessions_one_per_month
  ON public.combine_sessions (user_id, sport, (date_trunc('month', created_at AT TIME ZONE 'UTC')));

CREATE OR REPLACE FUNCTION public.combine_enforce_monthly_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.combine_sessions s
    WHERE s.user_id = NEW.user_id
      AND s.sport = NEW.sport
      AND s.id <> NEW.id
      AND date_trunc('month', s.created_at AT TIME ZONE 'UTC')
          = date_trunc('month', COALESCE(NEW.created_at, now()) AT TIME ZONE 'UTC')
  ) THEN
    RAISE EXCEPTION 'combine_already_taken_this_month: a % combine session already exists for this athlete in the current calendar month', NEW.sport
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER combine_sessions_monthly_eligibility
  BEFORE INSERT ON public.combine_sessions
  FOR EACH ROW EXECUTE FUNCTION public.combine_enforce_monthly_eligibility();

CREATE TRIGGER combine_sessions_touch_updated_at
  BEFORE UPDATE ON public.combine_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER combine_results_touch_updated_at
  BEFORE UPDATE ON public.combine_results
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();