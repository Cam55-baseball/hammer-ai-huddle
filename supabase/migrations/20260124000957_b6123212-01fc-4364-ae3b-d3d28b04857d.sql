-- Create table for caching daily drill selections
CREATE TABLE public.tex_vision_daily_drill_selection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport TEXT NOT NULL DEFAULT 'baseball',
  selection_date DATE NOT NULL,
  selected_drills JSONB NOT NULL,
  selection_reasons JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sport, selection_date)
);

-- Enable RLS
ALTER TABLE public.tex_vision_daily_drill_selection ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own selections
CREATE POLICY "Users can view own daily selections"
  ON public.tex_vision_daily_drill_selection
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily selections"
  ON public.tex_vision_daily_drill_selection
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily selections"
  ON public.tex_vision_daily_drill_selection
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily selections"
  ON public.tex_vision_daily_drill_selection
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_daily_drill_selection_user_date 
  ON public.tex_vision_daily_drill_selection(user_id, sport, selection_date);