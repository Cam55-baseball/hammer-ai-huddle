-- Create table for system task display day schedules
CREATE TABLE public.game_plan_task_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  display_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  display_time TEXT,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Enable RLS
ALTER TABLE public.game_plan_task_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own task schedules"
  ON public.game_plan_task_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task schedules"
  ON public.game_plan_task_schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task schedules"
  ON public.game_plan_task_schedule FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own task schedules"
  ON public.game_plan_task_schedule FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_game_plan_task_schedule_updated_at
  BEFORE UPDATE ON public.game_plan_task_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();