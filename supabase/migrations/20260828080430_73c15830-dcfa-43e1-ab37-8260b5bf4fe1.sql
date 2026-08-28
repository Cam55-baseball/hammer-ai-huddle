CREATE TABLE public.org_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_user_id uuid NOT NULL,
  org_name text NOT NULL,
  label text NOT NULL,
  sport text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.org_standard_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id uuid NOT NULL REFERENCES public.org_standards(id) ON DELETE CASCADE,
  field text NOT NULL,
  operator text NOT NULL CHECK (operator IN ('eq','gte','lte','in')),
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.standard_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id uuid NOT NULL REFERENCES public.org_standards(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL,
  matched_at timestamptz NOT NULL DEFAULT now(),
  notified_org boolean NOT NULL DEFAULT false,
  notified_athlete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (standard_id, athlete_user_id)
);

CREATE INDEX idx_org_standards_org_user ON public.org_standards(org_user_id);
CREATE INDEX idx_org_standard_criteria_standard ON public.org_standard_criteria(standard_id);
CREATE INDEX idx_standard_matches_athlete ON public.standard_matches(athlete_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_standards TO authenticated;
GRANT ALL ON public.org_standards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_standard_criteria TO authenticated;
GRANT ALL ON public.org_standard_criteria TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.standard_matches TO authenticated;
GRANT ALL ON public.standard_matches TO service_role;

ALTER TABLE public.org_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_standard_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users manage their own standards"
ON public.org_standards FOR ALL TO authenticated
USING (auth.uid() = org_user_id)
WITH CHECK (auth.uid() = org_user_id);

CREATE POLICY "Org users manage criteria on their own standards"
ON public.org_standard_criteria FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.org_standards s WHERE s.id = standard_id AND s.org_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.org_standards s WHERE s.id = standard_id AND s.org_user_id = auth.uid()));

CREATE POLICY "Org users manage matches against their own standards"
ON public.standard_matches FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.org_standards s WHERE s.id = standard_id AND s.org_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.org_standards s WHERE s.id = standard_id AND s.org_user_id = auth.uid()));

CREATE POLICY "Athletes read their own matches"
ON public.standard_matches FOR SELECT TO authenticated
USING (auth.uid() = athlete_user_id);

CREATE TRIGGER org_standards_touch BEFORE UPDATE ON public.org_standards
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER org_standard_criteria_touch BEFORE UPDATE ON public.org_standard_criteria
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER standard_matches_touch BEFORE UPDATE ON public.standard_matches
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();