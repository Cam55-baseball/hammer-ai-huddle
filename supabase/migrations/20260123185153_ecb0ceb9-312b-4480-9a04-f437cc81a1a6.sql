-- Create table for personal bests
CREATE TABLE public.tex_vision_personal_bests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  drill_type TEXT NOT NULL,
  tier TEXT NOT NULL,
  best_accuracy_percent DECIMAL(5,2),
  best_reaction_time_ms INTEGER,
  best_streak INTEGER DEFAULT 0,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, drill_type, tier)
);

-- Enable RLS
ALTER TABLE public.tex_vision_personal_bests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own personal bests" 
ON public.tex_vision_personal_bests 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal bests" 
ON public.tex_vision_personal_bests 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal bests" 
ON public.tex_vision_personal_bests 
FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_tex_vision_personal_bests_user_drill 
ON public.tex_vision_personal_bests(user_id, drill_type, tier);