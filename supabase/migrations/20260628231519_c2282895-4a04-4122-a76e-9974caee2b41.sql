
-- =========================================================
-- Baseball & Softball IQ 101 — schema
-- =========================================================

-- ---------- iq_situations ----------
CREATE TABLE public.iq_situations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sport text NOT NULL CHECK (sport IN ('baseball','softball','both')),
  slug text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  lens_tags text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'core' CHECK (difficulty IN ('intro','core','advanced','elite')),
  canonical_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  triple_check_count int NOT NULL DEFAULT 0,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iq_situations TO authenticated;
GRANT ALL ON public.iq_situations TO service_role;
ALTER TABLE public.iq_situations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iq_situations_read_published"
  ON public.iq_situations FOR SELECT
  TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "iq_situations_owner_write"
  ON public.iq_situations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'owner'));

CREATE POLICY "iq_situations_owner_update"
  ON public.iq_situations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'owner'));

CREATE POLICY "iq_situations_owner_delete"
  ON public.iq_situations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'owner'));

CREATE TRIGGER trg_iq_situations_updated
  BEFORE UPDATE ON public.iq_situations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- iq_situation_actors ----------
CREATE TABLE public.iq_situation_actors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  situation_id uuid NOT NULL REFERENCES public.iq_situations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'P','C','1B','2B','3B','SS','LF','CF','RF',
    'R1','R2','R3','BR','BAT'
  )),
  assignment text NOT NULL CHECK (assignment IN ('ball','bag','backup','read','execute','idle')),
  primary_path jsonb NOT NULL DEFAULT '[]'::jsonb,
  secondary_read text NOT NULL DEFAULT '',
  communication_call text NOT NULL DEFAULT '',
  coaching_note text NOT NULL DEFAULT '',
  common_mistake text NOT NULL DEFAULT '',
  elite_cue text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (situation_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iq_situation_actors TO authenticated;
GRANT ALL ON public.iq_situation_actors TO service_role;
ALTER TABLE public.iq_situation_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iq_actors_read_published"
  ON public.iq_situation_actors FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.iq_situations s
    WHERE s.id = situation_id
      AND (s.status = 'published' OR public.has_role(auth.uid(),'owner'))
  ));

CREATE POLICY "iq_actors_owner_write"
  ON public.iq_situation_actors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'owner'));

CREATE TRIGGER trg_iq_actors_updated
  BEFORE UPDATE ON public.iq_situation_actors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- iq_situation_variants ----------
CREATE TABLE public.iq_situation_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  situation_id uuid NOT NULL REFERENCES public.iq_situations(id) ON DELETE CASCADE,
  count_balls smallint NOT NULL DEFAULT 0,
  count_strikes smallint NOT NULL DEFAULT 0,
  outs smallint NOT NULL DEFAULT 0,
  runners jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_state text NOT NULL DEFAULT 'neutral',
  inning smallint,
  handedness text,
  opponent_tendency text,
  generated boolean NOT NULL DEFAULT false,
  seed text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iq_situation_variants TO authenticated;
GRANT ALL ON public.iq_situation_variants TO service_role;
ALTER TABLE public.iq_situation_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iq_variants_read_published"
  ON public.iq_situation_variants FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.iq_situations s
    WHERE s.id = situation_id
      AND (s.status = 'published' OR public.has_role(auth.uid(),'owner'))
  ));

CREATE POLICY "iq_variants_owner_write"
  ON public.iq_situation_variants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'owner'));

-- ---------- iq_scenarios ----------
CREATE TABLE public.iq_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  situation_id uuid NOT NULL REFERENCES public.iq_situations(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.iq_situation_variants(id) ON DELETE SET NULL,
  sport text NOT NULL CHECK (sport IN ('baseball','softball','both')),
  prompt text NOT NULL,
  position_focus text NOT NULL,
  correct_actor_assignments jsonb NOT NULL DEFAULT '{}'::jsonb,
  distractors jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iq_scenarios TO authenticated;
GRANT ALL ON public.iq_scenarios TO service_role;
ALTER TABLE public.iq_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iq_scenarios_read_published"
  ON public.iq_scenarios FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.iq_situations s
    WHERE s.id = situation_id
      AND (s.status = 'published' OR public.has_role(auth.uid(),'owner'))
  ));

CREATE POLICY "iq_scenarios_owner_write"
  ON public.iq_scenarios FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'owner'));

CREATE TRIGGER trg_iq_scenarios_updated
  BEFORE UPDATE ON public.iq_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- iq_user_progress ----------
CREATE TABLE public.iq_user_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  situation_id uuid NOT NULL REFERENCES public.iq_situations(id) ON DELETE CASCADE,
  mastery_score smallint NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  next_due_at timestamptz,
  streak int NOT NULL DEFAULT 0,
  lifetime_attempts int NOT NULL DEFAULT 0,
  lifetime_correct int NOT NULL DEFAULT 0,
  ef_factor numeric NOT NULL DEFAULT 2.5,
  interval_days int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, situation_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iq_user_progress TO authenticated;
GRANT ALL ON public.iq_user_progress TO service_role;
ALTER TABLE public.iq_user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iq_progress_self_rw"
  ON public.iq_user_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_iq_progress_updated
  BEFORE UPDATE ON public.iq_user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- iq_user_attempts ----------
CREATE TABLE public.iq_user_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id uuid NOT NULL REFERENCES public.iq_scenarios(id) ON DELETE CASCADE,
  situation_id uuid NOT NULL REFERENCES public.iq_situations(id) ON DELETE CASCADE,
  position_chosen text,
  correct boolean NOT NULL,
  answer_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iq_user_attempts TO authenticated;
GRANT ALL ON public.iq_user_attempts TO service_role;
ALTER TABLE public.iq_user_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iq_attempts_self_rw"
  ON public.iq_user_attempts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------- iq_owner_review_log ----------
CREATE TABLE public.iq_owner_review_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  situation_id uuid NOT NULL REFERENCES public.iq_situations(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_round smallint NOT NULL,
  notes text NOT NULL DEFAULT '',
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iq_owner_review_log TO authenticated;
GRANT ALL ON public.iq_owner_review_log TO service_role;
ALTER TABLE public.iq_owner_review_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iq_review_log_owner_rw"
  ON public.iq_owner_review_log FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'owner'));

-- ---------- indexes ----------
CREATE INDEX idx_iq_situations_sport_status ON public.iq_situations(sport, status, canonical_order);
CREATE INDEX idx_iq_actors_situation ON public.iq_situation_actors(situation_id);
CREATE INDEX idx_iq_variants_situation ON public.iq_situation_variants(situation_id);
CREATE INDEX idx_iq_scenarios_situation ON public.iq_scenarios(situation_id);
CREATE INDEX idx_iq_progress_due ON public.iq_user_progress(user_id, next_due_at);
CREATE INDEX idx_iq_attempts_user_created ON public.iq_user_attempts(user_id, created_at DESC);
