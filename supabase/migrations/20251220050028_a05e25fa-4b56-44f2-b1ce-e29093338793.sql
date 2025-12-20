-- Create table for weekly wellness quiz tracking
CREATE TABLE public.vault_weekly_wellness_quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  target_mood_level INTEGER DEFAULT 4 CHECK (target_mood_level >= 1 AND target_mood_level <= 5),
  target_stress_level INTEGER DEFAULT 2 CHECK (target_stress_level >= 1 AND target_stress_level <= 5),
  target_discipline_level INTEGER DEFAULT 4 CHECK (target_discipline_level >= 1 AND target_discipline_level <= 5),
  notification_enabled BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.vault_weekly_wellness_quiz ENABLE ROW LEVEL SECURITY;

-- Users can view their own quiz entries
CREATE POLICY "Users can view own wellness quiz"
ON public.vault_weekly_wellness_quiz
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own quiz entries
CREATE POLICY "Users can insert own wellness quiz"
ON public.vault_weekly_wellness_quiz
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own quiz entries
CREATE POLICY "Users can update own wellness quiz"
ON public.vault_weekly_wellness_quiz
FOR UPDATE
USING (auth.uid() = user_id);

-- Owners can view all quiz entries
CREATE POLICY "Owners can view all wellness quiz"
ON public.vault_weekly_wellness_quiz
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));