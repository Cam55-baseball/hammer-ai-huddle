-- Create table for week-specific overrides of locked schedules
CREATE TABLE public.game_plan_week_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  week_start DATE NOT NULL,
  override_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_of_week, week_start)
);

-- Enable RLS
ALTER TABLE public.game_plan_week_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own week overrides"
  ON public.game_plan_week_overrides
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own week overrides"
  ON public.game_plan_week_overrides
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own week overrides"
  ON public.game_plan_week_overrides
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own week overrides"
  ON public.game_plan_week_overrides
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_game_plan_week_overrides_updated_at
  BEFORE UPDATE ON public.game_plan_week_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();