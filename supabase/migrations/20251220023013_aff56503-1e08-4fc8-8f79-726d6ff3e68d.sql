-- Create wellness goals table for storing user targets
CREATE TABLE public.vault_wellness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_mood_level INTEGER CHECK (target_mood_level >= 1 AND target_mood_level <= 5) DEFAULT 4,
  target_stress_level INTEGER CHECK (target_stress_level >= 1 AND target_stress_level <= 5) DEFAULT 2,
  target_discipline_level INTEGER CHECK (target_discipline_level >= 1 AND target_discipline_level <= 5) DEFAULT 4,
  notification_enabled BOOLEAN DEFAULT true,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable Row Level Security
ALTER TABLE public.vault_wellness_goals ENABLE ROW LEVEL SECURITY;

-- Users can view their own wellness goals
CREATE POLICY "Users can view own wellness goals"
ON public.vault_wellness_goals
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own wellness goals
CREATE POLICY "Users can insert own wellness goals"
ON public.vault_wellness_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own wellness goals
CREATE POLICY "Users can update own wellness goals"
ON public.vault_wellness_goals
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own wellness goals
CREATE POLICY "Users can delete own wellness goals"
ON public.vault_wellness_goals
FOR DELETE
USING (auth.uid() = user_id);

-- Owners can view all wellness goals
CREATE POLICY "Owners can view all wellness goals"
ON public.vault_wellness_goals
FOR SELECT
USING (public.has_role(auth.uid(), 'owner'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vault_wellness_goals_updated_at
BEFORE UPDATE ON public.vault_wellness_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();