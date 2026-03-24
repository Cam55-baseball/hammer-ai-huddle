CREATE POLICY "Users can update own skips"
ON public.game_plan_skipped_tasks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);