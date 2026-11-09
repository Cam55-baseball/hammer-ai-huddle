-- Release A3 (owner Nov 9): Apple's workout id per completed Today card, so an un-mark deletes
-- exactly that workout and a re-mark writes it once. iPhone app only; the website never writes here.
CREATE TABLE public.health_workout_writes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  card_key text NOT NULL,
  modality text NOT NULL,
  activity_type text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  distance_m double precision,
  hk_workout_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT health_workout_writes_status_check CHECK (status IN ('pending', 'saved', 'deleted')),
  CONSTRAINT health_workout_writes_times_check CHECK (ended_at > started_at),
  CONSTRAINT health_workout_writes_distance_check CHECK (distance_m IS NULL OR distance_m > 0)
);
-- One live Health workout per card per day: a second write for the same card is refused.
CREATE UNIQUE INDEX health_workout_writes_one_live_idx
  ON public.health_workout_writes (user_id, plan_date, card_key) WHERE status <> 'deleted';
CREATE INDEX health_workout_writes_user_idx ON public.health_workout_writes (user_id, plan_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_workout_writes TO authenticated;
GRANT ALL ON public.health_workout_writes TO service_role;
ALTER TABLE public.health_workout_writes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own Health workout writes" ON public.health_workout_writes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Players add own Health workout writes" ON public.health_workout_writes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players update own Health workout writes" ON public.health_workout_writes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players delete own Health workout writes" ON public.health_workout_writes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Apple Health read/save failures go to the owner's System checks card (never pushed).
ALTER TABLE public.plan_check_failures DROP CONSTRAINT IF EXISTS plan_check_failures_check_key_check;
ALTER TABLE public.plan_check_failures ADD CONSTRAINT plan_check_failures_check_key_check
  CHECK (check_key IN ('analysis_findings', 'drill_choice', 'practice_history', 'measurement_save', 'apple_health'));