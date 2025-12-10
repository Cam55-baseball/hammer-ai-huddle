-- Create vault_nutrition_goals table for macro goal tracking
CREATE TABLE public.vault_nutrition_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calorie_goal INTEGER DEFAULT 2000,
  protein_goal INTEGER DEFAULT 150,
  carbs_goal INTEGER DEFAULT 250,
  fats_goal INTEGER DEFAULT 70,
  hydration_goal INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.vault_nutrition_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own goals" ON public.vault_nutrition_goals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON public.vault_nutrition_goals
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.vault_nutrition_goals
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all goals" ON public.vault_nutrition_goals
FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));