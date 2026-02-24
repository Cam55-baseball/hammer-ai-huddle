
-- =============================================
-- Migration 1: Core Tables
-- =============================================

-- performance_sessions: Central session table for ALL practice/game data
CREATE TABLE public.performance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL,
  session_type text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  calendar_event_id uuid,
  season_context text DEFAULT 'in_season',
  drill_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  composite_indexes jsonb DEFAULT '{}'::jsonb,
  player_grade numeric,
  coach_grade numeric,
  coach_id uuid,
  effective_grade numeric,
  intent_compliance_pct numeric,
  is_locked boolean DEFAULT false,
  deleted_at timestamptz,
  edited_at timestamptz,
  is_retroactive boolean DEFAULT false,
  voice_notes text[] DEFAULT '{}',
  notes text,
  opponent_name text,
  opponent_level text,
  micro_layer_data jsonb,
  data_density_level integer DEFAULT 1,
  fatigue_state_at_session jsonb,
  organization_id uuid,
  throwing_hand_used text,
  batting_side_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sessions"
  ON public.performance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own sessions"
  ON public.performance_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own sessions within time window"
  ON public.performance_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_locked = false);

CREATE POLICY "Admins can select all sessions"
  ON public.performance_sessions FOR SELECT
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

CREATE INDEX idx_perf_sessions_user ON public.performance_sessions(user_id);
CREATE INDEX idx_perf_sessions_date ON public.performance_sessions(session_date);
CREATE INDEX idx_perf_sessions_sport ON public.performance_sessions(sport);

-- mpi_scores: Nightly MPI calculation snapshots
CREATE TABLE public.mpi_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sport text NOT NULL,
  calculation_date date NOT NULL,
  adjusted_global_score numeric,
  global_rank integer,
  global_percentile numeric,
  total_athletes_in_pool integer,
  pro_probability numeric,
  pro_probability_capped boolean DEFAULT false,
  hof_probability numeric,
  hof_tracking_active boolean DEFAULT false,
  mlb_season_count integer DEFAULT 0,
  trend_direction text,
  trend_delta_30d numeric,
  segment_pool text,
  game_practice_ratio numeric,
  fatigue_correlation_flag boolean DEFAULT false,
  delta_maturity_index numeric,
  verified_stat_boost numeric DEFAULT 0,
  contract_status_modifier numeric DEFAULT 0,
  integrity_score numeric DEFAULT 100,
  composite_bqi numeric,
  composite_fqi numeric,
  composite_pei numeric,
  composite_decision numeric,
  composite_competitive numeric,
  development_prompts jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mpi_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own MPI scores"
  ON public.mpi_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE INDEX idx_mpi_user_date ON public.mpi_scores(user_id, calculation_date DESC);
CREATE INDEX idx_mpi_sport_rank ON public.mpi_scores(sport, global_rank);

-- governance_flags: Integrity alerts
CREATE TABLE public.governance_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL,
  severity text DEFAULT 'info',
  source_session_id uuid REFERENCES public.performance_sessions(id),
  details jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  admin_notes text,
  admin_action text,
  video_evidence_url text,
  tagged_rep_index integer,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.governance_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own flags"
  ON public.governance_flags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all flags"
  ON public.governance_flags FOR ALL
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'admin'));

CREATE INDEX idx_gov_flags_user ON public.governance_flags(user_id);
CREATE INDEX idx_gov_flags_status ON public.governance_flags(status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.governance_flags;

-- Updated_at trigger for performance_sessions
CREATE TRIGGER update_performance_sessions_updated_at
  BEFORE UPDATE ON public.performance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
