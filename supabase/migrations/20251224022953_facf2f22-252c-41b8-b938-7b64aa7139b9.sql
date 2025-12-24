-- Create custom_activity_templates table
CREATE TABLE public.custom_activity_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('workout', 'running', 'meal', 'warmup', 'recovery', 'practice', 'short_practice', 'free_session')),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'dumbbell',
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  exercises JSONB DEFAULT '[]'::jsonb,
  meals JSONB DEFAULT '{"items": [], "vitamins": [], "supplements": []}'::jsonb,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  duration_minutes INTEGER,
  intensity TEXT CHECK (intensity IN ('light', 'moderate', 'high', 'max')),
  distance_value NUMERIC,
  distance_unit TEXT DEFAULT 'miles',
  pace_value TEXT,
  intervals JSONB DEFAULT '[]'::jsonb,
  is_favorited BOOLEAN DEFAULT false,
  recurring_days JSONB DEFAULT '[]'::jsonb,
  recurring_active BOOLEAN DEFAULT false,
  sport TEXT NOT NULL DEFAULT 'baseball',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create custom_activity_logs table
CREATE TABLE public.custom_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.custom_activity_templates(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  actual_duration_minutes INTEGER,
  notes TEXT,
  performance_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, template_id, entry_date)
);

-- Enable RLS on both tables
ALTER TABLE public.custom_activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_activity_templates
CREATE POLICY "Users can view own templates"
ON public.custom_activity_templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
ON public.custom_activity_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
ON public.custom_activity_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
ON public.custom_activity_templates
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all templates"
ON public.custom_activity_templates
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS policies for custom_activity_logs
CREATE POLICY "Users can view own logs"
ON public.custom_activity_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
ON public.custom_activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
ON public.custom_activity_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
ON public.custom_activity_logs
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all logs"
ON public.custom_activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create indexes for efficient querying
CREATE INDEX idx_custom_activity_templates_user_id ON public.custom_activity_templates(user_id);
CREATE INDEX idx_custom_activity_templates_favorited ON public.custom_activity_templates(user_id, is_favorited) WHERE is_favorited = true;
CREATE INDEX idx_custom_activity_templates_recurring ON public.custom_activity_templates(user_id, recurring_active) WHERE recurring_active = true;
CREATE INDEX idx_custom_activity_logs_user_date ON public.custom_activity_logs(user_id, entry_date);
CREATE INDEX idx_custom_activity_logs_template ON public.custom_activity_logs(template_id);

-- Add trigger for updated_at
CREATE TRIGGER update_custom_activity_templates_updated_at
BEFORE UPDATE ON public.custom_activity_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();