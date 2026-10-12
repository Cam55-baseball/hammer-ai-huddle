CREATE TABLE public.initial_assessments (
  user_id uuid PRIMARY KEY,
  last_season_skipped_at timestamptz,
  last_season_saved_at timestamptz,
  movement_screen jsonb,
  movement_done_at timestamptz,
  pain_flag boolean NOT NULL DEFAULT false,
  recorded_by uuid,
  recorded_by_label text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.initial_assessments IS 'Plan 4 B: one-time initial assessment progress per player.';
GRANT SELECT, INSERT, UPDATE ON public.initial_assessments TO authenticated;
GRANT ALL ON public.initial_assessments TO service_role;
ALTER TABLE public.initial_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.initial_assessments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own insert" ON public.initial_assessments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND recorded_by IS NULL);
CREATE POLICY "own update" ON public.initial_assessments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());