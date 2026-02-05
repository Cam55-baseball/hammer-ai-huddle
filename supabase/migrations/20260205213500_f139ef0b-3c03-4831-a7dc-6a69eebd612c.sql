-- =====================================================
-- ELITE WORKOUT & RUNNING CARD SYSTEM - PHASE 1
-- 4 New Tables: workout_blocks, workout_presets, 
-- athlete_load_tracking, running_sessions
-- =====================================================

-- 1. WORKOUT BLOCKS TABLE
-- Stores individual blocks within a workout template
CREATE TABLE public.workout_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.custom_activity_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'custom',
  order_index INTEGER NOT NULL DEFAULT 0,
  block_type TEXT NOT NULL DEFAULT 'custom',
  is_custom BOOLEAN DEFAULT false,
  exercises JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_blocks
CREATE POLICY "Users can view their own workout blocks"
  ON public.workout_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout blocks"
  ON public.workout_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout blocks"
  ON public.workout_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout blocks"
  ON public.workout_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_workout_blocks_template ON public.workout_blocks(template_id);
CREATE INDEX idx_workout_blocks_user ON public.workout_blocks(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_workout_blocks_updated_at
  BEFORE UPDATE ON public.workout_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. WORKOUT PRESETS TABLE
-- System IP (Hammers) + User-created presets
-- =====================================================

CREATE TABLE public.workout_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- NULL for system presets
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT DEFAULT 'intermediate',
  sport TEXT DEFAULT 'both',
  preset_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_duration_minutes INTEGER,
  cns_load_estimate INTEGER,
  fascial_bias JSONB DEFAULT '{"compression": 0, "elastic": 0, "glide": 0}'::jsonb,
  is_system BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_presets
-- Everyone can view system presets
CREATE POLICY "Anyone can view system presets"
  ON public.workout_presets FOR SELECT
  USING (is_system = true);

-- Users can view their own presets
CREATE POLICY "Users can view their own presets"
  ON public.workout_presets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own presets (not system)
CREATE POLICY "Users can create their own presets"
  ON public.workout_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can update their own non-locked presets
CREATE POLICY "Users can update their own presets"
  ON public.workout_presets FOR UPDATE
  USING (auth.uid() = user_id AND is_locked = false);

-- Users can delete their own non-system presets
CREATE POLICY "Users can delete their own presets"
  ON public.workout_presets FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- Index for faster queries
CREATE INDEX idx_workout_presets_user ON public.workout_presets(user_id);
CREATE INDEX idx_workout_presets_category ON public.workout_presets(category);
CREATE INDEX idx_workout_presets_system ON public.workout_presets(is_system);

-- =====================================================
-- 3. ATHLETE LOAD TRACKING TABLE
-- Daily/weekly CNS and fascial load metrics
-- =====================================================

CREATE TABLE public.athlete_load_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cns_load_total INTEGER DEFAULT 0,
  fascial_load JSONB DEFAULT '{"compression": 0, "elastic": 0, "glide": 0}'::jsonb,
  volume_load INTEGER DEFAULT 0,
  intensity_avg DECIMAL(5,2),
  recovery_debt INTEGER DEFAULT 0,
  workout_ids UUID[] DEFAULT '{}'::uuid[],
  running_ids UUID[] DEFAULT '{}'::uuid[],
  overlap_warnings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Enable RLS
ALTER TABLE public.athlete_load_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for athlete_load_tracking
CREATE POLICY "Users can view their own load tracking"
  ON public.athlete_load_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own load tracking"
  ON public.athlete_load_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own load tracking"
  ON public.athlete_load_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own load tracking"
  ON public.athlete_load_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_athlete_load_user_date ON public.athlete_load_tracking(user_id, entry_date);

-- Trigger for updated_at
CREATE TRIGGER update_athlete_load_tracking_updated_at
  BEFORE UPDATE ON public.athlete_load_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. RUNNING SESSIONS TABLE
-- Rebuilt running card with intent layer
-- =====================================================

CREATE TABLE public.running_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.custom_activity_templates(id) ON DELETE SET NULL,
  
  -- Core Fields
  run_type TEXT NOT NULL DEFAULT 'tempo',
  intent TEXT NOT NULL DEFAULT 'submax',
  title TEXT,
  
  -- Structure (choose one primary metric)
  distance_value DECIMAL(10,2),
  distance_unit TEXT DEFAULT 'yards',
  time_goal TEXT,
  reps INTEGER,
  contacts INTEGER,
  
  -- Context Toggles
  surface TEXT,
  shoe_type TEXT,
  fatigue_state TEXT DEFAULT 'fresh',
  environment_notes TEXT,
  pre_run_stiffness INTEGER,
  
  -- Intervals (for structured workouts)
  intervals JSONB DEFAULT '[]'::jsonb,
  
  -- Load Metrics (calculated)
  cns_load INTEGER,
  ground_contacts_total INTEGER,
  
  -- Metadata
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  actual_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.running_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for running_sessions
CREATE POLICY "Users can view their own running sessions"
  ON public.running_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own running sessions"
  ON public.running_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own running sessions"
  ON public.running_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own running sessions"
  ON public.running_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX idx_running_sessions_user ON public.running_sessions(user_id);
CREATE INDEX idx_running_sessions_template ON public.running_sessions(template_id);
CREATE INDEX idx_running_sessions_type ON public.running_sessions(run_type);

-- Trigger for updated_at
CREATE TRIGGER update_running_sessions_updated_at
  BEFORE UPDATE ON public.running_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();