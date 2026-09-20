CREATE TABLE public.wk_exposure_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  channel text NOT NULL,
  tier text NOT NULL DEFAULT 'all',
  total numeric NOT NULL DEFAULT 0,
  sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  version text NOT NULL DEFAULT 'exposure_ledger_v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, channel, tier, version)
);

GRANT SELECT ON public.wk_exposure_daily TO authenticated;
GRANT ALL ON public.wk_exposure_daily TO service_role;

ALTER TABLE public.wk_exposure_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes read their own exposure"
  ON public.wk_exposure_daily FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_training_intel_owner(auth.uid())
  );

CREATE INDEX idx_wk_exposure_daily_user_date ON public.wk_exposure_daily (user_id, date DESC);
CREATE INDEX idx_wk_exposure_daily_channel ON public.wk_exposure_daily (user_id, channel, date DESC);

CREATE TRIGGER trg_wk_exposure_daily_updated_at
  BEFORE UPDATE ON public.wk_exposure_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();