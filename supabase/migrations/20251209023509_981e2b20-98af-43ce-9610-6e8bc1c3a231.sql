-- Add DELETE RLS policies for vault tables

-- vault_focus_quizzes
CREATE POLICY "Users can delete own quizzes" 
ON public.vault_focus_quizzes FOR DELETE 
USING (auth.uid() = user_id);

-- vault_free_notes
CREATE POLICY "Users can delete own free notes" 
ON public.vault_free_notes FOR DELETE 
USING (auth.uid() = user_id);

-- vault_workout_notes
CREATE POLICY "Users can delete own workout notes" 
ON public.vault_workout_notes FOR DELETE 
USING (auth.uid() = user_id);

-- vault_nutrition_logs
CREATE POLICY "Users can delete own nutrition logs" 
ON public.vault_nutrition_logs FOR DELETE 
USING (auth.uid() = user_id);

-- vault_performance_tests
CREATE POLICY "Users can delete own performance tests" 
ON public.vault_performance_tests FOR DELETE 
USING (auth.uid() = user_id);

-- vault_progress_photos
CREATE POLICY "Users can delete own progress photos" 
ON public.vault_progress_photos FOR DELETE 
USING (auth.uid() = user_id);

-- vault_scout_grades
CREATE POLICY "Users can delete own scout grades" 
ON public.vault_scout_grades FOR DELETE 
USING (auth.uid() = user_id);