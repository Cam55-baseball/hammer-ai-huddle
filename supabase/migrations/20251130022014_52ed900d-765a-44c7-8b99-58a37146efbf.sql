-- Create workout programs table for sub-module training plans
CREATE TABLE public.workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_module TEXT NOT NULL,
  sub_module TEXT NOT NULL,
  sport TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_module, sub_module, sport, block_number)
);

-- Create workout templates table for individual workout definitions
CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  workout_type TEXT NOT NULL,
  day_in_cycle INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_needed TEXT[],
  estimated_duration_minutes INTEGER,
  experience_level TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user workout progress table
CREATE TABLE public.user_workout_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  parent_module TEXT NOT NULL,
  sub_module TEXT NOT NULL,
  sport TEXT NOT NULL,
  current_block INTEGER DEFAULT 1,
  block_start_date DATE NOT NULL,
  current_day_in_block INTEGER DEFAULT 1,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  total_workouts_completed INTEGER DEFAULT 0,
  experience_level TEXT DEFAULT 'beginner',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, parent_module, sub_module, sport)
);

-- Create workout completions table
CREATE TABLE public.workout_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  progress_id UUID REFERENCES public.user_workout_progress(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'scheduled',
  exercise_logs JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create workout equipment table
CREATE TABLE public.workout_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_module TEXT NOT NULL,
  sport TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  category TEXT,
  purchase_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_programs (public read)
CREATE POLICY "Anyone can view workout programs"
ON public.workout_programs
FOR SELECT
USING (true);

-- RLS Policies for workout_templates (public read)
CREATE POLICY "Anyone can view workout templates"
ON public.workout_templates
FOR SELECT
USING (true);

-- RLS Policies for user_workout_progress
CREATE POLICY "Users can view their own workout progress"
ON public.user_workout_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout progress"
ON public.user_workout_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout progress"
ON public.user_workout_progress
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all workout progress"
ON public.user_workout_progress
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for workout_completions
CREATE POLICY "Users can view their own workout completions"
ON public.workout_completions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout completions"
ON public.workout_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout completions"
ON public.workout_completions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all workout completions"
ON public.workout_completions
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for workout_equipment (public read)
CREATE POLICY "Anyone can view workout equipment"
ON public.workout_equipment
FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_workout_templates_program_id ON public.workout_templates(program_id);
CREATE INDEX idx_workout_templates_day_in_cycle ON public.workout_templates(day_in_cycle);
CREATE INDEX idx_user_workout_progress_user_id ON public.user_workout_progress(user_id);
CREATE INDEX idx_user_workout_progress_sport_module ON public.user_workout_progress(sport, parent_module, sub_module);
CREATE INDEX idx_workout_completions_user_id ON public.workout_completions(user_id);
CREATE INDEX idx_workout_completions_scheduled_date ON public.workout_completions(scheduled_date);
CREATE INDEX idx_workout_completions_status ON public.workout_completions(status);
CREATE INDEX idx_workout_equipment_sub_module_sport ON public.workout_equipment(sub_module, sport);