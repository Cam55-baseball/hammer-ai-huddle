-- Create user_food_history table for tracking recent and favorite foods
CREATE TABLE public.user_food_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  food_id UUID NOT NULL REFERENCES public.nutrition_food_database(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, food_id)
);

-- Enable RLS
ALTER TABLE public.user_food_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own food history"
ON public.user_food_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food history"
ON public.user_food_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food history"
ON public.user_food_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food history"
ON public.user_food_history FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for efficient queries
CREATE INDEX idx_user_food_history_recent ON public.user_food_history(user_id, last_used_at DESC);
CREATE INDEX idx_user_food_history_favorites ON public.user_food_history(user_id, is_favorite) WHERE is_favorite = true;