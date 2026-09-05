CREATE OR REPLACE VIEW public.gp_v_at_bat_facts AS
SELECT ab.id,
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