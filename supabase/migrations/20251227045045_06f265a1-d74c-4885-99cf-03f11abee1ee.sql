-- Create nutrition_recipes table for storing user recipes
CREATE TABLE public.nutrition_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  servings INTEGER NOT NULL DEFAULT 1,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_calories INTEGER,
  total_protein_g NUMERIC,
  total_carbs_g NUMERIC,
  total_fats_g NUMERIC,
  total_fiber_g NUMERIC,
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_recipes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own recipes"
  ON public.nutrition_recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON public.nutrition_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON public.nutrition_recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON public.nutrition_recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_nutrition_recipes_user_id ON public.nutrition_recipes(user_id);
CREATE INDEX idx_nutrition_recipes_favorite ON public.nutrition_recipes(user_id, is_favorite) WHERE is_favorite = true;