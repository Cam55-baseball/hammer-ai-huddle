-- Create table for storing locked day schedules
CREATE TABLE public.game_plan_locked_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  locked_at TIMESTAMPTZ DEFAULT now(),
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.game_plan_locked_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own locked days"
ON public.game_plan_locked_days
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own locked days"
ON public.game_plan_locked_days
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own locked days"
ON public.game_plan_locked_days
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own locked days"
ON public.game_plan_locked_days
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_game_plan_locked_days_updated_at
BEFORE UPDATE ON public.game_plan_locked_days
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();