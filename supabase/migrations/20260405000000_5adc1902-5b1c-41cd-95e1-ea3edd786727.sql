
-- 1. Replace trigger function with instrumented version (observable violations)
CREATE OR REPLACE FUNCTION public.enforce_session_global_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict UUID;
BEGIN
  -- Check creator_session_id
  IF NEW.creator_session_id IS NOT NULL THEN
    SELECT id INTO v_conflict
    FROM live_ab_links
    WHERE id != NEW.id
      AND (
        creator_session_id = NEW.creator_session_id
        OR joiner_session_id = NEW.creator_session_id
      )
    LIMIT 1;

    IF v_conflict IS NOT NULL THEN
      INSERT INTO audit_log (user_id, action, table_name, metadata)
      VALUES (
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
        'link_violation_creator',
        'live_ab_links',
        jsonb_build_object(
          'session_id', NEW.creator_session_id,
          'conflict_link_id', v_conflict,
          'new_link_id', NEW.id,
          'timestamp', now()
        )
      );

      RAISE EXCEPTION 'Session % is already linked to another AB link', NEW.creator_session_id;
    END IF;
  END IF;

  -- Check joiner_session_id
  IF NEW.joiner_session_id IS NOT NULL THEN
    SELECT id INTO v_conflict
    FROM live_ab_links
    WHERE id != NEW.id
      AND (
        creator_session_id = NEW.joiner_session_id
        OR joiner_session_id = NEW.joiner_session_id
      )
    LIMIT 1;

    IF v_conflict IS NOT NULL THEN
      INSERT INTO audit_log (user_id, action, table_name, metadata)
      VALUES (
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
        'link_violation_joiner',
        'live_ab_links',
        jsonb_build_object(
          'session_id', NEW.joiner_session_id,
          'conflict_link_id', v_conflict,
          'new_link_id', NEW.id,
          'timestamp', now()
        )
      );

      RAISE EXCEPTION 'Session % is already linked to another AB link', NEW.joiner_session_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Chaos Test: Sequential idempotency proof
DO $$
DECLARE
  v_test_user UUID := '19d572f7-df81-4746-9f9c-8d9d2e9a8956';
  v_test_session UUID := 'a26074e9-ee9b-490d-aaf2-f864b1fa05dd';
  v_count INT;
  v_all_ok BOOLEAN := TRUE;
BEGIN
  -- Cleanup
  DELETE FROM live_ab_links WHERE link_code = 'CHAOS1';

  -- Create test link
  INSERT INTO live_ab_links (link_code, creator_user_id, sport, status, expires_at)
  VALUES ('CHAOS1', v_test_user, 'baseball', 'claimed', now() + interval '1 hour');

  -- Attach same session 10 times (idempotency proof)
  FOR i IN 1..10 LOOP
    BEGIN
      UPDATE live_ab_links
      SET creator_session_id = COALESCE(creator_session_id, v_test_session)
      WHERE link_code = 'CHAOS1';
    EXCEPTION WHEN OTHERS THEN
      v_all_ok := FALSE;
    END;
  END LOOP;

  -- Verify exactly 1 attachment
  SELECT COUNT(*) INTO v_count
  FROM live_ab_links
  WHERE (creator_session_id = v_test_session OR joiner_session_id = v_test_session);

  -- Log result
  INSERT INTO audit_log (user_id, action, table_name, metadata)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'chaos_test_result',
    'live_ab_links',
    jsonb_build_object(
      'session_count', v_count,
      'expected', 1,
      'all_iterations_ok', v_all_ok,
      'pass', (v_count = 1 AND v_all_ok),
      'tested_at', now()
    )
  );

  -- Cleanup
  DELETE FROM live_ab_links WHERE link_code = 'CHAOS1';
END;
$$;
