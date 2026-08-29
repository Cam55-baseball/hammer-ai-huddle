CREATE TABLE public.catching_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric text NOT NULL CHECK (metric IN ('pop_time_sec','throw_velo_mph','framing_strikes_above_expected','block_success','exchange_time_sec')),
  value numeric,
  unit text,
  source text NOT NULL CHECK (source IN ('video_detected','manual_entry')),
  confidence numeric,
  missing_reason text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catching_reps TO authenticated;
GRANT ALL ON public.catching_reps TO service_role;
ALTER TABLE public.catching_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own catching reps" ON public.catching_reps
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Evaluators can log catching reps for athletes" ON public.catching_reps
  FOR INSERT TO authenticated
  WITH CHECK (has_active_evaluator_role(auth.uid()) AND recorded_by = auth.uid() AND user_id <> auth.uid() AND source = 'manual_entry');
CREATE POLICY "Evaluators can read catching reps they filed" ON public.catching_reps
  FOR SELECT TO authenticated USING (recorded_by = auth.uid());
CREATE POLICY "Linked coaches can read athlete catching reps" ON public.catching_reps
  FOR SELECT TO authenticated USING (is_coach_of(auth.uid(), user_id));

CREATE INDEX idx_catching_reps_user_created ON public.catching_reps (user_id, created_at DESC);

CREATE TRIGGER catching_reps_set_updated_at
  BEFORE UPDATE ON public.catching_reps
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.throwing_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  position_context text NOT NULL CHECK (position_context IN ('infield','outfield','catcher','relay','on_the_run')),
  metric text NOT NULL CHECK (metric IN ('throw_velo_mph','carry_ft','accuracy_score','release_time_sec')),
  value numeric,
  unit text,
  source text NOT NULL CHECK (source IN ('video_detected','manual_entry')),
  confidence numeric,
  missing_reason text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.throwing_reps TO authenticated;
GRANT ALL ON public.throwing_reps TO service_role;
ALTER TABLE public.throwing_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own throwing reps" ON public.throwing_reps
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Evaluators can log throwing reps for athletes" ON public.throwing_reps
  FOR INSERT TO authenticated
  WITH CHECK (has_active_evaluator_role(auth.uid()) AND recorded_by = auth.uid() AND user_id <> auth.uid() AND source = 'manual_entry');
CREATE POLICY "Evaluators can read throwing reps they filed" ON public.throwing_reps
  FOR SELECT TO authenticated USING (recorded_by = auth.uid());
CREATE POLICY "Linked coaches can read athlete throwing reps" ON public.throwing_reps
  FOR SELECT TO authenticated USING (is_coach_of(auth.uid(), user_id));

CREATE INDEX idx_throwing_reps_user_created ON public.throwing_reps (user_id, created_at DESC);

CREATE TRIGGER throwing_reps_set_updated_at
  BEFORE UPDATE ON public.throwing_reps
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();