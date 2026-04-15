
-- 1. training_blocks
CREATE TABLE public.training_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal text NOT NULL,
  sport text NOT NULL DEFAULT 'baseball',
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  pending_goal_change boolean NOT NULL DEFAULT false,
  generation_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT training_blocks_sport_check CHECK (sport IN ('baseball', 'softball'))
);

CREATE INDEX idx_training_blocks_user_status ON public.training_blocks (user_id, status);

ALTER TABLE public.training_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training blocks"
  ON public.training_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own training blocks"
  ON public.training_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training blocks"
  ON public.training_blocks FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. block_workouts
CREATE TABLE public.block_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.training_blocks(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  day_label text NOT NULL,
  scheduled_date date,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  workout_type text NOT NULL,
  estimated_duration int,

  CONSTRAINT block_workouts_week_check CHECK (week_number BETWEEN 1 AND 6),
  CONSTRAINT block_workouts_status_check CHECK (status IN ('scheduled', 'completed', 'missed'))
);

CREATE INDEX idx_block_workouts_block ON public.block_workouts (block_id);
CREATE INDEX idx_block_workouts_date ON public.block_workouts (scheduled_date);

ALTER TABLE public.block_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own block workouts"
  ON public.block_workouts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.training_blocks tb
    WHERE tb.id = block_workouts.block_id AND tb.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own block workouts"
  ON public.block_workouts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.training_blocks tb
    WHERE tb.id = block_workouts.block_id AND tb.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own block workouts"
  ON public.block_workouts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.training_blocks tb
    WHERE tb.id = block_workouts.block_id AND tb.user_id = auth.uid()
  ));

-- 3. block_exercises
CREATE TABLE public.block_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.block_workouts(id) ON DELETE CASCADE,
  ordinal int NOT NULL DEFAULT 0,
  name text NOT NULL,
  sets int NOT NULL DEFAULT 3,
  reps int NOT NULL DEFAULT 10,
  weight float,
  tempo text,
  rest_seconds int,
  velocity_intent text,
  cns_demand text,
  coaching_cues text[]
);

CREATE INDEX idx_block_exercises_workout ON public.block_exercises (workout_id);

ALTER TABLE public.block_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own block exercises"
  ON public.block_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.block_workouts bw
    JOIN public.training_blocks tb ON tb.id = bw.block_id
    WHERE bw.id = block_exercises.workout_id AND tb.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own block exercises"
  ON public.block_exercises FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.block_workouts bw
    JOIN public.training_blocks tb ON tb.id = bw.block_id
    WHERE bw.id = block_exercises.workout_id AND tb.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own block exercises"
  ON public.block_exercises FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.block_workouts bw
    JOIN public.training_blocks tb ON tb.id = bw.block_id
    WHERE bw.id = block_exercises.workout_id AND tb.user_id = auth.uid()
  ));

-- 4. training_preferences
CREATE TABLE public.training_preferences (
  user_id uuid PRIMARY KEY,
  goal text,
  availability jsonb NOT NULL DEFAULT '{"days": [1, 3, 5]}'::jsonb,
  equipment jsonb NOT NULL DEFAULT '[]'::jsonb,
  injuries jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience_level text NOT NULL DEFAULT 'intermediate',
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT training_preferences_experience_check
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'))
);

ALTER TABLE public.training_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training preferences"
  ON public.training_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own training preferences"
  ON public.training_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training preferences"
  ON public.training_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own training preferences"
  ON public.training_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_training_preferences_updated_at
  BEFORE UPDATE ON public.training_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. block_workout_metrics
CREATE TABLE public.block_workout_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_id uuid NOT NULL REFERENCES public.block_workouts(id) ON DELETE CASCADE,
  rpe int NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_block_workout_metrics_user ON public.block_workout_metrics (user_id);
CREATE INDEX idx_block_workout_metrics_workout ON public.block_workout_metrics (workout_id);

ALTER TABLE public.block_workout_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout metrics"
  ON public.block_workout_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workout metrics"
  ON public.block_workout_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout metrics"
  ON public.block_workout_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout metrics"
  ON public.block_workout_metrics FOR DELETE
  USING (auth.uid() = user_id);

-- RPE validation trigger
CREATE OR REPLACE FUNCTION public.validate_block_workout_rpe()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rpe < 1 OR NEW.rpe > 10 THEN
    RAISE EXCEPTION 'RPE must be between 1 and 10, got % for workout metric %', NEW.rpe, NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_block_workout_rpe
  BEFORE INSERT OR UPDATE ON public.block_workout_metrics
  FOR EACH ROW EXECUTE FUNCTION public.validate_block_workout_rpe();

-- Block status validation trigger
CREATE OR REPLACE FUNCTION public.validate_training_block_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'nearing_completion', 'ready_for_regeneration', 'archived') THEN
    RAISE EXCEPTION 'Invalid training block status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_training_block_status
  BEFORE INSERT OR UPDATE ON public.training_blocks
  FOR EACH ROW EXECUTE FUNCTION public.validate_training_block_status();

-- Block lifecycle function (callable via RPC)
CREATE OR REPLACE FUNCTION public.update_block_status(p_block_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_total int;
  v_completed int;
  v_remaining int;
  v_current_status text;
  v_new_status text;
  v_end_date date;
BEGIN
  -- Verify ownership
  SELECT status, end_date INTO v_current_status, v_end_date
  FROM training_blocks
  WHERE id = p_block_id AND user_id = auth.uid();

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Block not found or not owned by user';
  END IF;

  IF v_current_status = 'archived' THEN
    RETURN 'archived';
  END IF;

  SELECT count(*) INTO v_total FROM block_workouts WHERE block_id = p_block_id;
  SELECT count(*) INTO v_completed FROM block_workouts WHERE block_id = p_block_id AND status = 'completed';
  v_remaining := v_total - v_completed;

  -- Determine new status
  IF v_remaining = 0 OR (v_end_date IS NOT NULL AND v_end_date < current_date) THEN
    v_new_status := 'archived';
  ELSIF v_remaining <= 3 THEN
    v_new_status := 'ready_for_regeneration';
  ELSIF v_total > 0 AND (v_completed::float / v_total::float) >= 0.85 THEN
    v_new_status := 'nearing_completion';
  ELSE
    v_new_status := 'active';
  END IF;

  IF v_new_status != v_current_status THEN
    UPDATE training_blocks SET status = v_new_status WHERE id = p_block_id;
  END IF;

  RETURN v_new_status;
END;
$$;
