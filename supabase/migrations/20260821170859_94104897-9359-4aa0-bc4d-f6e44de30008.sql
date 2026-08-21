-- Report artifacts: stored snapshots that can be shared or printed
CREATE TABLE public.gp_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  game_id uuid REFERENCES public.gp_games(id) ON DELETE CASCADE,
  report_kind text NOT NULL CHECK (report_kind IN ('individual_postgame','team_postgame','opponent_scouting')),
  sport text,
  title text NOT NULL,
  subtitle text,
  snapshot jsonb NOT NULL,
  share_token text UNIQUE,
  share_expires_at timestamptz,
  share_revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gp_reports_user_idx ON public.gp_reports(user_id, created_at DESC);
CREATE INDEX gp_reports_game_idx ON public.gp_reports(game_id);
CREATE INDEX gp_reports_token_idx ON public.gp_reports(share_token) WHERE share_token IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_reports TO authenticated;
GRANT ALL ON public.gp_reports TO service_role;
ALTER TABLE public.gp_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage their own reports"
  ON public.gp_reports FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Linked coaches can read athlete reports"
  ON public.gp_reports FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Org staff can read org reports"
  ON public.gp_reports FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_coach_or_owner(auth.uid(), org_id));

CREATE TRIGGER gp_reports_touch
  BEFORE UPDATE ON public.gp_reports
  FOR EACH ROW EXECUTE FUNCTION public.gp_set_updated_at();

-- Staff read access over the game ledger for linked coaches
CREATE POLICY "Linked coaches can read athlete games"
  ON public.gp_games FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Linked coaches can read athlete at bats"
  ON public.gp_at_bats FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Linked coaches can read athlete pitches"
  ON public.gp_pitches FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Linked coaches can read athlete defense plays"
  ON public.gp_defense_plays FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Linked coaches can read athlete baserun events"
  ON public.gp_baserun_events FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Linked coaches can read athlete subs"
  ON public.gp_subs FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Linked coaches can read athlete pregame plans"
  ON public.gp_pregame_plans FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE POLICY "Linked coaches can read athlete plan outcomes"
  ON public.gp_plan_outcomes FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

-- Ingest jobs: external data files parsed into the ledger after review
CREATE TABLE public.gp_ingest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id uuid REFERENCES public.gp_games(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('trackman','rapsodo','hittrax','hawkeye','gamechanger','scorebook_image','manual_paste','other')),
  sport text,
  file_name text,
  file_path text,
  raw_sample text,
  parsed jsonb,
  parse_status text NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending','parsed','failed')),
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','committed','discarded')),
  rows_detected integer NOT NULL DEFAULT 0,
  rows_committed integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gp_ingest_jobs_user_idx ON public.gp_ingest_jobs(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_ingest_jobs TO authenticated;
GRANT ALL ON public.gp_ingest_jobs TO service_role;
ALTER TABLE public.gp_ingest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage their own ingest jobs"
  ON public.gp_ingest_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER gp_ingest_jobs_touch
  BEFORE UPDATE ON public.gp_ingest_jobs
  FOR EACH ROW EXECUTE FUNCTION public.gp_set_updated_at();