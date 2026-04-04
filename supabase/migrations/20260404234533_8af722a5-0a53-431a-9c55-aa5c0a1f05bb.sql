
DO $$
DECLARE
  v_cross_role_blocked BOOLEAN := FALSE;
  v_idempotency_ok BOOLEAN := FALSE;
  v_reverse_blocked BOOLEAN := FALSE;
  v_user1 UUID := '19d572f7-df81-4746-9f9c-8d9d2e9a8956';
  v_user2 UUID := '57b007e3-5faa-40fa-b9b8-0858a134b4b5';
  v_session1 UUID := 'a26074e9-ee9b-490d-aaf2-f864b1fa05dd';
  v_session2 UUID := '080c7ca0-95a9-4057-a084-b60e976c0e85';
BEGIN
  -- Cleanup any leftover test rows
  DELETE FROM live_ab_links WHERE link_code IN ('TSTA1', 'TSTA2');

  -- Create test rows (different creators to avoid one-active-per-creator index)
  INSERT INTO live_ab_links (link_code, creator_user_id, sport, status, expires_at)
  VALUES
    ('TSTA1', v_user1, 'baseball', 'claimed', now() + interval '1 hour'),
    ('TSTA2', v_user2, 'baseball', 'claimed', now() + interval '1 hour');

  -- TEST 1: Assign creator session on TSTA1 (should succeed)
  UPDATE live_ab_links
  SET creator_session_id = v_session1
  WHERE link_code = 'TSTA1';

  -- TEST 2: Try cross-role reuse — same session as joiner on TSTA2 (should FAIL)
  BEGIN
    UPDATE live_ab_links
    SET joiner_session_id = v_session1
    WHERE link_code = 'TSTA2';
  EXCEPTION WHEN OTHERS THEN
    v_cross_role_blocked := TRUE;
  END;

  -- TEST 3: Idempotent re-assignment of same value (should succeed)
  BEGIN
    UPDATE live_ab_links
    SET creator_session_id = v_session1
    WHERE link_code = 'TSTA1';
    v_idempotency_ok := TRUE;
  EXCEPTION WHEN OTHERS THEN
    v_idempotency_ok := FALSE;
  END;

  -- TEST 4: Assign joiner session on TSTA1 with different session (should succeed)
  UPDATE live_ab_links
  SET joiner_session_id = v_session2
  WHERE link_code = 'TSTA1';

  -- TEST 5: Try reverse reuse — session2 as creator on TSTA2 (should FAIL)
  BEGIN
    UPDATE live_ab_links
    SET creator_session_id = v_session2
    WHERE link_code = 'TSTA2';
  EXCEPTION WHEN OTHERS THEN
    v_reverse_blocked := TRUE;
  END;

  -- LOG RESULTS
  INSERT INTO audit_log (user_id, action, table_name, metadata)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'trigger_proof_test',
    'live_ab_links',
    jsonb_build_object(
      'cross_role_blocked', v_cross_role_blocked,
      'idempotency_ok', v_idempotency_ok,
      'reverse_blocked', v_reverse_blocked,
      'tested_at', now()
    )
  );

  -- CLEANUP
  DELETE FROM live_ab_links WHERE link_code IN ('TSTA1', 'TSTA2');
END;
$$;
