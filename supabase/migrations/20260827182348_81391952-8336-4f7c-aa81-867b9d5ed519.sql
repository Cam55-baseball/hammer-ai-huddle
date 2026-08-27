CREATE TABLE public.defensive_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  at_bat_id uuid REFERENCES public.gp_at_bats(id) ON DELETE CASCADE,
  fielder_position text,
  fielder_id uuid,
  fielder_start_position jsonb,
  ball_landing_location jsonb,
  hang_time_sec numeric,
  distance_to_cover numeric,
  route_efficiency numeric,
  total_play_time_sec numeric,
  outcome text CHECK (outcome IS NULL OR outcome IN ('catch','no_catch','error')),
  throw_velo numeric,
  throw_accuracy numeric,
  catch_probability numeric,
  oae_credit numeric,
  beaten_runner_grade numeric,
  source text NOT NULL DEFAULT 'manual_entry' CHECK (source IN ('video_detected','manual_entry')),
  confidence numeric,
  missing_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.defensive_plays TO authenticated;
GRANT ALL ON public.defensive_plays TO service_role;

ALTER TABLE public.defensive_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own defensive plays"
  ON public.defensive_plays FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Linked coaches can read athlete defensive plays"
  ON public.defensive_plays FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE INDEX idx_defensive_plays_user ON public.defensive_plays(user_id);
CREATE INDEX idx_defensive_plays_at_bat ON public.defensive_plays(at_bat_id);

CREATE TRIGGER defensive_plays_touch_updated_at
  BEFORE UPDATE ON public.defensive_plays
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();