-- Drop the restrictive SELECT policy and add a public one for rankings
DROP POLICY IF EXISTS "Users can view own MPI scores" ON public.mpi_scores;

CREATE POLICY "Authenticated users can view all rankings"
ON public.mpi_scores
FOR SELECT
TO authenticated
USING (true);
