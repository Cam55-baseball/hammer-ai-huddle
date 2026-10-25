CREATE TABLE public._snapshot_stray_test_closeout_20261024 (
 source_table text NOT NULL,
 captured_at timestamptz NOT NULL DEFAULT now(),
 row_data jsonb NOT NULL
);
GRANT ALL ON public._snapshot_stray_test_closeout_20261024 TO service_role;
ALTER TABLE public._snapshot_stray_test_closeout_20261024 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public._snapshot_stray_test_closeout_20261024 IS 'Private owner-authorized before-state snapshot for exact unkept synthetic TEST rows, October 24 23:55 closeout. No client access. Preserve immutable history; never count this archive as live population.';