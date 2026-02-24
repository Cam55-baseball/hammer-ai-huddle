
-- Gap #4: Drop stale RLS policy
DROP POLICY IF EXISTS "Users can select own MPI scores" ON public.mpi_scores;

-- Gap #3: Prevent duplicate daily entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_mpi_unique_daily
ON public.mpi_scores (user_id, sport, calculation_date);

-- Gap #2: Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mpi_scores;

-- Gap #6: Add composite index for query performance
CREATE INDEX IF NOT EXISTS idx_mpi_sport_date_rank
ON public.mpi_scores (sport, calculation_date, global_rank);
