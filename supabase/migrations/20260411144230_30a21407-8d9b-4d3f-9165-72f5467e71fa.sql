
-- Baserunning Lessons (read-only content)
CREATE TABLE public.baserunning_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'both',
  level TEXT NOT NULL DEFAULT 'beginner',
  order_index INT NOT NULL DEFAULT 0,
  elite_cue TEXT,
  game_transfer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.baserunning_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lessons"
  ON public.baserunning_lessons FOR SELECT
  TO authenticated USING (true);

-- Baserunning Scenarios (read-only content linked to lessons)
CREATE TABLE public.baserunning_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.baserunning_lessons(id) ON DELETE CASCADE,
  scenario_text TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'both',
  difficulty TEXT NOT NULL DEFAULT 'easy',
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.baserunning_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scenarios"
  ON public.baserunning_scenarios FOR SELECT
  TO authenticated USING (true);

CREATE INDEX idx_baserunning_scenarios_lesson ON public.baserunning_scenarios(lesson_id);

-- Baserunning Progress (user-specific)
CREATE TABLE public.baserunning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.baserunning_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  score INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.baserunning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.baserunning_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.baserunning_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.baserunning_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_baserunning_progress_user ON public.baserunning_progress(user_id);
