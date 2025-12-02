-- Create nutrition_streaks table for tracking user engagement
CREATE TABLE public.nutrition_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_visit_date DATE,
  total_visits INTEGER NOT NULL DEFAULT 0,
  tips_collected INTEGER NOT NULL DEFAULT 0,
  badges_earned TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_streaks ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak data
CREATE POLICY "Users can view their own streak" 
ON public.nutrition_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own streak data
CREATE POLICY "Users can insert their own streak" 
ON public.nutrition_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own streak data
CREATE POLICY "Users can update their own streak" 
ON public.nutrition_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_nutrition_streaks_user_id ON public.nutrition_streaks(user_id);