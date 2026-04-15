
-- Fix #10: Performance indexes
CREATE INDEX IF NOT EXISTS idx_block_workouts_block_id ON public.block_workouts(block_id);
CREATE INDEX IF NOT EXISTS idx_block_workouts_status ON public.block_workouts(status);
CREATE INDEX IF NOT EXISTS idx_block_exercises_workout_id ON public.block_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_training_blocks_user_status ON public.training_blocks(user_id, status);

-- Fix #11: Hard constraints
ALTER TABLE public.block_exercises ADD CONSTRAINT chk_block_exercises_sets CHECK (sets > 0);
ALTER TABLE public.block_exercises ADD CONSTRAINT chk_block_exercises_reps CHECK (reps > 0);

-- Fix #12: Prevent duplicate active blocks
CREATE UNIQUE INDEX idx_one_active_block ON public.training_blocks (user_id) WHERE status IN ('active', 'nearing_completion');

-- Fix #6: Hardened update_block_status with explicit auth check and correct remaining count
CREATE OR REPLACE FUNCTION public.update_block_status(p_block_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_total int;
  v_completed int;
  v_remaining int;
  v_current_status text;
  v_new_status text;
  v_end_date date;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated user';
  END IF;

  SELECT status, end_date INTO v_current_status, v_end_date
  FROM training_blocks
  WHERE id = p_block_id AND user_id = v_user_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Block not found or not owned by user';
  END IF;

  IF v_current_status = 'archived' THEN
    RETURN 'archived';
  END IF;

  SELECT count(*) INTO v_total FROM block_workouts WHERE block_id = p_block_id;
  SELECT count(*) INTO v_completed FROM block_workouts WHERE block_id = p_block_id AND status = 'completed';
  SELECT count(*) INTO v_remaining FROM block_workouts WHERE block_id = p_block_id AND status = 'scheduled';

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
$function$;

-- Service-role variant for cron jobs (no auth.uid check)
CREATE OR REPLACE FUNCTION public.update_block_status_service(p_block_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total int;
  v_completed int;
  v_remaining int;
  v_current_status text;
  v_new_status text;
  v_end_date date;
BEGIN
  SELECT status, end_date INTO v_current_status, v_end_date
  FROM training_blocks
  WHERE id = p_block_id;

  IF v_current_status IS NULL THEN
    RETURN 'not_found';
  END IF;

  IF v_current_status = 'archived' THEN
    RETURN 'archived';
  END IF;

  SELECT count(*) INTO v_total FROM block_workouts WHERE block_id = p_block_id;
  SELECT count(*) INTO v_completed FROM block_workouts WHERE block_id = p_block_id AND status = 'completed';
  SELECT count(*) INTO v_remaining FROM block_workouts WHERE block_id = p_block_id AND status = 'scheduled';

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
$function$;

-- Fix #4: Atomic insert RPC for transaction safety
CREATE OR REPLACE FUNCTION public.insert_training_block_atomic(
  p_user_id uuid,
  p_goal text,
  p_sport text,
  p_start_date date,
  p_end_date date,
  p_generation_metadata jsonb,
  p_workouts jsonb,
  p_pending_goal_block_id uuid DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_block_id uuid;
  v_workout jsonb;
  v_workout_id uuid;
  v_exercise jsonb;
BEGIN
  -- Insert block
  INSERT INTO training_blocks (user_id, goal, sport, start_date, end_date, status, generation_metadata)
  VALUES (p_user_id, p_goal, p_sport, p_start_date, p_end_date, 'active', p_generation_metadata)
  RETURNING id INTO v_block_id;

  -- Insert workouts and exercises
  FOR v_workout IN SELECT * FROM jsonb_array_elements(p_workouts)
  LOOP
    INSERT INTO block_workouts (
      block_id, week_number, day_label, scheduled_date, status, workout_type, estimated_duration
    ) VALUES (
      v_block_id,
      (v_workout->>'week_number')::int,
      v_workout->>'day_label',
      (v_workout->>'scheduled_date')::date,
      COALESCE(v_workout->>'status', 'scheduled'),
      v_workout->>'workout_type',
      (v_workout->>'estimated_duration')::int
    ) RETURNING id INTO v_workout_id;

    IF v_workout->'exercises' IS NOT NULL THEN
      FOR v_exercise IN SELECT * FROM jsonb_array_elements(v_workout->'exercises')
      LOOP
        INSERT INTO block_exercises (
          workout_id, ordinal, name, sets, reps, weight, tempo, rest_seconds,
          velocity_intent, cns_demand, coaching_cues
        ) VALUES (
          v_workout_id,
          (v_exercise->>'ordinal')::int,
          v_exercise->>'name',
          (v_exercise->>'sets')::int,
          (v_exercise->>'reps')::int,
          (v_exercise->>'weight')::float,
          v_exercise->>'tempo',
          (v_exercise->>'rest_seconds')::int,
          v_exercise->>'velocity_intent',
          v_exercise->>'cns_demand',
          CASE WHEN v_exercise->'coaching_cues' IS NOT NULL
            THEN ARRAY(SELECT jsonb_array_elements_text(v_exercise->'coaching_cues'))
            ELSE NULL
          END
        );
      END LOOP;
    END IF;
  END LOOP;

  -- Reset pending goal change flag if applicable
  IF p_pending_goal_block_id IS NOT NULL THEN
    UPDATE training_blocks SET pending_goal_change = false WHERE id = p_pending_goal_block_id;
  END IF;

  RETURN v_block_id;
END;
$function$;
