-- Create mind_fuel_daily_tasks table for tracking daily mental training completion
CREATE TABLE public.mind_fuel_daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_id TEXT NOT NULL CHECK (task_id IN ('daily_lesson', 'mindfulness', 'journal', 'emotion_checkin', 'weekly_challenge')),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, task_date, task_id)
);

-- Enable RLS
ALTER TABLE public.mind_fuel_daily_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tasks
CREATE POLICY "Users can view own tasks" ON public.mind_fuel_daily_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.mind_fuel_daily_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.mind_fuel_daily_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Owners can view all tasks for analytics
CREATE POLICY "Owners can view all tasks" ON public.mind_fuel_daily_tasks
  FOR SELECT USING (public.has_role(auth.uid(), 'owner'));

-- Index for fast date-based queries
CREATE INDEX idx_mind_fuel_daily_tasks_user_date ON public.mind_fuel_daily_tasks(user_id, task_date);