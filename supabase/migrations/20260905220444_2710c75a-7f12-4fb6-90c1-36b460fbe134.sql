CREATE TABLE public.analysis_fault_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid,
  video_analysis_run_id uuid,
  skill_domain text NOT NULL,
  sport text,
  fault_key text NOT NULL,
  movement_key text,
  correction_key text,
  root_pattern_key text,
  evidence text,
  engine_version text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_aff_user_domain_created ON public.analysis_fault_findings (user_id, skill_domain, created_at DESC);
CREATE INDEX idx_aff_user_root ON public.analysis_fault_findings (user_id, root_pattern_key);

GRANT SELECT, DELETE ON public.analysis_fault_findings TO authenticated;
GRANT ALL ON public.analysis_fault_findings TO service_role;

ALTER TABLE public.analysis_fault_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes read their own fault findings"
  ON public.analysis_fault_findings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Athletes delete their own fault findings"
  ON public.analysis_fault_findings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_analysis_fault_findings_updated_at
  BEFORE UPDATE ON public.analysis_fault_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();