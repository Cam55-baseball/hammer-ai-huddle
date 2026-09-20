
-- 1. allow cancelling a stuck test run
ALTER TABLE public.tcs_test_runs DROP CONSTRAINT IF EXISTS tcs_test_runs_status_check;
ALTER TABLE public.tcs_test_runs ADD CONSTRAINT tcs_test_runs_status_check
  CHECK (status IN ('pending','running','passed','failed','cancelled','error'));

CREATE OR REPLACE FUNCTION public.is_training_intel_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'owner')
$$;

-- 2. feature switches
CREATE TABLE public.wk_feature_switches (
  feature_key text PRIMARY KEY,
  label text NOT NULL,
  mode text NOT NULL DEFAULT 'off' CHECK (mode IN ('off','self','pilot','all')),
  allowlist uuid[] NOT NULL DEFAULT '{}',
  buildable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wk_feature_switches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_feature_switches TO authenticated;
GRANT ALL ON public.wk_feature_switches TO service_role;
ALTER TABLE public.wk_feature_switches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read switches" ON public.wk_feature_switches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage switches" ON public.wk_feature_switches
  FOR ALL TO authenticated
  USING (public.is_training_intel_owner(auth.uid()))
  WITH CHECK (public.is_training_intel_owner(auth.uid()));

CREATE TRIGGER wk_feature_switches_updated_at
  BEFORE UPDATE ON public.wk_feature_switches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.wk_feature_switches (feature_key, label, buildable, sort_order) VALUES
  ('rest_day_calculator',   'Rest-day calculator',            true,  1),
  ('ub_plyo_hand_wrist',    'Upper-body plyos + Hand & Wrist', true,  2),
  ('onboarding_off_days',   'Onboarding & off days',          true,  3),
  ('one_tap_logging',       'One-tap logging',                true,  4),
  ('staff_view',            'Staff View',                     true,  5),
  ('offseason_arc',         'Offseason arc',                  false, 6),
  ('in_season_post_game',   'In-season post-game plan',       false, 7),
  ('personalization',       'Personalization',                false, 8);

-- 3. switch audit log
CREATE TABLE public.wk_feature_switch_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  from_mode text,
  to_mode text NOT NULL,
  from_allowlist uuid[],
  to_allowlist uuid[],
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wk_feature_switch_audit TO authenticated;
GRANT ALL ON public.wk_feature_switch_audit TO service_role;
ALTER TABLE public.wk_feature_switch_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read switch audit" ON public.wk_feature_switch_audit
  FOR SELECT TO authenticated USING (public.is_training_intel_owner(auth.uid()));
CREATE POLICY "Admins write switch audit" ON public.wk_feature_switch_audit
  FOR INSERT TO authenticated WITH CHECK (public.is_training_intel_owner(auth.uid()));
CREATE INDEX wk_feature_switch_audit_key_idx ON public.wk_feature_switch_audit (feature_key, changed_at DESC);

-- 4. owner review marks on shadow disagreements
CREATE TABLE public.wk_shadow_review_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  decision_date date NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('agree','disagree')),
  note text,
  marked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, decision_date, marked_by)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_shadow_review_marks TO authenticated;
GRANT ALL ON public.wk_shadow_review_marks TO service_role;
ALTER TABLE public.wk_shadow_review_marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage review marks" ON public.wk_shadow_review_marks
  FOR ALL TO authenticated
  USING (public.is_training_intel_owner(auth.uid()))
  WITH CHECK (public.is_training_intel_owner(auth.uid()));
CREATE TRIGGER wk_shadow_review_marks_updated_at
  BEFORE UPDATE ON public.wk_shadow_review_marks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. card-matrix run records
CREATE TABLE public.wk_card_matrix_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  cells integer NOT NULL,
  empty_cells integer NOT NULL,
  active_rows integer NOT NULL,
  fingerprint text,
  status text NOT NULL CHECK (status IN ('passed','failed')),
  git_sha text,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wk_card_matrix_runs TO authenticated;
GRANT ALL ON public.wk_card_matrix_runs TO service_role;
ALTER TABLE public.wk_card_matrix_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read card matrix runs" ON public.wk_card_matrix_runs
  FOR SELECT TO authenticated USING (public.is_training_intel_owner(auth.uid()));
CREATE INDEX wk_card_matrix_runs_run_at_idx ON public.wk_card_matrix_runs (run_at DESC);
