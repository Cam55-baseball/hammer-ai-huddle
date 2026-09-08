ALTER TABLE public.wk_fault_signals DROP CONSTRAINT IF EXISTS wk_fault_signals_discipline_check;
ALTER TABLE public.wk_fault_signals ADD CONSTRAINT wk_fault_signals_discipline_check
  CHECK (discipline IN ('hitting','pitching','throwing','fielding','running','lifting'));

CREATE UNIQUE INDEX IF NOT EXISTS wk_fault_signals_identity_uidx
  ON public.wk_fault_signals (user_id, source, discipline, fault_key, root_pattern_id);

CREATE OR REPLACE FUNCTION public.wk_record_fault_signal_from_finding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discipline text;
BEGIN
  IF NEW.root_pattern_key IS NULL THEN
    RETURN NEW;
  END IF;

  v_discipline := CASE NEW.skill_domain
    WHEN 'hitting' THEN 'hitting'
    WHEN 'pitching' THEN 'pitching'
    WHEN 'throwing' THEN 'throwing'
    WHEN 'fielding' THEN 'fielding'
    WHEN 'running' THEN 'running'
    WHEN 'lifting' THEN 'lifting'
    ELSE NULL
  END;

  IF v_discipline IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wk_fault_signals (
    user_id, source, fault_key, root_pattern_id, discipline,
    confidence, sample_size, severity, evidence, observed_at, engine_version
  ) VALUES (
    NEW.user_id, 'video_analysis', NEW.fault_key, NEW.root_pattern_key, v_discipline,
    0.7, 1, 0.46, COALESCE(NEW.evidence, 'Seen in video analysis.'),
    COALESCE(NEW.created_at, now()), NEW.engine_version
  )
  ON CONFLICT (user_id, source, discipline, fault_key, root_pattern_id)
  DO UPDATE SET
    sample_size = public.wk_fault_signals.sample_size + 1,
    severity = LEAST(1.0, 0.40 + 0.06 * (public.wk_fault_signals.sample_size + 1)),
    observed_at = GREATEST(public.wk_fault_signals.observed_at, EXCLUDED.observed_at),
    evidence = EXCLUDED.evidence,
    engine_version = EXCLUDED.engine_version,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analysis_fault_findings_to_ledger ON public.analysis_fault_findings;
CREATE TRIGGER analysis_fault_findings_to_ledger
AFTER INSERT ON public.analysis_fault_findings
FOR EACH ROW EXECUTE FUNCTION public.wk_record_fault_signal_from_finding();