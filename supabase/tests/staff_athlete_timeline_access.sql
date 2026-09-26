-- Access proof for staff_athlete_timeline. Runs inside a DO block that always raises, so every write rolls back.
-- Last run 2026-09-26: granted_staff=1 (text returned), scout_even_with_grant=0, ungranted_coach=0.
DO $$
DECLARE ath uuid := 'e6115e1e-063f-4edc-8b41-7d5b36727bcc'; s int; sc int; co int; txt text;
BEGIN
  INSERT INTO schedule_timeline_entries(user_id, tag, start_date, end_date, source, payload, summary)
  VALUES (ath, 'NOTE', current_date, current_date, 'inbox', '{"kind":"free_text","text":"ACCESS-TEST shoulder sore after bullpen"}', 'access test');
  INSERT INTO wk_staff_access(staff_user_id, athlete_user_id, granted_by) VALUES ('457554c0-d45f-418e-a072-6b872f0b3770', ath, ath);
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"95de827d-7418-460b-8b79-267bf79bdca4","role":"authenticated"}', true);
  SELECT count(*), max(typed_text) INTO s, txt FROM staff_athlete_timeline(ath) WHERE typed_text LIKE 'ACCESS-TEST%';
  PERFORM set_config('request.jwt.claims', '{"sub":"457554c0-d45f-418e-a072-6b872f0b3770","role":"authenticated"}', true);
  SELECT count(*) INTO sc FROM staff_athlete_timeline(ath);
  PERFORM set_config('request.jwt.claims', '{"sub":"5fe60e39-5cb8-4d05-9038-89171cf0fa4d","role":"authenticated"}', true);
  SELECT count(*) INTO co FROM staff_athlete_timeline(ath);
  RAISE EXCEPTION 'ACCESS_RESULT granted_staff=% text=% scout_even_with_grant=% ungranted_coach=% (rolled back)', s, txt, sc, co;
END $$;
