DROP VIEW IF EXISTS public.gp_v_plate_discipline;
DROP VIEW IF EXISTS public.gp_v_pitch_facts;

CREATE VIEW public.gp_v_pitch_facts AS
SELECT p.id,
    p.user_id,
    p.game_id,
    p.at_bat_id,
    p.perspective,
    g.sport,
    g.game_date,
    p.pitch_type,
    p.pitch_velo,
    p.result,
    NULLIF((p.location ->> 'zone'::text), ''::text) AS zone,
    (NULLIF((p.location ->> 'zone'::text), ''::text) ~ '^[1-9]$'::text) AS in_zone,
    (p.result = ANY (ARRAY['swinging_strike'::text, 'foul'::text, 'in_play'::text])) AS is_swing,
    (p.result = 'swinging_strike'::text) AS is_whiff,
    p.count_balls,
    p.count_strikes,
    ab.contact_quality,
    p.created_at
   FROM gp_pitches p
     JOIN gp_games g ON g.id = p.game_id
     LEFT JOIN gp_at_bats ab ON ab.id = p.at_bat_id;

CREATE VIEW public.gp_v_plate_discipline AS
SELECT user_id, sport, perspective, count(*) AS n,
  count(*) FILTER (WHERE is_swing) AS swings,
  count(*) FILTER (WHERE is_whiff) AS whiffs,
  count(*) FILTER (WHERE in_zone IS FALSE) AS out_of_zone_pitches,
  count(*) FILTER (WHERE in_zone IS FALSE AND is_swing) AS chases,
  count(*) FILTER (WHERE in_zone IS TRUE) AS in_zone_pitches,
  count(*) FILTER (WHERE in_zone IS TRUE AND is_swing) AS in_zone_swings
FROM gp_v_pitch_facts GROUP BY user_id, sport, perspective;

DROP VIEW IF EXISTS public.gp_v_hitting_by_zone;
DROP VIEW IF EXISTS public.gp_v_hitting_by_pitch_type;
DROP VIEW IF EXISTS public.gp_v_hitting_by_count;
DROP VIEW IF EXISTS public.gp_v_hitting_by_velo_band;
DROP VIEW IF EXISTS public.gp_v_hitting_by_pitcher_hand;
DROP VIEW IF EXISTS public.gp_v_contact_quality;
DROP VIEW IF EXISTS public.gp_v_hitting_risp;
DROP VIEW IF EXISTS public.gp_v_home_to_first;
DROP VIEW IF EXISTS public.gp_v_at_bat_facts;

