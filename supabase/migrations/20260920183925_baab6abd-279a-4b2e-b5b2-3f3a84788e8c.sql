CREATE INDEX IF NOT EXISTS advisory_feedback_logs_explanation_id_idx
  ON public.advisory_feedback_logs (explanation_id);

CREATE OR REPLACE FUNCTION public.cleanup_old_explanations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch int;
  v_total int := 0;
  v_batches int := 0;
BEGIN
  LOOP
    WITH d AS (
      DELETE FROM public.hammer_state_explanations_v2
      WHERE id IN (
        SELECT id FROM public.hammer_state_explanations_v2
        WHERE created_at < now() - interval '90 days'
        LIMIT 2000
      )
      RETURNING 1
    )
    SELECT count(*) INTO v_batch FROM d;

    v_total := v_total + v_batch;
    v_batches := v_batches + 1;
    EXIT WHEN v_batch = 0 OR v_batches >= 500;
  END LOOP;

  INSERT INTO public.audit_log (action, table_name, metadata)
  VALUES ('cleanup_old_explanations', 'hammer_state_explanations_v2',
          jsonb_build_object('deleted_count', v_total, 'batches', v_batches, 'retention_days', 90));
END;
$$;