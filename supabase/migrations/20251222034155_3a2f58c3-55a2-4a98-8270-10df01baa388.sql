-- Add 'tex_vision' to module_type enum if needed (skip if exists)
-- ALTER TYPE module_type ADD VALUE IF NOT EXISTS 'tex_vision';

-- Table 1: tex_vision_progress - User progress tracking
CREATE TABLE public.tex_vision_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport TEXT NOT NULL,
  current_tier TEXT DEFAULT 'beginner' CHECK (current_tier IN ('beginner', 'advanced', 'chaos')),
  total_sessions_completed INTEGER DEFAULT 0,
  streak_current INTEGER DEFAULT 0,
  streak_longest INTEGER DEFAULT 0,
  last_session_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sport)
);

-- Table 2: tex_vision_sessions - Individual training sessions
CREATE TABLE public.tex_vision_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport TEXT NOT NULL,
  session_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  drills_completed INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fatigue_ended BOOLEAN DEFAULT FALSE,
  reflection_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: tex_vision_drill_results - Per-drill performance metrics
CREATE TABLE public.tex_vision_drill_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.tex_vision_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  drill_type TEXT NOT NULL,
  tier TEXT NOT NULL,
  accuracy_percent DECIMAL(5,2),
  reaction_time_ms INTEGER,
  false_positives INTEGER DEFAULT 0,
  drill_metrics JSONB,
  fatigue_score INTEGER,
  difficulty_level INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: tex_vision_daily_checklist - Daily checklist completion
CREATE TABLE public.tex_vision_daily_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  checklist_items JSONB NOT NULL DEFAULT '{}'::jsonb,
  all_complete BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

-- Table 5: tex_vision_metrics - Aggregated performance metrics
CREATE TABLE public.tex_vision_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport TEXT NOT NULL,
  neuro_reaction_index DECIMAL(5,2),
  visual_processing_speed DECIMAL(5,2),
  anticipation_quotient DECIMAL(5,2),
  coordination_efficiency DECIMAL(5,2),
  stress_resilience_score DECIMAL(5,2),
  left_right_bias DECIMAL(3,2),
  early_late_bias DECIMAL(3,2),
  metrics_history JSONB,
  plateau_detected_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sport)
);

-- Table 6: tex_vision_s2_diagnostics - S2 Cognition diagnostic tests
CREATE TABLE public.tex_vision_s2_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport TEXT NOT NULL,
  test_date DATE NOT NULL,
  processing_speed_score DECIMAL(5,2),
  decision_efficiency_score DECIMAL(5,2),
  visual_motor_integration_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  comparison_vs_prior JSONB,
  next_test_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 7: tex_vision_unlocks - Tier/progression unlocks
CREATE TABLE public.tex_vision_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport TEXT NOT NULL,
  unlock_type TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sport, unlock_type)
);

-- Table 8: tex_vision_adaptive_difficulty - Adaptive difficulty state
CREATE TABLE public.tex_vision_adaptive_difficulty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sport TEXT NOT NULL,
  drill_type TEXT NOT NULL,
  current_difficulty INTEGER DEFAULT 1,
  accuracy_history JSONB,
  speed_history JSONB,
  recommended_adjustment TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sport, drill_type)
);

-- Enable RLS on all tables
ALTER TABLE public.tex_vision_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tex_vision_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tex_vision_drill_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tex_vision_daily_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tex_vision_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tex_vision_s2_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tex_vision_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tex_vision_adaptive_difficulty ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tex_vision_progress
CREATE POLICY "Users can view own progress" ON public.tex_vision_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.tex_vision_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.tex_vision_progress
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can view all progress" ON public.tex_vision_progress
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for tex_vision_sessions
CREATE POLICY "Users can view own sessions" ON public.tex_vision_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.tex_vision_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.tex_vision_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can view all sessions" ON public.tex_vision_sessions
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for tex_vision_drill_results
CREATE POLICY "Users can view own drill results" ON public.tex_vision_drill_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drill results" ON public.tex_vision_drill_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can view all drill results" ON public.tex_vision_drill_results
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for tex_vision_daily_checklist
CREATE POLICY "Users can view own checklist" ON public.tex_vision_daily_checklist
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checklist" ON public.tex_vision_daily_checklist
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checklist" ON public.tex_vision_daily_checklist
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can view all checklists" ON public.tex_vision_daily_checklist
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for tex_vision_metrics
CREATE POLICY "Users can view own metrics" ON public.tex_vision_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics" ON public.tex_vision_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON public.tex_vision_metrics
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can view all metrics" ON public.tex_vision_metrics
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for tex_vision_s2_diagnostics
CREATE POLICY "Users can view own diagnostics" ON public.tex_vision_s2_diagnostics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own diagnostics" ON public.tex_vision_s2_diagnostics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can view all diagnostics" ON public.tex_vision_s2_diagnostics
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for tex_vision_unlocks
CREATE POLICY "Users can view own unlocks" ON public.tex_vision_unlocks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own unlocks" ON public.tex_vision_unlocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can view all unlocks" ON public.tex_vision_unlocks
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for tex_vision_adaptive_difficulty
CREATE POLICY "Users can view own difficulty" ON public.tex_vision_adaptive_difficulty
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own difficulty" ON public.tex_vision_adaptive_difficulty
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own difficulty" ON public.tex_vision_adaptive_difficulty
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can view all difficulty" ON public.tex_vision_adaptive_difficulty
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- Create updated_at trigger for tables that need it
CREATE TRIGGER update_tex_vision_progress_updated_at
  BEFORE UPDATE ON public.tex_vision_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tex_vision_metrics_updated_at
  BEFORE UPDATE ON public.tex_vision_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tex_vision_adaptive_difficulty_updated_at
  BEFORE UPDATE ON public.tex_vision_adaptive_difficulty
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();