CREATE VIEW public.gp_v_at_bat_facts AS
SELECT ab.id,
    ab.user_id,
    ab.game_id,
    ab.opponent_pitcher_id,
    g.game_date,
    g.sport,
    g.game_type,
    g.opponent_team,
    ab.inning,
    ab.outs,
    ab.batting_side,
    ab.position_played,
    ab.result,
    ab.notes,
    COALESCE(ab.count_balls, dp.count_balls) AS count_balls,
    COALESCE(ab.count_strikes, dp.count_strikes) AS count_strikes,
    CASE
        WHEN COALESCE(ab.count_balls, dp.count_balls) IS NULL
          OR COALESCE(ab.count_strikes, dp.count_strikes) IS NULL THEN NULL::text
        ELSE (COALESCE(ab.count_balls, dp.count_balls) || '-'::text)
             || COALESCE(ab.count_strikes, dp.count_strikes)
    END AS count_label,
    ab.contact_quality,
    ab.exit_direction,
    ab.exit_velo,
    ab.launch_angle,
    COALESCE(ab.pitch_type, dp.pitch_type) AS pitch_type,
    COALESCE(ab.pitch_velo, dp.pitch_velo) AS pitch_velo,
    COALESCE(
      NULLIF((dp.location ->> 'zone'::text), ''::text),
      NULLIF((ab.pitch_location ->> 'zone'::text), ''::text)
    ) AS zone,
    COALESCE(pd.throws, dp.pitcher_throws) AS pitcher_throws,
    ab.pitcher_archetype_snapshot,
    CASE
        WHEN COALESCE(ab.pitch_velo, dp.pitch_velo) IS NULL THEN NULL::text
        WHEN COALESCE(ab.pitch_velo, dp.pitch_velo) < (60)::numeric THEN 'under 60'::text
        WHEN COALESCE(ab.pitch_velo, dp.pitch_velo) < (70)::numeric THEN '60-69'::text
        WHEN COALESCE(ab.pitch_velo, dp.pitch_velo) < (80)::numeric THEN '70-79'::text
        WHEN COALESCE(ab.pitch_velo, dp.pitch_velo) < (85)::numeric THEN '80-84'::text
        WHEN COALESCE(ab.pitch_velo, dp.pitch_velo) < (90)::numeric THEN '85-89'::text
        ELSE '90+'::text
    END AS velo_band,
    ab.runners_on,
    (ab.runners_on ~ '[23]'::text) AS risp,
    ab.rbi,
    ab.h1_time_sec,
    ((ab.result IS NOT NULL) AND (ab.result <> ALL (ARRAY['BB'::text, 'HBP'::text, 'SAC'::text, 'SF'::text]))) AS is_ab,
    (ab.result = ANY (ARRAY['1B'::text, '2B'::text, '3B'::text, 'HR'::text])) AS is_hit,
    (ab.result = ANY (ARRAY['BB'::text, 'HBP'::text])) AS is_on_base_walk,
    CASE ab.result
        WHEN '1B'::text THEN 1
        WHEN '2B'::text THEN 2
        WHEN '3B'::text THEN 3
        WHEN 'HR'::text THEN 4
        ELSE 0
    END AS total_bases,
    (ab.result = ANY (ARRAY['K_swinging'::text, 'K_looking'::text])) AS is_strikeout,
    ab.created_at
   FROM gp_at_bats ab
     JOIN gp_games g ON g.id = ab.game_id
     LEFT JOIN gp_pitcher_dossiers pd ON pd.id = ab.opponent_pitcher_id
     LEFT JOIN LATERAL (
       SELECT p.pitch_type, p.pitch_velo, p.location, p.pitcher_throws,
              p.count_balls, p.count_strikes
         FROM gp_pitches p
        WHERE p.at_bat_id = ab.id
        ORDER BY (p.result = 'in_play') DESC NULLS LAST,
                 p.pitch_no DESC NULLS LAST,
                 p.created_at DESC
        LIMIT 1
     ) dp ON true;

CREATE VIEW public.gp_v_hitting_by_zone AS
SELECT user_id, sport, zone AS split_value, count(*) AS n,
  count(*) FILTER (WHERE is_ab) AS at_bats,
  count(*) FILTER (WHERE is_hit) AS hits,
  sum(total_bases) AS total_bases,
  count(*) FILTER (WHERE is_strikeout) AS strikeouts,
  count(*) FILTER (WHERE contact_quality = ANY (ARRAY['barrel'::text,'solid'::text])) AS hard_contact
FROM gp_v_at_bat_facts WHERE zone IS NOT NULL GROUP BY user_id, sport, zone;

CREATE VIEW public.gp_v_hitting_by_pitch_type AS
SELECT user_id, sport, pitch_type AS split_value, count(*) AS n,
  count(*) FILTER (WHERE is_ab) AS at_bats,
  count(*) FILTER (WHERE is_hit) AS hits,
  sum(total_bases) AS total_bases,
  count(*) FILTER (WHERE is_strikeout) AS strikeouts,
  count(*) FILTER (WHERE contact_quality = ANY (ARRAY['barrel'::text,'solid'::text])) AS hard_contact,
  avg(exit_velo) AS avg_exit_velo,
  count(*) FILTER (WHERE exit_velo IS NOT NULL) AS exit_velo_n
