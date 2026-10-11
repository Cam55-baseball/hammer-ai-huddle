CREATE TABLE public.exercise_vault_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  is_new boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','discarded')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.exercise_vault_drafts (slug, status);

CREATE TABLE public.exercise_vault_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  version integer NOT NULL,
  payload jsonb NOT NULL,
  previous_payload jsonb,
  apply_today boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL,
  undone_at timestamptz,
  made_live_by uuid NOT NULL,
  made_live_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, version)
);

CREATE TABLE public.exercise_vault_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid NOT NULL,
  action text NOT NULL,
  slug text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.exercise_vault_audit (slug, at DESC);

GRANT SELECT, INSERT, UPDATE ON public.exercise_vault_drafts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.exercise_vault_versions TO authenticated;
GRANT SELECT, INSERT ON public.exercise_vault_audit TO authenticated;
GRANT ALL ON public.exercise_vault_drafts, public.exercise_vault_versions, public.exercise_vault_audit TO service_role;

ALTER TABLE public.exercise_vault_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_vault_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_vault_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage vault drafts" ON public.exercise_vault_drafts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK ((public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin')) AND created_by = auth.uid());
CREATE POLICY "Staff manage vault versions" ON public.exercise_vault_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff read vault audit" ON public.exercise_vault_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff write own vault audit" ON public.exercise_vault_audit FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin')) AND actor = auth.uid());