CREATE POLICY "Athletes delete their own standard attempts"
ON public.wk_standard_attempts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);