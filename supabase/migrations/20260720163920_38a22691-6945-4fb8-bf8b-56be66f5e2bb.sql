
-- Audit runs: one row per audit invocation
CREATE TABLE IF NOT EXISTS public.iq_alignment_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running',       -- running | ok | failed
  situations_checked INT NOT NULL DEFAULT 0,
  findings_total INT NOT NULL DEFAULT 0,
  findings_error INT NOT NULL DEFAULT 0,
  findings_warn INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.iq_alignment_audit_runs TO authenticated;
GRANT ALL ON public.iq_alignment_audit_runs TO service_role;

ALTER TABLE public.iq_alignment_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read audit runs"
  ON public.iq_alignment_audit_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Individual findings per (situation, sport, batter_side)
CREATE TABLE IF NOT EXISTS public.iq_alignment_audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.iq_alignment_audit_runs(id) ON DELETE CASCADE,
  situation_id UUID NOT NULL REFERENCES public.iq_situations(id) ON DELETE CASCADE,
  situation_slug TEXT,
  situation_title TEXT,
  sport TEXT NOT NULL,                           -- baseball | softball
  batter_side TEXT NOT NULL,                     -- R | L
  severity TEXT NOT NULL,                        -- error | warn | ok
  reason_code TEXT NOT NULL,                     -- missing_preset | missing_hand_anchors | off_field | low_coverage | no_default | ok
  preset_key TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS iq_alignment_audit_findings_run_idx
  ON public.iq_alignment_audit_findings(run_id);
CREATE INDEX IF NOT EXISTS iq_alignment_audit_findings_sev_idx
  ON public.iq_alignment_audit_findings(run_id, severity);

GRANT SELECT ON public.iq_alignment_audit_findings TO authenticated;
GRANT ALL ON public.iq_alignment_audit_findings TO service_role;

ALTER TABLE public.iq_alignment_audit_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read audit findings"
  ON public.iq_alignment_audit_findings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));
