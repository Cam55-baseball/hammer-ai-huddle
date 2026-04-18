CREATE OR REPLACE FUNCTION public.insert_training_block_atomic(p_user_id uuid, p_goal text, p_sport text, p_start_date date, p_end_date date, p_generation_metadata jsonb, p_workouts jsonb, p_pending_goal_block_id uuid DEFAULT NULL::uuid, p_idempotency_key text DEFAULT NULL::text)
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
    INSERT INTO training_blocks (user_id, goal, sport, start_date, end_date, status, generation_metadata, idempotency_key, updated_at)
    VALUES (p_user_id, p_goal, p_sport, p_start_date, p_end_date, 'active', p_generation_metadata, p_idempotency_key, now())
    ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_block_id;

    IF v_block_id IS NULL THEN
      SELECT id INTO v_block_id
      FROM training_blocks
      WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
      FOR UPDATE;
    END IF;

    PERFORM 1 FROM training_blocks WHERE id = v_block_id FOR UPDATE;

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
$function$;