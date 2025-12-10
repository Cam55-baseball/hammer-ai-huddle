-- Create vault_favorite_meals table for storing user's favorite meals
CREATE TABLE public.vault_favorite_meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_name TEXT NOT NULL,
  calories INTEGER,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fats_g NUMERIC,
  hydration_oz NUMERIC,
  meal_type TEXT,
  supplements JSONB DEFAULT '[]'::jsonb,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.vault_favorite_meals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorite meals" 
ON public.vault_favorite_meals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite meals" 
ON public.vault_favorite_meals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorite meals" 
ON public.vault_favorite_meals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite meals" 
ON public.vault_favorite_meals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Owners can view all favorite meals
CREATE POLICY "Owners can view all favorite meals" 
ON public.vault_favorite_meals 
FOR SELECT 
USING (has_role(auth.uid(), 'owner'::app_role));