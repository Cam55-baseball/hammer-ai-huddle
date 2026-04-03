
-- Create hie_snapshots table
CREATE TABLE public.hie_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL DEFAULT 'baseball',
  computed_at timestamptz NOT NULL DEFAULT now(),
  development_status text NOT NULL DEFAULT 'stalled',
  primary_limiter text,
  weakness_clusters jsonb DEFAULT '[]'::jsonb,
  prescriptive_actions jsonb DEFAULT '[]'::jsonb,
  readiness_score numeric DEFAULT 0,
  readiness_recommendation text,
  risk_alerts jsonb DEFAULT '[]'::jsonb,
  development_confidence numeric DEFAULT 0,
  smart_week_plan jsonb DEFAULT '[]'::jsonb,
  before_after_trends jsonb DEFAULT '[]'::jsonb,
  drill_effectiveness jsonb DEFAULT '[]'::jsonb,
  transfer_score numeric,
  decision_speed_index numeric,
  movement_efficiency_score numeric,
  mpi_score numeric,
  mpi_trend_7d numeric,
  mpi_trend_30d numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique constraint for upserts
CREATE UNIQUE INDEX hie_snapshots_user_sport_idx ON public.hie_snapshots (user_id, sport);

-- Create hie_team_snapshots table
CREATE TABLE public.hie_team_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  team_mpi_avg numeric DEFAULT 0,
  trending_players jsonb DEFAULT '[]'::jsonb,
  risk_alerts jsonb DEFAULT '[]'::jsonb,
  team_weakness_patterns jsonb DEFAULT '[]'::jsonb,
  suggested_team_drills jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX hie_team_snapshots_org_idx ON public.hie_team_snapshots (organization_id);

-- Enable RLS
ALTER TABLE public.hie_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hie_team_snapshots ENABLE ROW LEVEL SECURITY;

-- hie_snapshots: user can read own
CREATE POLICY "Users can read own HIE snapshots"
  ON public.hie_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- hie_snapshots: coaches can read linked players
CREATE POLICY "Coaches can read linked player HIE snapshots"
  ON public.hie_snapshots FOR SELECT
  TO authenticated
  USING (public.is_linked_coach(auth.uid(), user_id));

-- hie_snapshots: service role inserts (edge function uses service role)
CREATE POLICY "Service can manage HIE snapshots"
  ON public.hie_snapshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- hie_team_snapshots: org coaches/owners can read
CREATE POLICY "Org coaches can read team HIE snapshots"
  ON public.hie_team_snapshots FOR SELECT
  TO authenticated
  USING (public.is_org_coach_or_owner(auth.uid(), organization_id));

-- hie_team_snapshots: service role manages
CREATE POLICY "Service can manage team HIE snapshots"
  ON public.hie_team_snapshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER hie_snapshots_updated_at
  BEFORE UPDATE ON public.hie_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER hie_team_snapshots_updated_at
  BEFORE UPDATE ON public.hie_team_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
