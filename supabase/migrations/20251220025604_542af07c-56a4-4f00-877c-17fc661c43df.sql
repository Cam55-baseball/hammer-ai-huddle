-- Mental Health Prompts Library (system-managed content)
CREATE TABLE public.mental_health_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'deep')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mental Health Journal Entries (separate from Vault)
CREATE TABLE public.mental_health_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('free', 'prompted', 'thought_log', 'gratitude', 'reflection')),
  title TEXT,
  content TEXT NOT NULL,
  emotion_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  mood_level INTEGER CHECK (mood_level >= 1 AND mood_level <= 5),
  is_private BOOLEAN DEFAULT true,
  prompt_id UUID REFERENCES public.mental_health_prompts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Emotion Tracking & Triggers
CREATE TABLE public.emotion_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  emotion TEXT NOT NULL,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
  trigger_category TEXT,
  trigger_description TEXT,
  grounding_technique_used TEXT,
  action_taken TEXT,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stress & Burnout Assessments
CREATE TABLE public.stress_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('stress', 'burnout', 'anxiety')),
  score INTEGER NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'moderate', 'high', 'severe')),
  responses JSONB DEFAULT '{}'::JSONB,
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  assessment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mindfulness & Meditation Sessions
CREATE TABLE public.mindfulness_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('meditation', 'breathwork', 'body_scan', 'grounding')),
  technique TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5),
  notes TEXT,
  session_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cognitive Thought Logs (CBT-style)
CREATE TABLE public.thought_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  situation TEXT NOT NULL,
  automatic_thought TEXT NOT NULL,
  emotions TEXT[] DEFAULT ARRAY[]::TEXT[],
  emotion_intensity INTEGER CHECK (emotion_intensity >= 1 AND emotion_intensity <= 10),
  cognitive_distortion TEXT[] DEFAULT ARRAY[]::TEXT[],
  evidence_for TEXT,
  evidence_against TEXT,
  balanced_thought TEXT,
  outcome_emotion TEXT,
  outcome_intensity INTEGER CHECK (outcome_intensity >= 1 AND outcome_intensity <= 10),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wellness Progress & Milestones
CREATE TABLE public.wellness_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  milestone_type TEXT NOT NULL,
  milestone_value INTEGER NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  celebrated BOOLEAN DEFAULT false
);

-- User Wellness Preferences
CREATE TABLE public.wellness_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  onboarding_completed BOOLEAN DEFAULT false,
  wellness_goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferred_intensity TEXT DEFAULT 'moderate' CHECK (preferred_intensity IN ('gentle', 'moderate', 'intensive')),
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIME,
  themes_explored TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.mental_health_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mental_health_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stress_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mindfulness_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mental_health_prompts (public read, admin write)
CREATE POLICY "Authenticated users can view prompts" ON public.mental_health_prompts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can manage prompts" ON public.mental_health_prompts
  FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for mental_health_journal
CREATE POLICY "Users can view own journal" ON public.mental_health_journal
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal" ON public.mental_health_journal
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal" ON public.mental_health_journal
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal" ON public.mental_health_journal
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all journals" ON public.mental_health_journal
  FOR SELECT USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for emotion_tracking
CREATE POLICY "Users can view own emotions" ON public.emotion_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emotions" ON public.emotion_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emotions" ON public.emotion_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emotions" ON public.emotion_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for stress_assessments
CREATE POLICY "Users can view own assessments" ON public.stress_assessments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments" ON public.stress_assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assessments" ON public.stress_assessments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mindfulness_sessions
CREATE POLICY "Users can view own sessions" ON public.mindfulness_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.mindfulness_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.mindfulness_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.mindfulness_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for thought_logs
CREATE POLICY "Users can view own thought logs" ON public.thought_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own thought logs" ON public.thought_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own thought logs" ON public.thought_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own thought logs" ON public.thought_logs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for wellness_milestones
CREATE POLICY "Users can view own milestones" ON public.wellness_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones" ON public.wellness_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own milestones" ON public.wellness_milestones
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for wellness_preferences
CREATE POLICY "Users can view own preferences" ON public.wellness_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.wellness_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.wellness_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger for tables that need it
CREATE TRIGGER update_mental_health_journal_updated_at
  BEFORE UPDATE ON public.mental_health_journal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wellness_preferences_updated_at
  BEFORE UPDATE ON public.wellness_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial prompts for the journal
INSERT INTO public.mental_health_prompts (category, prompt_text, difficulty_level) VALUES
('gratitude', 'What are three things you are grateful for today?', 'beginner'),
('gratitude', 'Who is someone that made a positive impact on your life recently?', 'beginner'),
('self_reflection', 'What emotion have you been avoiding, and why?', 'intermediate'),
('self_reflection', 'What would you tell your younger self about handling difficult emotions?', 'deep'),
('anxiety', 'What is one worry you can let go of today?', 'beginner'),
('anxiety', 'Describe a time when something you worried about turned out fine.', 'intermediate'),
('growth', 'What is one small step you can take toward your goals today?', 'beginner'),
('growth', 'What challenge helped you grow as a person?', 'intermediate'),
('self_compassion', 'How can you be kinder to yourself today?', 'beginner'),
('self_compassion', 'What would you say to a friend going through what you are experiencing?', 'intermediate'),
('mindfulness', 'What are you noticing in your body right now?', 'beginner'),
('mindfulness', 'Describe your surroundings using all five senses.', 'beginner'),
('processing', 'What emotion surprised you today?', 'intermediate'),
('processing', 'What unfinished emotional business do you need to address?', 'deep');