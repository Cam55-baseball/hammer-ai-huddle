-- ============================================================
-- Game Performance reader layer (deterministic, no invented values)
-- All views are security_invoker so the underlying gp_* RLS applies.
-- ============================================================

-- ---------- Indexes ----------
CREATE INDEX IF NOT EXISTS idx_gp_at_bats_user_game ON public.gp_at_bats (user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_gp_at_bats_game ON public.gp_at_bats (game_id);
CREATE INDEX IF NOT EXISTS idx_gp_pitches_user_game ON public.gp_pitches (user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_gp_pitches_at_bat ON public.gp_pitches (at_bat_id);
CREATE INDEX IF NOT EXISTS idx_gp_defense_user_game ON public.gp_defense_plays (user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_gp_baserun_user_game ON public.gp_baserun_events (user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_gp_games_user_date ON public.gp_games (user_id, game_date DESC);

-- ---------- Base fact view: one row per at-bat, enriched ----------
CREATE OR REPLACE VIEW public.gp_v_at_bat_facts
WITH (security_invoker = true) AS
SELECT
  ab.id,
  ab.user_id,
  ab.game_id,
  g.game_date,
  g.sport,
  g.game_type,
  g.opponent_team,
  ab.inning,
  ab.batting_side,
  ab.position_played,
  ab.result,
  ab.count_balls,
  ab.count_strikes,
  CASE
    WHEN ab.count_balls IS NULL OR ab.count_strikes IS NULL THEN NULL
    ELSE ab.count_balls || '-' || ab.count_strikes
  END                                                    AS count_label,
  ab.contact_quality,
  ab.exit_direction,
  ab.exit_velo,
  ab.launch_angle,
  ab.pitch_type,
  ab.pitch_velo,
  NULLIF(ab.pitch_location ->> 'zone', '')               AS zone,
  pd.throws                                              AS pitcher_throws,
  ab.pitcher_archetype_snapshot,
  CASE
    WHEN ab.pitch_velo IS NULL THEN NULL
    WHEN ab.pitch_velo < 60 THEN 'under 60'
    WHEN ab.pitch_velo < 70 THEN '60-69'
    WHEN ab.pitch_velo < 80 THEN '70-79'
    WHEN ab.pitch_velo < 85 THEN '80-84'
    WHEN ab.pitch_velo < 90 THEN '85-89'
    ELSE '90+'
  END                                                    AS velo_band,
  ab.runners_on,
  (ab.runners_on ~ '[23]')                               AS risp,
  ab.rbi,
  ab.h1_time_sec,
  -- Official at-bat: excludes walks, HBP and sacrifices.
  (ab.result IS NOT NULL
     AND ab.result NOT IN ('BB','HBP','SAC','SF'))       AS is_ab,
  (ab.result IN ('1B','2B','3B','HR'))                   AS is_hit,
  (ab.result IN ('BB','HBP'))                            AS is_on_base_walk,
  CASE ab.result
    WHEN '1B' THEN 1 WHEN '2B' THEN 2 WHEN '3B' THEN 3 WHEN 'HR' THEN 4
    ELSE 0
  END                                                    AS total_bases,
  (ab.result IN ('K_swinging','K_looking'))              AS is_strikeout,
  ab.created_at
FROM public.gp_at_bats ab
JOIN public.gp_games g ON g.id = ab.game_id
LEFT JOIN public.gp_pitcher_dossiers pd ON pd.id = ab.opponent_pitcher_id;

-- Shared split aggregate shape (n is always present).
CREATE OR REPLACE VIEW public.gp_v_hitting_by_pitch_type
WITH (security_invoker = true) AS
SELECT user_id, sport, pitch_type AS split_value,
       count(*)                                   AS n,
       count(*) FILTER (WHERE is_ab)              AS at_bats,
       count(*) FILTER (WHERE is_hit)             AS hits,
       sum(total_bases)                           AS total_bases,
       count(*) FILTER (WHERE is_strikeout)       AS strikeouts,
       count(*) FILTER (WHERE contact_quality IN ('barrel','solid')) AS hard_contact,
       avg(exit_velo)                             AS avg_exit_velo,
       count(*) FILTER (WHERE exit_velo IS NOT NULL) AS exit_velo_n
FROM public.gp_v_at_bat_facts
WHERE pitch_type IS NOT NULL
GROUP BY user_id, sport, pitch_type;

CREATE OR REPLACE VIEW public.gp_v_hitting_by_count
WITH (security_invoker = true) AS
SELECT user_id, sport, count_label AS split_value,
       count(*) AS n,
       count(*) FILTER (WHERE is_ab) AS at_bats,
       count(*) FILTER (WHERE is_hit) AS hits,
       sum(total_bases) AS total_bases,
       count(*) FILTER (WHERE is_strikeout) AS strikeouts,
       count(*) FILTER (WHERE contact_quality IN ('barrel','solid')) AS hard_contact
FROM public.gp_v_at_bat_facts
WHERE count_label IS NOT NULL
GROUP BY user_id, sport, count_label;

CREATE OR REPLACE VIEW public.gp_v_hitting_by_zone
WITH (security_invoker = true) AS
SELECT user_id, sport, zone AS split_value,
       count(*) AS n,
       count(*) FILTER (WHERE is_ab) AS at_bats,
       count(*) FILTER (WHERE is_hit) AS hits,
       sum(total_bases) AS total_bases,
       count(*) FILTER (WHERE is_strikeout) AS strikeouts,
       count(*) FILTER (WHERE contact_quality IN ('barrel','solid')) AS hard_contact
FROM public.gp_v_at_bat_facts
WHERE zone IS NOT NULL
GROUP BY user_id, sport, zone;

CREATE OR REPLACE VIEW public.gp_v_hitting_by_pitcher_hand
WITH (security_invoker = true) AS
SELECT user_id, sport, pitcher_throws AS split_value,
       count(*) AS n,
       count(*) FILTER (WHERE is_ab) AS at_bats,
       count(*) FILTER (WHERE is_hit) AS hits,
       sum(total_bases) AS total_bases,
       count(*) FILTER (WHERE is_strikeout) AS strikeouts,
       count(*) FILTER (WHERE contact_quality IN ('barrel','solid')) AS hard_contact
FROM public.gp_v_at_bat_facts
WHERE pitcher_throws IS NOT NULL
GROUP BY user_id, sport, pitcher_throws;

CREATE OR REPLACE VIEW public.gp_v_hitting_by_velo_band
WITH (security_invoker = true) AS
SELECT user_id, sport, velo_band AS split_value,
       count(*) AS n,
       count(*) FILTER (WHERE is_ab) AS at_bats,
       count(*) FILTER (WHERE is_hit) AS hits,
       sum(total_bases) AS total_bases,
       count(*) FILTER (WHERE is_strikeout) AS strikeouts,
       count(*) FILTER (WHERE contact_quality IN ('barrel','solid')) AS hard_contact
FROM public.gp_v_at_bat_facts
WHERE velo_band IS NOT NULL
GROUP BY user_id, sport, velo_band;

CREATE OR REPLACE VIEW public.gp_v_contact_quality
WITH (security_invoker = true) AS
SELECT user_id, sport, contact_quality AS split_value,
       count(*) AS n
FROM public.gp_v_at_bat_facts
WHERE contact_quality IS NOT NULL
GROUP BY user_id, sport, contact_quality;

CREATE OR REPLACE VIEW public.gp_v_hitting_risp
WITH (security_invoker = true) AS
SELECT user_id, sport,
       CASE WHEN risp THEN 'risp' ELSE 'bases empty / no scoring position' END AS split_value,
       count(*) AS n,
       count(*) FILTER (WHERE is_ab) AS at_bats,
       count(*) FILTER (WHERE is_hit) AS hits,
       sum(total_bases) AS total_bases,
       sum(coalesce(rbi,0)) AS rbi
FROM public.gp_v_at_bat_facts
WHERE runners_on IS NOT NULL AND runners_on <> ''
GROUP BY user_id, sport, risp;

CREATE OR REPLACE VIEW public.gp_v_home_to_first
WITH (security_invoker = true) AS
SELECT user_id, sport,
       count(*) AS n,
       avg(h1_time_sec) AS avg_sec,
       min(h1_time_sec) AS best_sec,
       max(h1_time_sec) AS worst_sec
FROM public.gp_v_at_bat_facts
WHERE h1_time_sec IS NOT NULL
GROUP BY user_id, sport;

-- ---------- Plate discipline from the pitch ledger ----------
CREATE OR REPLACE VIEW public.gp_v_pitch_facts
WITH (security_invoker = true) AS
SELECT
  p.id, p.user_id, p.game_id, p.at_bat_id, p.perspective,
  g.sport, g.game_date,
  p.pitch_type, p.pitch_velo, p.result,
  NULLIF(p.location ->> 'zone', '')                      AS zone,
  (NULLIF(p.location ->> 'zone','') ~ '^[1-9]$')         AS in_zone,
  (p.result IN ('swinging_strike','foul','in_play'))     AS is_swing,
  (p.result = 'swinging_strike')                         AS is_whiff,
  p.count_balls, p.count_strikes,
  p.created_at
FROM public.gp_pitches p
JOIN public.gp_games g ON g.id = p.game_id;

CREATE OR REPLACE VIEW public.gp_v_plate_discipline
WITH (security_invoker = true) AS
SELECT user_id, sport, perspective,
       count(*)                                              AS n,
       count(*) FILTER (WHERE is_swing)                      AS swings,
       count(*) FILTER (WHERE is_whiff)                      AS whiffs,
       count(*) FILTER (WHERE in_zone IS FALSE)              AS out_of_zone_pitches,
       count(*) FILTER (WHERE in_zone IS FALSE AND is_swing) AS chases,
       count(*) FILTER (WHERE in_zone IS TRUE)               AS in_zone_pitches,
       count(*) FILTER (WHERE in_zone IS TRUE AND is_swing)  AS in_zone_swings
FROM public.gp_v_pitch_facts
GROUP BY user_id, sport, perspective;

-- ---------- Defense ----------
CREATE OR REPLACE VIEW public.gp_v_defense_by_position
WITH (security_invoker = true) AS
SELECT d.user_id, g.sport, d.position AS split_value,
       count(*)                                  AS n,
       count(*) FILTER (WHERE d.error_flag)      AS errors,
       count(*) FILTER (WHERE d.putout)          AS putouts,
       count(*) FILTER (WHERE d.assist)          AS assists,
       avg(d.pop_time_sec)                       AS avg_pop_time_sec,
       count(*) FILTER (WHERE d.pop_time_sec IS NOT NULL) AS pop_time_n,
       avg(d.arm_velo)                           AS avg_arm_velo,
       count(*) FILTER (WHERE d.arm_velo IS NOT NULL)     AS arm_velo_n
FROM public.gp_defense_plays d
JOIN public.gp_games g ON g.id = d.game_id
GROUP BY d.user_id, g.sport, d.position;

-- ---------- Baserunning ----------
CREATE OR REPLACE VIEW public.gp_v_baserunning
WITH (security_invoker = true) AS
SELECT b.user_id, g.sport, b.event_type AS split_value,
       count(*)                                     AS n,
       count(*) FILTER (WHERE b.success)            AS successes,
       avg(b.run_time_sec)                          AS avg_run_time_sec,
       count(*) FILTER (WHERE b.run_time_sec IS NOT NULL) AS run_time_n
FROM public.gp_baserun_events b
JOIN public.gp_games g ON g.id = b.game_id
GROUP BY b.user_id, g.sport, b.event_type;

-- ---------- Rep counts (feeds game/practice ratio honestly) ----------
CREATE OR REPLACE FUNCTION public.gp_game_rep_counts(_user_id uuid)
RETURNS TABLE (at_bats bigint, pitches bigint, defense_plays bigint, baserun_events bigint, total_reps bigint, games bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.gp_at_bats WHERE user_id = _user_id),
    (SELECT count(*) FROM public.gp_pitches WHERE user_id = _user_id),
    (SELECT count(*) FROM public.gp_defense_plays WHERE user_id = _user_id),
    (SELECT count(*) FROM public.gp_baserun_events WHERE user_id = _user_id),
    (SELECT count(*) FROM public.gp_at_bats WHERE user_id = _user_id)
      + (SELECT count(*) FROM public.gp_pitches WHERE user_id = _user_id)
      + (SELECT count(*) FROM public.gp_defense_plays WHERE user_id = _user_id)
      + (SELECT count(*) FROM public.gp_baserun_events WHERE user_id = _user_id),
    (SELECT count(*) FROM public.gp_games WHERE user_id = _user_id);
$$;

-- ---------- Grants ----------
GRANT SELECT ON public.gp_v_at_bat_facts            TO authenticated;
GRANT SELECT ON public.gp_v_pitch_facts             TO authenticated;
GRANT SELECT ON public.gp_v_hitting_by_pitch_type   TO authenticated;
GRANT SELECT ON public.gp_v_hitting_by_count        TO authenticated;
GRANT SELECT ON public.gp_v_hitting_by_zone         TO authenticated;
GRANT SELECT ON public.gp_v_hitting_by_pitcher_hand TO authenticated;
GRANT SELECT ON public.gp_v_hitting_by_velo_band    TO authenticated;
GRANT SELECT ON public.gp_v_contact_quality         TO authenticated;
GRANT SELECT ON public.gp_v_hitting_risp            TO authenticated;
GRANT SELECT ON public.gp_v_home_to_first           TO authenticated;
GRANT SELECT ON public.gp_v_plate_discipline        TO authenticated;
GRANT SELECT ON public.gp_v_defense_by_position     TO authenticated;
GRANT SELECT ON public.gp_v_baserunning             TO authenticated;

GRANT SELECT ON public.gp_v_at_bat_facts            TO service_role;
GRANT SELECT ON public.gp_v_pitch_facts             TO service_role;
GRANT SELECT ON public.gp_v_hitting_by_pitch_type   TO service_role;
GRANT SELECT ON public.gp_v_hitting_by_count        TO service_role;
GRANT SELECT ON public.gp_v_hitting_by_zone         TO service_role;
GRANT SELECT ON public.gp_v_hitting_by_pitcher_hand TO service_role;
GRANT SELECT ON public.gp_v_hitting_by_velo_band    TO service_role;
GRANT SELECT ON public.gp_v_contact_quality         TO service_role;
GRANT SELECT ON public.gp_v_hitting_risp            TO service_role;
GRANT SELECT ON public.gp_v_home_to_first           TO service_role;
GRANT SELECT ON public.gp_v_plate_discipline        TO service_role;
GRANT SELECT ON public.gp_v_defense_by_position     TO service_role;
GRANT SELECT ON public.gp_v_baserunning             TO service_role;

GRANT EXECUTE ON FUNCTION public.gp_game_rep_counts(uuid) TO authenticated, service_role;