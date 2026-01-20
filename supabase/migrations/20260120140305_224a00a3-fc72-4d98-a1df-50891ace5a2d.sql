-- Table for weekly recurring skip patterns (NOT date-specific, day-of-week based)
CREATE TABLE public.calendar_skipped_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL,           -- Event/task ID or source identifier
  item_type text NOT NULL,         -- 'game_plan' | 'custom_activity' | 'program' | 'meal' | 'manual' | 'athlete_event'
  skip_days integer[] NOT NULL DEFAULT '{}',    -- Array of day indices [0=Sun, 1=Mon, ..., 6=Sat]
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

-- Enable RLS
ALTER TABLE public.calendar_skipped_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own skipped items" 
  ON public.calendar_skipped_items FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skipped items" 
  ON public.calendar_skipped_items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skipped items" 
  ON public.calendar_skipped_items FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own skipped items" 
  ON public.calendar_skipped_items FOR DELETE 
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_calendar_skipped_items_updated_at
  BEFORE UPDATE ON public.calendar_skipped_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();