FROM gp_v_at_bat_facts WHERE pitch_type IS NOT NULL GROUP BY user_id, sport, pitch_type;

CREATE VIEW public.gp_v_hitting_by_count AS
SELECT user_id, sport, count_label AS split_value, count(*) AS n,
  count(*) FILTER (WHERE is_ab) AS at_bats,
  count(*) FILTER (WHERE is_hit) AS hits,
  sum(total_bases) AS total_bases,
  count(*) FILTER (WHERE is_strikeout) AS strikeouts,
  count(*) FILTER (WHERE contact_quality = ANY (ARRAY['barrel'::text,'solid'::text])) AS hard_contact
FROM gp_v_at_bat_facts WHERE count_label IS NOT NULL GROUP BY user_id, sport, count_label;

CREATE VIEW public.gp_v_hitting_by_velo_band AS
SELECT user_id, sport, velo_band AS split_value, count(*) AS n,
  count(*) FILTER (WHERE is_ab) AS at_bats,
  count(*) FILTER (WHERE is_hit) AS hits,
  sum(total_bases) AS total_bases,
  count(*) FILTER (WHERE is_strikeout) AS strikeouts,
  count(*) FILTER (WHERE contact_quality = ANY (ARRAY['barrel'::text,'solid'::text])) AS hard_contact
FROM gp_v_at_bat_facts WHERE velo_band IS NOT NULL GROUP BY user_id, sport, velo_band;

CREATE VIEW public.gp_v_hitting_by_pitcher_hand AS
SELECT user_id, sport, pitcher_throws AS split_value, count(*) AS n,
  count(*) FILTER (WHERE is_ab) AS at_bats,
  count(*) FILTER (WHERE is_hit) AS hits,
  sum(total_bases) AS total_bases,
  count(*) FILTER (WHERE is_strikeout) AS strikeouts,
  count(*) FILTER (WHERE contact_quality = ANY (ARRAY['barrel'::text,'solid'::text])) AS hard_contact
FROM gp_v_at_bat_facts WHERE pitcher_throws IS NOT NULL GROUP BY user_id, sport, pitcher_throws;

CREATE VIEW public.gp_v_contact_quality AS
SELECT user_id, sport, contact_quality AS split_value, count(*) AS n
FROM gp_v_at_bat_facts WHERE contact_quality IS NOT NULL GROUP BY user_id, sport, contact_quality;

CREATE VIEW public.gp_v_hitting_risp AS
SELECT user_id, sport,
  CASE WHEN risp THEN 'risp'::text ELSE 'bases empty / no scoring position'::text END AS split_value,
  count(*) AS n,
  count(*) FILTER (WHERE is_ab) AS at_bats,
  count(*) FILTER (WHERE is_hit) AS hits,
  sum(total_bases) AS total_bases,
  sum(COALESCE(rbi, 0)) AS rbi
FROM gp_v_at_bat_facts WHERE runners_on IS NOT NULL AND runners_on <> ''::text
GROUP BY user_id, sport, risp;

CREATE VIEW public.gp_v_home_to_first AS
SELECT user_id, sport, count(*) AS n,
  avg(h1_time_sec) AS avg_sec, min(h1_time_sec) AS best_sec, max(h1_time_sec) AS worst_sec
FROM gp_v_at_bat_facts WHERE h1_time_sec IS NOT NULL GROUP BY user_id, sport;

GRANT SELECT ON public.gp_v_at_bat_facts, public.gp_v_pitch_facts,
  public.gp_v_hitting_by_zone, public.gp_v_hitting_by_pitch_type,
  public.gp_v_hitting_by_count, public.gp_v_hitting_by_velo_band,
  public.gp_v_hitting_by_pitcher_hand, public.gp_v_contact_quality,
  public.gp_v_hitting_risp, public.gp_v_home_to_first TO authenticated, service_role;
GRANT SELECT ON public.gp_v_plate_discipline TO authenticated, service_role;