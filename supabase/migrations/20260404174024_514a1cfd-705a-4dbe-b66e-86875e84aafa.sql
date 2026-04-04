
CREATE TABLE public.hie_execution_locks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rerun_requested BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.hie_execution_locks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.try_acquire_hie_lock(p_user_id UUID, p_stale_seconds INT DEFAULT 120)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rows_inserted INT;
BEGIN
  DELETE FROM hie_execution_locks
  WHERE user_id = p_user_id
    AND locked_at < now() - (p_stale_seconds || ' seconds')::interval;

  INSERT INTO hie_execution_locks (user_id, locked_at, rerun_requested)
  VALUES (p_user_id, now(), false)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted > 0;
END;
$$;
