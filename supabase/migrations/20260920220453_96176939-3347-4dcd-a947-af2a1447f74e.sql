CREATE TABLE public.wk_staff_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL,
  athlete_user_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  label text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_user_id, athlete_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_staff_access TO authenticated;
GRANT ALL ON public.wk_staff_access TO service_role;
ALTER TABLE public.wk_staff_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athlete manages own staff grants"
ON public.wk_staff_access FOR ALL TO authenticated
USING (athlete_user_id = auth.uid())
WITH CHECK (athlete_user_id = auth.uid() AND granted_by = auth.uid());

CREATE POLICY "Staff read grants naming them"
ON public.wk_staff_access FOR SELECT TO authenticated
USING (staff_user_id = auth.uid());

CREATE POLICY "Owner and admin manage staff grants"
ON public.wk_staff_access FOR ALL TO authenticated
USING (public.is_training_intel_owner(auth.uid()))
WITH CHECK (public.is_training_intel_owner(auth.uid()));

CREATE TRIGGER wk_staff_access_updated_at
BEFORE UPDATE ON public.wk_staff_access
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX wk_staff_access_staff_idx ON public.wk_staff_access (staff_user_id) WHERE revoked_at IS NULL;

CREATE TABLE public.wk_staff_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL,
  athlete_user_id uuid NOT NULL,
  surface text NOT NULL DEFAULT 'staff_view',
  viewed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wk_staff_access_log TO authenticated;
GRANT ALL ON public.wk_staff_access_log TO service_role;
ALTER TABLE public.wk_staff_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff write own access log"
ON public.wk_staff_access_log FOR INSERT TO authenticated
WITH CHECK (staff_user_id = auth.uid());

CREATE POLICY "Athlete reads own access log"
ON public.wk_staff_access_log FOR SELECT TO authenticated
USING (athlete_user_id = auth.uid() OR staff_user_id = auth.uid() OR public.is_training_intel_owner(auth.uid()));

CREATE INDEX wk_staff_access_log_athlete_idx ON public.wk_staff_access_log (athlete_user_id, viewed_at DESC);

CREATE TABLE public.wk_catalog_review_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL,
  slug text NOT NULL,
  decision text NOT NULL,
  note text,
  decided_by uuid NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wk_catalog_review_notes TO authenticated;
GRANT ALL ON public.wk_catalog_review_notes TO service_role;
ALTER TABLE public.wk_catalog_review_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and admin read review notes"
ON public.wk_catalog_review_notes FOR SELECT TO authenticated
USING (public.is_training_intel_owner(auth.uid()));

CREATE POLICY "Owner and admin write review notes"
ON public.wk_catalog_review_notes FOR INSERT TO authenticated
WITH CHECK (public.is_training_intel_owner(auth.uid()) AND decided_by = auth.uid());

CREATE INDEX wk_catalog_review_notes_catalog_idx ON public.wk_catalog_review_notes (catalog_id, decided_at DESC);