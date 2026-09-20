CREATE TABLE public.tcs_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  tier text NOT NULL CHECK (tier IN ('fast','full')),
  seasons integer NOT NULL DEFAULT 0,
  days_checked bigint NOT NULL DEFAULT 0,
  deep_checks bigint NOT NULL DEFAULT 0,
  violations_count integer NOT NULL DEFAULT 0,
  first_violations jsonb NOT NULL DEFAULT '[]'::jsonb,
  seed bigint NOT NULL,
  git_sha text,
  config_hash text,
  thresholds_hash text,
  duration_seconds numeric,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','passed','failed','error')),
  chunks_total integer NOT NULL DEFAULT 0,
  chunks_done integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tcs_test_run_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.tcs_test_runs(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  seed bigint NOT NULL,
  seasons integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','error')),
  days_checked bigint NOT NULL DEFAULT 0,
  deep_checks bigint NOT NULL DEFAULT 0,
  violations_count integer NOT NULL DEFAULT 0,
  violations jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds numeric,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, chunk_index)
);

CREATE INDEX idx_tcs_test_runs_run_at ON public.tcs_test_runs (run_at DESC);
CREATE INDEX idx_tcs_chunks_pending ON public.tcs_test_run_chunks (run_id, status, chunk_index);

GRANT SELECT ON public.tcs_test_runs TO authenticated;
GRANT ALL ON public.tcs_test_runs TO service_role;
GRANT SELECT ON public.tcs_test_run_chunks TO authenticated;
GRANT ALL ON public.tcs_test_run_chunks TO service_role;

ALTER TABLE public.tcs_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tcs_test_run_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read TCS test runs"
ON public.tcs_test_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read TCS test run chunks"
ON public.tcs_test_run_chunks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tcs_test_runs_updated_at
BEFORE UPDATE ON public.tcs_test_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Claim the next pending chunk for a run (concurrency-safe pull model).
CREATE OR REPLACE FUNCTION public.claim_tcs_chunk(_run_id uuid)
RETURNS public.tcs_test_run_chunks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.tcs_test_run_chunks;
BEGIN
  SELECT * INTO _c
  FROM public.tcs_test_run_chunks
  WHERE run_id = _run_id AND status = 'pending'
  ORDER BY chunk_index
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.tcs_test_run_chunks
  SET status = 'running', started_at = now()
  WHERE id = _c.id
  RETURNING * INTO _c;

  RETURN _c;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_tcs_chunk(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_tcs_chunk(uuid) TO service_role;

-- Roll finished chunks up into the run row.
CREATE OR REPLACE FUNCTION public.finalize_tcs_run(_run_id uuid)
RETURNS public.tcs_test_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _run public.tcs_test_runs;
  _pending integer;
  _errors integer;
BEGIN
  SELECT count(*) FILTER (WHERE status IN ('pending','running')),
         count(*) FILTER (WHERE status = 'error')
    INTO _pending, _errors
  FROM public.tcs_test_run_chunks WHERE run_id = _run_id;

  UPDATE public.tcs_test_runs r
  SET seasons = c.seasons,
      days_checked = c.days_checked,
      deep_checks = c.deep_checks,
      violations_count = c.violations_count,
      first_violations = c.first_violations,
      chunks_done = c.done,
      duration_seconds = EXTRACT(EPOCH FROM (now() - r.run_at)),
      status = CASE
        WHEN _pending > 0 THEN 'running'
        WHEN _errors > 0 THEN 'error'
        WHEN c.violations_count > 0 THEN 'failed'
        ELSE 'passed' END
  FROM (
    SELECT coalesce(sum(seasons),0)::int AS seasons,
           coalesce(sum(days_checked),0)::bigint AS days_checked,
           coalesce(sum(deep_checks),0)::bigint AS deep_checks,
           coalesce(sum(violations_count),0)::int AS violations_count,
           coalesce((SELECT jsonb_agg(v) FROM (
             SELECT jsonb_array_elements(violations) AS v
             FROM public.tcs_test_run_chunks
             WHERE run_id = _run_id AND violations <> '[]'::jsonb
             ORDER BY chunk_index LIMIT 20) s), '[]'::jsonb) AS first_violations,
           count(*) FILTER (WHERE status = 'done')::int AS done
    FROM public.tcs_test_run_chunks WHERE run_id = _run_id AND status = 'done'
  ) c
  WHERE r.id = _run_id
  RETURNING r.* INTO _run;

  RETURN _run;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_tcs_run(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_tcs_run(uuid) TO service_role;