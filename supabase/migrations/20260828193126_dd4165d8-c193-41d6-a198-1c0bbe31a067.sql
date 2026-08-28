CREATE TABLE public.baserunning_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN (
    'home_to_first',
    'ten_yard_split',
    'thirty_yard_dash',
    'sixty_yard_dash',
    'lead_distance_primary',
    'lead_distance_secondary'
  )),
  value numeric,
  unit text,
  batter_hand text CHECK (batter_hand IS NULL OR batter_hand IN ('L','R')),
  source text NOT NULL DEFAULT 'manual_entry' CHECK (source IN ('video_detected','manual_entry')),
  confidence numeric,
  missing_reason text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.baserunning_splits TO authenticated;
GRANT ALL ON public.baserunning_splits TO service_role;

ALTER TABLE public.baserunning_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own baserunning splits"
  ON public.baserunning_splits FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Linked coaches can read athlete baserunning splits"
  ON public.baserunning_splits FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Evaluators can log baserunning splits for athletes"
  ON public.baserunning_splits FOR INSERT TO authenticated
  WITH CHECK (
    public.has_active_evaluator_role(auth.uid())
    AND recorded_by = auth.uid()
    AND user_id <> auth.uid()
    AND source = 'manual_entry'
  );

CREATE POLICY "Evaluators can read baserunning splits they filed"
  ON public.baserunning_splits FOR SELECT TO authenticated
  USING (recorded_by = auth.uid());

CREATE INDEX idx_baserunning_splits_user ON public.baserunning_splits(user_id);
CREATE INDEX idx_baserunning_splits_recorded_by ON public.baserunning_splits(recorded_by);

CREATE TRIGGER baserunning_splits_touch_updated_at
  BEFORE UPDATE ON public.baserunning_splits
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();