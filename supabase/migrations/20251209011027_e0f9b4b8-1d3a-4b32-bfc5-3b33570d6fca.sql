
-- The Vault: Private Player Journal - Core Infrastructure
-- Phase 1-3: Database tables with RLS policies

-- 1. Master vault entries table (one per user per day)
CREATE TABLE public.vault_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- 2. Workout notes with weight increase tracking
CREATE TABLE public.vault_workout_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sport TEXT NOT NULL,
  module TEXT NOT NULL,
  sub_module TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  notes TEXT,
  weight_increases JSONB DEFAULT '[]'::jsonb,
  total_weight_lifted NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Nutrition logs
CREATE TABLE public.vault_nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calories INTEGER,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fats_g NUMERIC,
  hydration_oz NUMERIC,
  micros JSONB DEFAULT '{}'::jsonb,
  supplements JSONB DEFAULT '[]'::jsonb,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  digestion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- 4. Focus quizzes (pre-lift, night, morning)
CREATE TABLE public.vault_focus_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('pre_lift', 'night', 'morning')),
  mental_readiness INTEGER NOT NULL CHECK (mental_readiness >= 1 AND mental_readiness <= 5),
  emotional_state INTEGER NOT NULL CHECK (emotional_state >= 1 AND emotional_state <= 5),
  physical_readiness INTEGER NOT NULL CHECK (physical_readiness >= 1 AND physical_readiness <= 5),
  reflection_did_well TEXT,
  reflection_improve TEXT,
  reflection_learned TEXT,
  reflection_motivation TEXT,
  sleep_time TIMESTAMP WITH TIME ZONE,
  wake_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, entry_date, quiz_type)
);

-- 5. Free notes (daily journal)
CREATE TABLE public.vault_free_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- 6. Saved drills from analysis
CREATE TABLE public.vault_saved_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  drill_name TEXT NOT NULL,
  drill_description TEXT,
  module_origin TEXT NOT NULL,
  sport TEXT NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Saved tips from any module
CREATE TABLE public.vault_saved_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tip_text TEXT NOT NULL,
  tip_category TEXT,
  module_origin TEXT NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Scout tool self-grades (20-80 scale)
CREATE TABLE public.vault_scout_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  defense_grade INTEGER CHECK (defense_grade >= 20 AND defense_grade <= 80),
  hitting_grade INTEGER CHECK (hitting_grade >= 20 AND hitting_grade <= 80),
  speed_grade INTEGER CHECK (speed_grade >= 20 AND speed_grade <= 80),
  power_grade INTEGER CHECK (power_grade >= 20 AND power_grade <= 80),
  throwing_grade INTEGER CHECK (throwing_grade >= 20 AND throwing_grade <= 80),
  self_efficacy_grade INTEGER CHECK (self_efficacy_grade >= 20 AND self_efficacy_grade <= 80),
  leadership_grade INTEGER CHECK (leadership_grade >= 20 AND leadership_grade <= 80),
  notes TEXT,
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_prompt_date DATE DEFAULT (CURRENT_DATE + INTERVAL '12 weeks')
);

-- 9. Performance tests (6-week)
CREATE TABLE public.vault_performance_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type TEXT NOT NULL,
  sport TEXT NOT NULL,
  module TEXT NOT NULL,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Progress photos and measurements
CREATE TABLE public.vault_progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  weight_lbs NUMERIC,
  bmi NUMERIC,
  body_fat_percent NUMERIC,
  arm_measurement NUMERIC,
  chest_measurement NUMERIC,
  waist_measurement NUMERIC,
  leg_measurement NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. Vault streaks
CREATE TABLE public.vault_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_entry_date DATE,
  total_entries INTEGER DEFAULT 0,
  nutrition_streak INTEGER DEFAULT 0,
  quiz_streak INTEGER DEFAULT 0,
  journal_streak INTEGER DEFAULT 0,
  badges_earned TEXT[] DEFAULT ARRAY[]::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 12. 6-week recaps
