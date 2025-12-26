-- Table for daily skips (load management)
CREATE TABLE public.game_plan_skipped_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id text NOT NULL,
  skip_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, task_id, skip_date)
);

-- Enable RLS
ALTER TABLE public.game_plan_skipped_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own skips" 
ON public.game_plan_skipped_tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skips" 
ON public.game_plan_skipped_tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skips" 
ON public.game_plan_skipped_tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- New columns for schedule settings on templates
ALTER TABLE public.custom_activity_templates
ADD COLUMN IF NOT EXISTS display_on_game_plan boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS display_days integer[] DEFAULT ARRAY[0,1,2,3,4,5,6],
ADD COLUMN IF NOT EXISTS display_time time without time zone;