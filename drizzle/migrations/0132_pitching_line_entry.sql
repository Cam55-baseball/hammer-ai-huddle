ALTER TABLE public.gp_games
 ADD COLUMN IF NOT EXISTS pitcher_strikeouts integer CHECK (pitcher_strikeouts>=0),
 ADD COLUMN IF NOT EXISTS pitcher_walks integer CHECK (pitcher_walks>=0),
 ADD COLUMN IF NOT EXISTS pitcher_home_runs integer CHECK (pitcher_home_runs>=0),
 ADD COLUMN IF NOT EXISTS pitcher_at_bats_against integer CHECK (pitcher_at_bats_against>=0),
 ADD COLUMN IF NOT EXISTS pitcher_first_pitch_strikes integer CHECK (pitcher_first_pitch_strikes>=0),
 ADD COLUMN IF NOT EXISTS pitcher_two_ball_batters integer CHECK (pitcher_two_ball_batters>=0),
 ADD COLUMN IF NOT EXISTS pitcher_soft_contact integer CHECK (pitcher_soft_contact>=0),
 ADD COLUMN IF NOT EXISTS pitcher_medium_contact integer CHECK (pitcher_medium_contact>=0),
 ADD COLUMN IF NOT EXISTS pitcher_hard_contact integer CHECK (pitcher_hard_contact>=0),
 ADD COLUMN IF NOT EXISTS pitcher_scoring_pos_by_inning boolean[];
COMMENT ON COLUMN public.gp_games.pitcher_scoring_pos_by_inning IS 'Per pitched inning: did a runner reach 2B or 3B. Player-entered.';
CREATE OR REPLACE FUNCTION public.mastery_pitching_lines(p_sport text,p_date date,p_athlete uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE athlete uuid:=coalesce(p_athlete,auth.uid());
BEGIN
 IF auth.uid() IS NULL OR p_sport NOT IN ('baseball','softball') OR p_date IS NULL OR NOT public._coach_training_access(athlete) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 IF athlete<>auth.uid() AND NOT EXISTS(SELECT 1 FROM public.athlete_context WHERE user_id=athlete AND sport_primary=p_sport) THEN RAISE EXCEPTION 'sport not shared' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg((to_jsonb(g) - 'user_id' - 'notes') || jsonb_build_object('pitches',coalesce((SELECT jsonb_agg(jsonb_build_object('batter_opportunity',p.batter_opportunity,'batter_result',p.batter_result,'result',p.result,'count_balls',p.count_balls,'count_strikes',p.count_strikes,'contact_quality',p.contact_quality) ORDER BY p.inning,p.pitch_no,p.id) FROM public.gp_pitches p WHERE p.game_id=g.id AND p.user_id=athlete AND p.perspective='pitcher'),'[]'::jsonb)) ORDER BY g.game_date,g.id)
  FROM public.gp_games g WHERE g.user_id=athlete AND g.sport=p_sport AND 'P'=ANY(g.my_positions) AND g.deleted_at IS NULL AND NOT g.ignored_for_training AND g.status IN ('completed','final') AND g.game_date<=p_date),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.mastery_pitching_lines(text,date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mastery_pitching_lines(text,date,uuid) TO authenticated,service_role;