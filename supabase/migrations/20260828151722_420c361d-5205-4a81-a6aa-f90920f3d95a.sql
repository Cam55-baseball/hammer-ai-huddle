ALTER TABLE public.defensive_plays
  ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS defensive_plays_recorded_by_idx
  ON public.defensive_plays (recorded_by);

CREATE POLICY "Evaluators can log defensive plays for athletes"
ON public.defensive_plays
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_active_evaluator_role(auth.uid())
  AND recorded_by = auth.uid()
  AND user_id <> auth.uid()
  AND source = 'manual_entry'
);

CREATE POLICY "Evaluators can read defensive plays they filed"
ON public.defensive_plays
FOR SELECT
TO authenticated
USING (recorded_by = auth.uid());