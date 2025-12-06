-- Create table for weekly challenges
CREATE TABLE public.mind_fuel_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_week INTEGER NOT NULL,
  challenge_year INTEGER NOT NULL,
  challenge_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  days_completed INTEGER NOT NULL DEFAULT 0,
  total_days INTEGER NOT NULL DEFAULT 7,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, challenge_week, challenge_year)
);

-- Enable RLS
ALTER TABLE public.mind_fuel_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own challenges"
ON public.mind_fuel_challenges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges"
ON public.mind_fuel_challenges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
ON public.mind_fuel_challenges
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role can insert challenges"
ON public.mind_fuel_challenges
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update challenges"
ON public.mind_fuel_challenges
FOR UPDATE
USING (true);