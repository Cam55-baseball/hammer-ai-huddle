-- Add columns to custom_activity_logs for timeline features
ALTER TABLE public.custom_activity_logs 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS start_time time DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reminder_minutes integer DEFAULT NULL;

-- Create timeline schedule templates table
CREATE TABLE IF NOT EXISTS public.timeline_schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Schedule',
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timeline_schedule_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own templates" 
ON public.timeline_schedule_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.timeline_schedule_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.timeline_schedule_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.timeline_schedule_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_timeline_schedule_templates_updated_at
BEFORE UPDATE ON public.timeline_schedule_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_timeline_schedule_templates_user_id 
ON public.timeline_schedule_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_timeline_schedule_templates_is_default 
ON public.timeline_schedule_templates(user_id, is_default) 
WHERE is_default = true;