CREATE TABLE public.vault_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recap_period_start DATE NOT NULL,
  recap_period_end DATE NOT NULL,
  recap_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_weight_lifted NUMERIC DEFAULT 0,
  strength_change_percent NUMERIC,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  downloaded_at TIMESTAMP WITH TIME ZONE,
  saved_to_library BOOLEAN DEFAULT false
);

-- Enable RLS on all tables
ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_workout_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_focus_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_free_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_saved_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_saved_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_scout_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_performance_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_recaps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vault_entries
CREATE POLICY "Users can view own entries" ON public.vault_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.vault_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.vault_entries FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for vault_workout_notes
CREATE POLICY "Users can view own workout notes" ON public.vault_workout_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout notes" ON public.vault_workout_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout notes" ON public.vault_workout_notes FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for vault_nutrition_logs
CREATE POLICY "Users can view own nutrition logs" ON public.vault_nutrition_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nutrition logs" ON public.vault_nutrition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nutrition logs" ON public.vault_nutrition_logs FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for vault_focus_quizzes
CREATE POLICY "Users can view own quizzes" ON public.vault_focus_quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quizzes" ON public.vault_focus_quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quizzes" ON public.vault_focus_quizzes FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for vault_free_notes
CREATE POLICY "Users can view own free notes" ON public.vault_free_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own free notes" ON public.vault_free_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own free notes" ON public.vault_free_notes FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for vault_saved_drills
CREATE POLICY "Users can view own saved drills" ON public.vault_saved_drills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved drills" ON public.vault_saved_drills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved drills" ON public.vault_saved_drills FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for vault_saved_tips
CREATE POLICY "Users can view own saved tips" ON public.vault_saved_tips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved tips" ON public.vault_saved_tips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved tips" ON public.vault_saved_tips FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for vault_scout_grades
CREATE POLICY "Users can view own scout grades" ON public.vault_scout_grades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scout grades" ON public.vault_scout_grades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scout grades" ON public.vault_scout_grades FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for vault_performance_tests
CREATE POLICY "Users can view own performance tests" ON public.vault_performance_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own performance tests" ON public.vault_performance_tests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for vault_progress_photos
CREATE POLICY "Users can view own progress photos" ON public.vault_progress_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress photos" ON public.vault_progress_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress photos" ON public.vault_progress_photos FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for vault_streaks
CREATE POLICY "Users can view own streaks" ON public.vault_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.vault_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.vault_streaks FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for vault_recaps
CREATE POLICY "Users can view own recaps" ON public.vault_recaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recaps" ON public.vault_recaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recaps" ON public.vault_recaps FOR UPDATE USING (auth.uid() = user_id);

-- Owners can view all vault data for support
CREATE POLICY "Owners can view all entries" ON public.vault_entries FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all workout notes" ON public.vault_workout_notes FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all nutrition logs" ON public.vault_nutrition_logs FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all quizzes" ON public.vault_focus_quizzes FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all free notes" ON public.vault_free_notes FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all saved drills" ON public.vault_saved_drills FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all saved tips" ON public.vault_saved_tips FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all scout grades" ON public.vault_scout_grades FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all performance tests" ON public.vault_performance_tests FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all progress photos" ON public.vault_progress_photos FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all streaks" ON public.vault_streaks FOR SELECT USING (has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can view all recaps" ON public.vault_recaps FOR SELECT USING (has_role(auth.uid(), 'owner'));

-- Create updated_at trigger for tables that need it
CREATE TRIGGER update_vault_entries_updated_at BEFORE UPDATE ON public.vault_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vault_nutrition_logs_updated_at BEFORE UPDATE ON public.vault_nutrition_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vault_free_notes_updated_at BEFORE UPDATE ON public.vault_free_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vault_streaks_updated_at BEFORE UPDATE ON public.vault_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create private storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public) VALUES ('vault-photos', 'vault-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for vault photos
CREATE POLICY "Users can view own vault photos" ON storage.objects FOR SELECT USING (bucket_id = 'vault-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Users can upload own vault photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vault-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Users can update own vault photos" ON storage.objects FOR UPDATE USING (bucket_id = 'vault-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Users can delete own vault photos" ON storage.objects FOR DELETE USING (bucket_id = 'vault-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
