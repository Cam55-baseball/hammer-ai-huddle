-- Create sub_module_progress table for tracking workout progress
CREATE TABLE public.sub_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('baseball', 'softball')),
  module TEXT NOT NULL CHECK (module IN ('hitting', 'pitching')),
  sub_module TEXT NOT NULL CHECK (sub_module IN ('production_lab', 'production_studio')),
  current_week INTEGER DEFAULT 1 CHECK (current_week >= 1 AND current_week <= 6),
  week_progress JSONB DEFAULT '{}',
  equipment_checklist JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sport, module, sub_module)
);

-- Enable RLS
ALTER TABLE public.sub_module_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view own progress" ON public.sub_module_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress" ON public.sub_module_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress" ON public.sub_module_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_sub_module_progress_updated_at
  BEFORE UPDATE ON public.sub_module_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();