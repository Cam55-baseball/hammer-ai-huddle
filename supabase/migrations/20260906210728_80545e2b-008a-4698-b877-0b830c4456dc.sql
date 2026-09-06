CREATE TABLE public.wk_fault_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('complaint','report_card','video_analysis','standards_gap','grade_low','log_trend','daily_checkin','coach_note','game_hub')),
  fault_key text NOT NULL,
  root_pattern_id text NOT NULL,
  discipline text NOT NULL CHECK (discipline IN ('hitting','throwing','fielding','running','lifting')),
  confidence numeric NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  sample_size integer NOT NULL CHECK (sample_size >= 0),
  severity numeric NOT NULL DEFAULT 0.5 CHECK (severity >= 0 AND severity <= 1),
  evidence text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  engine_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wk_fault_signals_user_observed_idx ON public.wk_fault_signals (user_id, observed_at DESC);
CREATE INDEX wk_fault_signals_root_idx ON public.wk_fault_signals (user_id, root_pattern_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_fault_signals TO authenticated;
GRANT ALL ON public.wk_fault_signals TO service_role;

ALTER TABLE public.wk_fault_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes read their own fault signals"
ON public.wk_fault_signals FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Athletes write their own fault signals"
ON public.wk_fault_signals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Athletes update their own fault signals"
ON public.wk_fault_signals FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Athletes delete their own fault signals"
ON public.wk_fault_signals FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Linked coaches read their athletes fault signals"
ON public.wk_fault_signals FOR SELECT TO authenticated
USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Consented scouts read athlete fault signals"
ON public.wk_fault_signals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'scout'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.athlete_recruiting_consent c
    WHERE c.athlete_id = wk_fault_signals.user_id
      AND c.visibility_enabled = true
      AND (NOT public.is_minor(wk_fault_signals.user_id) OR c.parent_authorized = true)
  )
);

CREATE TRIGGER wk_fault_signals_updated_at
BEFORE UPDATE ON public.wk_fault_signals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS troubleshooting_tags text[] NOT NULL DEFAULT '{}';