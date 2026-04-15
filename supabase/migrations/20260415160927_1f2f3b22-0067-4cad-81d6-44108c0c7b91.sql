
-- 1b. Idempotency key column + index
ALTER TABLE training_blocks ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_block_idempotency
  ON training_blocks(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 1e. Tighten reps constraint (drop old, add new)
DO $$
BEGIN
  ALTER TABLE block_exercises DROP CONSTRAINT IF EXISTS chk_block_exercises_reps;
  ALTER TABLE block_exercises DROP CONSTRAINT IF EXISTS chk_block_exercises_reps_min;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE block_exercises ADD CONSTRAINT chk_block_exercises_reps_min CHECK (reps >= 3);

-- 1f. Missing index for metrics lookup
CREATE INDEX IF NOT EXISTS idx_block_workout_metrics_workout_id
  ON block_workout_metrics(workout_id);

-- 1g. Add updated_at to training_blocks
ALTER TABLE training_blocks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 1a + 1b + 1c. Replace insert_training_block_atomic with hardened version
CREATE OR REPLACE FUNCTION public.insert_training_block_atomic(
  p_user_id uuid,
  p_goal text,
  p_sport text,
  p_start_date date,
  p_end_date date,
  p_generation_metadata jsonb,
  p_workouts jsonb,
  p_pending_goal_block_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_block_id uuid;
  v_existing_id uuid;
  v_workout jsonb;
  v_workout_id uuid;
  v_exercise jsonb;
  v_idx int;
BEGIN
  -- Idempotency check: return existing block if same key
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM training_blocks
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  -- Pre-insert validation
  IF p_workouts IS NULL OR jsonb_array_length(p_workouts) = 0 THEN
    RAISE EXCEPTION 'No workouts provided';
  END IF;

  v_idx := 0;
  FOR v_workout IN SELECT * FROM jsonb_array_elements(p_workouts)
  LOOP
    IF (v_workout->>'week_number') IS NULL THEN
      RAISE EXCEPTION 'Workout at index % missing week_number', v_idx;
    END IF;
    IF v_workout->'exercises' IS NULL OR jsonb_typeof(v_workout->'exercises') != 'array' THEN
      RAISE EXCEPTION 'Workout at index % missing exercises array', v_idx;
    END IF;
    v_idx := v_idx + 1;
  END LOOP;

  -- Insert block with race condition handling
  BEGIN
    INSERT INTO training_blocks (user_id, goal, sport, start_date, end_date, status, generation_metadata, idempotency_key, updated_at)
    VALUES (p_user_id, p_goal, p_sport, p_start_date, p_end_date, 'active', p_generation_metadata, p_idempotency_key, now())
    RETURNING id INTO v_block_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'active_block_exists';
  END;

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

  -- Reset pending goal change flag
  IF p_pending_goal_block_id IS NOT NULL THEN
    UPDATE training_blocks SET pending_goal_change = false WHERE id = p_pending_goal_block_id;
  END IF;

  RETURN v_block_id;
END;
$func$;

-- 1d. Batch adaptation RPCs
CREATE OR REPLACE FUNCTION public.batch_decrement_sets(p_workout_ids uuid[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_count int;
BEGIN
  UPDATE block_exercises
  SET sets = GREATEST(1, sets - 1)
  WHERE workout_id = ANY(p_workout_ids) AND sets > 1;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$func$;

CREATE OR REPLACE FUNCTION public.batch_increment_sets(p_workout_ids uuid[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_count int;
BEGIN
  UPDATE block_exercises
  SET sets = LEAST(6, sets + 1)
  WHERE workout_id = ANY(p_workout_ids) AND sets < 6;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$func$;

CREATE OR REPLACE FUNCTION public.batch_deload_exercises(p_workout_ids uuid[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_count int;
BEGIN
  UPDATE block_exercises
  SET sets = GREATEST(1, ROUND(sets * 0.5)::int),
      reps = GREATEST(3, ROUND(reps * 0.75)::int)
  WHERE workout_id = ANY(p_workout_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$func$;

-- 1g. Update both status RPCs to set updated_at
CREATE OR REPLACE FUNCTION public.update_block_status(p_block_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
    UPDATE training_blocks SET status = v_new_status, updated_at = now() WHERE id = p_block_id;
  END IF;

  RETURN v_new_status;
END;
$func$;

CREATE OR REPLACE FUNCTION public.update_block_status_service(p_block_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
    UPDATE training_blocks SET status = v_new_status, updated_at = now() WHERE id = p_block_id;
  END IF;

  RETURN v_new_status;
END;
$func$;
