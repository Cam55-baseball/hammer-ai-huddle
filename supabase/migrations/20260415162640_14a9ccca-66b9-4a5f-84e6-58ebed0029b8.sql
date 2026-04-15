
-- 1. Replace insert_training_block_atomic with row-level lock before child check
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
AS $fn$
DECLARE
  v_block_id uuid;
  v_workout jsonb;
  v_workout_id uuid;
  v_exercise jsonb;
  v_idx int;
  v_has_workouts boolean;
BEGIN
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

  IF p_idempotency_key IS NOT NULL THEN
    -- Atomic upsert
    INSERT INTO training_blocks (user_id, goal, sport, start_date, end_date, status, generation_metadata, idempotency_key, updated_at)
    VALUES (p_user_id, p_goal, p_sport, p_start_date, p_end_date, 'active', p_generation_metadata, p_idempotency_key, now())
    ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
    DO UPDATE SET updated_at = now()
    RETURNING id INTO v_block_id;

    -- Row-level lock: prevents concurrent child-insert race
    PERFORM 1 FROM training_blocks WHERE id = v_block_id FOR UPDATE;

    -- Now safely check if children already exist
    SELECT EXISTS(SELECT 1 FROM block_workouts WHERE block_id = v_block_id LIMIT 1) INTO v_has_workouts;
    IF v_has_workouts THEN
      RETURN v_block_id;
    END IF;
  ELSE
    BEGIN
      INSERT INTO training_blocks (user_id, goal, sport, start_date, end_date, status, generation_metadata, updated_at)
      VALUES (p_user_id, p_goal, p_sport, p_start_date, p_end_date, 'active', p_generation_metadata, now())
      RETURNING id INTO v_block_id;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'active_block_exists';
    END;
  END IF;

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

  IF p_pending_goal_block_id IS NOT NULL THEN
    UPDATE training_blocks SET pending_goal_change = false WHERE id = p_pending_goal_block_id;
  END IF;

  RETURN v_block_id;
END;
$fn$;

-- 2. Replace shift_workouts_forward with ordered resequencing
CREATE OR REPLACE FUNCTION public.shift_workouts_forward(
  p_block_id uuid,
  p_after_date date,
  p_days integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_count int;
BEGIN
  -- Resequence using row_number to prevent date collisions.
  -- Each future scheduled workout gets a new date = p_after_date + p_days + its ordinal position.
  WITH ordered AS (
    SELECT id,
           (p_after_date + p_days + (row_number() OVER (ORDER BY scheduled_date ASC, id ASC))::int) AS new_date
    FROM block_workouts
    WHERE block_id = p_block_id
      AND scheduled_date > p_after_date
      AND status = 'scheduled'
  )
  UPDATE block_workouts bw
  SET scheduled_date = ordered.new_date
  FROM ordered
  WHERE bw.id = ordered.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;
