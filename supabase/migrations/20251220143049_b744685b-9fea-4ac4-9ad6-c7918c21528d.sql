-- Create table to track Mind Fuel education progress
CREATE TABLE public.mind_fuel_education_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  education_type TEXT NOT NULL, -- 'basics', 'topics', 'sleep', 'boundaries'
  item_id TEXT NOT NULL,        -- specific item like 'what-is', 'anxiety', etc.
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, education_type, item_id)
);

-- Enable RLS
ALTER TABLE public.mind_fuel_education_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own education progress
CREATE POLICY "Users can view own education progress"
ON public.mind_fuel_education_progress
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own education progress
CREATE POLICY "Users can insert own education progress"
ON public.mind_fuel_education_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own education progress
CREATE POLICY "Users can delete own education progress"
ON public.mind_fuel_education_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Owners can view all education progress
CREATE POLICY "Owners can view all education progress"
ON public.mind_fuel_education_progress
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));