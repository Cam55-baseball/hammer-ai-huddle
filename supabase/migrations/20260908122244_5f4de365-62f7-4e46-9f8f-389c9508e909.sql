
-- Fielding as a signal source for the fault ledger.
-- Uses the fielding taxonomy that already exists (video_tag_taxonomy, skill_domain='fielding').
-- Additive only: writes wk_fault_signals rows. Never filters, never doses.

CREATE OR REPLACE FUNCTION public.wk_fielding_position_group(p_pos text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE upper(coalesce(p_pos,''))
    WHEN 'C' THEN 'catcher'
    WHEN 'P' THEN 'pitcher'
    WHEN '1B' THEN 'first_base'
    WHEN '2B' THEN 'middle_infield'
    WHEN 'SS' THEN 'middle_infield'
    WHEN '3B' THEN 'third_base'
    WHEN 'LF' THEN 'corner_outfield'
    WHEN 'RF' THEN 'corner_outfield'
    WHEN 'CF' THEN 'center_field'
    ELSE NULL
  END
$$;

-- Fielding fault key -> existing root pattern id (no new root vocabulary).
CREATE OR REPLACE FUNCTION public.wk_fielding_root_pattern(p_fault text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_fault
    WHEN 'slow_first_step' THEN 'slow_first_step'
    WHEN 'of_late_drop_step' THEN 'slow_first_step'
    WHEN 'of_first_step_drift_in' THEN 'slow_first_step'
    WHEN 'of_rounded_route' THEN 'slow_first_step'
    WHEN 'tb_no_charge_slow_roller' THEN 'slow_first_step'
    WHEN 'mi_slap_charge_late' THEN 'slow_first_step'
    WHEN 'fd_no_pre_pitch_hop' THEN 'slow_first_step'

    WHEN 'fd_stiff_lower_half' THEN 'poor_deceleration'
    WHEN 'tb_backs_up_in_between_hop' THEN 'poor_deceleration'
    WHEN 'tb_eaten_by_hop' THEN 'poor_deceleration'
    WHEN 'c_late_block_drop' THEN 'poor_deceleration'
    WHEN 'c_slow_block_recovery' THEN 'poor_deceleration'

    WHEN 'offline_throw' THEN 'direction_off_the_target_line'
    WHEN 'late_throw' THEN 'direction_off_the_target_line'
    WHEN 'of_late_to_cutoff' THEN 'direction_off_the_target_line'
    WHEN 'mi_feed_offline' THEN 'direction_off_the_target_line'
    WHEN 'tb_slow_roller_late_throw' THEN 'direction_off_the_target_line'
    WHEN 'of_no_throwing_momentum' THEN 'direction_off_the_target_line'
    WHEN 'poor_footwork_angle' THEN 'direction_off_the_target_line'

    WHEN 'late_exchange' THEN 'poor_scap_control'
    WHEN 'double_clutch' THEN 'poor_scap_control'
    WHEN 'arm_lag' THEN 'poor_scap_control'
    WHEN 'mi_late_pivot_at_bag' THEN 'poor_scap_control'
    WHEN 'mi_dp_turn_late' THEN 'poor_scap_control'

    WHEN 'booted_ball' THEN 'limited_ankle_dorsiflexion'
    WHEN 'glove_drift' THEN 'limited_ankle_dorsiflexion'
    WHEN 'fd_head_lifts_early' THEN 'limited_ankle_dorsiflexion'
    WHEN 'fd_high_hands_setup' THEN 'limited_ankle_dorsiflexion'
    WHEN 'fd_backhand_reach_late' THEN 'limited_ankle_dorsiflexion'
    WHEN 'mi_flat_glove_approach' THEN 'limited_ankle_dorsiflexion'
    WHEN 'fb_late_scoop_glove' THEN 'limited_ankle_dorsiflexion'
    WHEN 'fb_missed_pick' THEN 'limited_ankle_dorsiflexion'
    WHEN 'c_stabs_at_receiving' THEN 'limited_ankle_dorsiflexion'
    ELSE NULL
  END
$$;

-- Position-aware "the rep was poor but no specific result was logged" fault.
CREATE OR REPLACE FUNCTION public.wk_fielding_generic_fault(p_group text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_group
    WHEN 'catcher' THEN 'c_stabs_at_receiving'
    WHEN 'first_base' THEN 'fb_late_scoop_glove'
    WHEN 'middle_infield' THEN 'mi_flat_glove_approach'
    WHEN 'third_base' THEN 'tb_eaten_by_hop'
    WHEN 'corner_outfield' THEN 'of_rounded_route'
    WHEN 'center_field' THEN 'of_rounded_route'
    ELSE 'fd_stiff_lower_half'
  END
$$;

-- Single upsert point. Mirrors the analysis-finding writer's accumulation shape.
CREATE OR REPLACE FUNCTION public.wk_upsert_fault_signal(
  p_user uuid, p_source text, p_discipline text, p_fault text,
  p_evidence text, p_observed timestamptz, p_confidence numeric
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_root text;
BEGIN
  IF p_user IS NULL OR p_fault IS NULL THEN RETURN; END IF;
  v_root := public.wk_fielding_root_pattern(p_fault);
  IF v_root IS NULL THEN RETURN; END IF;

  INSERT INTO public.wk_fault_signals (
    user_id, source, fault_key, root_pattern_id, discipline,
    confidence, sample_size, severity, evidence, observed_at, engine_version
  ) VALUES (
    p_user, p_source, p_fault, v_root, p_discipline,
    p_confidence, 1, 0.46, p_evidence, coalesce(p_observed, now()), 'fielding_signals_v1'
  )
  ON CONFLICT (user_id, source, discipline, fault_key, root_pattern_id)
  DO UPDATE SET
    sample_size = public.wk_fault_signals.sample_size + 1,
    severity = LEAST(1.0, 0.40 + 0.06 * (public.wk_fault_signals.sample_size + 1)),
    observed_at = GREATEST(public.wk_fault_signals.observed_at, EXCLUDED.observed_at),
    evidence = EXCLUDED.evidence,
    updated_at = now();
END;
$$;

-- Practice fielding micro-logging -> ledger.
CREATE OR REPLACE FUNCTION public.wk_fielding_signals_from_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rep jsonb;
  v_group text;
  v_fault text;
  v_result text;
  v_route text;
  v_score numeric;
  v_when timestamptz;
BEGIN
  IF coalesce(NEW.module,'') <> 'fielding' THEN RETURN NEW; END IF;
  IF NEW.micro_layer_data IS NULL OR jsonb_typeof(NEW.micro_layer_data) <> 'array' THEN RETURN NEW; END IF;

  v_when := coalesce(NEW.session_date::timestamptz, NEW.created_at, now());

  FOR rep IN SELECT * FROM jsonb_array_elements(NEW.micro_layer_data) LOOP
    v_group := public.wk_fielding_position_group(rep->>'fielding_position');
    v_result := lower(coalesce(rep->>'fielding_result',''));
    v_route := lower(coalesce(rep->>'route_efficiency',''));
    BEGIN v_score := (rep->>'execution_score')::numeric; EXCEPTION WHEN others THEN v_score := NULL; END;

    v_fault := NULL;
    IF v_result IN ('booted','bobble','bobbled','error','muffed','drop','dropped') THEN
      v_fault := 'booted_ball';
    ELSIF v_result IN ('offline','off_line','throw_error','bad_throw') THEN
      v_fault := 'offline_throw';
    ELSIF v_result IN ('late','late_throw','safe_late') THEN
      v_fault := 'late_throw';
    ELSIF v_route IN ('poor','below_average','inefficient') THEN
      v_fault := CASE WHEN v_group IN ('corner_outfield','center_field') THEN 'of_rounded_route' ELSE 'slow_first_step' END;
    ELSIF v_score IS NOT NULL AND v_score <= 4 THEN
      v_fault := public.wk_fielding_generic_fault(v_group);
    END IF;

    IF v_fault IS NOT NULL THEN
      PERFORM public.wk_upsert_fault_signal(
        NEW.user_id, 'log_trend', 'fielding', v_fault,
        'Seen in fielding practice reps' || coalesce(' at ' || (rep->>'fielding_position'), '') || '.',
        v_when, 0.6
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS performance_sessions_fielding_to_ledger ON public.performance_sessions;
CREATE TRIGGER performance_sessions_fielding_to_ledger
AFTER INSERT ON public.performance_sessions
FOR EACH ROW EXECUTE FUNCTION public.wk_fielding_signals_from_session();

-- Game defensive plays -> ledger.
CREATE OR REPLACE FUNCTION public.wk_fielding_signals_from_game_play()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group text;
  v_fault text;
  v_result text;
BEGIN
  v_group := public.wk_fielding_position_group(NEW.position);
  v_result := lower(coalesce(NEW.result,''));

  IF coalesce(NEW.error_flag,false) OR v_result LIKE '%error%' THEN
    v_fault := 'booted_ball';
  ELSIF v_result LIKE '%offline%' OR v_result LIKE '%throwing%' THEN
    v_fault := 'offline_throw';
  ELSIF v_group = 'catcher' AND NEW.pop_time_sec IS NOT NULL AND NEW.pop_time_sec > 2.2 THEN
    v_fault := 'late_exchange';
  END IF;

  IF v_fault IS NOT NULL THEN
    PERFORM public.wk_upsert_fault_signal(
      NEW.user_id, 'game_hub', 'fielding', v_fault,
      'Seen in a game defensive play' || coalesce(' at ' || NEW.position, '') || '.',
      coalesce(NEW.created_at, now()), 0.65
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gp_defense_plays_to_ledger ON public.gp_defense_plays;
CREATE TRIGGER gp_defense_plays_to_ledger
AFTER INSERT ON public.gp_defense_plays
FOR EACH ROW EXECUTE FUNCTION public.wk_fielding_signals_from_game_play();

REVOKE EXECUTE ON FUNCTION public.wk_upsert_fault_signal(uuid,text,text,text,text,timestamptz,numeric) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wk_fielding_signals_from_session() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wk_fielding_signals_from_game_play() FROM public, anon, authenticated;
