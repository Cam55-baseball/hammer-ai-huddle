-- 1. Practice mapper follows the screen's vocabulary exactly.
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
    -- Exact strings written by RepScorer's fieldingResultOptions.
    IF v_result IN ('error', 'bobbled', 'dropped') THEN
      v_fault := 'booted_ball';
    ELSIF v_result = 'missed_pick' THEN
      v_fault := CASE WHEN v_group = 'first_base' THEN 'fb_missed_pick' ELSE 'booted_ball' END;
    ELSIF v_result = 'offline_throw' THEN
      v_fault := 'offline_throw';
    ELSIF v_result = 'late_throw' THEN
      v_fault := 'late_throw';
    ELSIF v_route = 'poor' THEN
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

-- 2. Defensive play entry -> ledger.
CREATE OR REPLACE FUNCTION public.wk_fielding_signals_from_defensive_play()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group text;
  v_fault text;
  v_outcome text;
  v_acc numeric;
  v_route numeric;
  v_catch numeric;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  v_group := public.wk_fielding_position_group(NEW.fielder_position);
  v_outcome := lower(coalesce(NEW.outcome,''));

  -- Normalise 0-100 inputs down to 0-1.
  v_acc := NEW.throw_accuracy;      IF v_acc   IS NOT NULL AND v_acc   > 1 THEN v_acc   := v_acc / 100.0; END IF;
  v_route := NEW.route_efficiency;  IF v_route IS NOT NULL AND v_route > 1 THEN v_route := v_route / 100.0; END IF;
  v_catch := NEW.catch_probability; IF v_catch IS NOT NULL AND v_catch > 1 THEN v_catch := v_catch / 100.0; END IF;

  IF v_outcome = 'error' THEN
    v_fault := 'booted_ball';
  ELSIF v_outcome = 'hit' THEN
    -- Judged on the play's own fields, never on the word "hit".
    IF v_acc IS NOT NULL AND v_acc < 0.5 THEN
      v_fault := 'offline_throw';
    ELSIF v_route IS NOT NULL AND v_route < 0.7 THEN
      v_fault := CASE WHEN v_group IN ('corner_outfield','center_field') THEN 'of_rounded_route' ELSE 'slow_first_step' END;
    ELSIF v_catch IS NOT NULL AND v_catch >= 0.7 THEN
      v_fault := public.wk_fielding_generic_fault(v_group);
    END IF;
  END IF;
  -- out / caught / assist / double_play / no_play never produce a fault.

  IF v_fault IS NOT NULL THEN
    PERFORM public.wk_upsert_fault_signal(
      NEW.user_id, 'game_hub', 'fielding', v_fault,
      'Seen in a logged defensive play' || coalesce(' at ' || NEW.fielder_position, '') || '.',
      coalesce(NEW.created_at, now()), 0.65
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS defensive_plays_to_ledger ON public.defensive_plays;
CREATE TRIGGER defensive_plays_to_ledger
AFTER INSERT ON public.defensive_plays
FOR EACH ROW EXECUTE FUNCTION public.wk_fielding_signals_from_defensive_play();

REVOKE EXECUTE ON FUNCTION public.wk_fielding_signals_from_defensive_play() FROM public, anon, authenticated;

-- 3. A typed error code ("E6") is the tick.
CREATE OR REPLACE FUNCTION public.gp_defense_error_code_flag()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.result IS NOT NULL AND btrim(NEW.result) ~* '^e\s*-?\s*[1-9]$' THEN
    NEW.error_flag := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gp_defense_plays_error_code ON public.gp_defense_plays;
CREATE TRIGGER gp_defense_plays_error_code
BEFORE INSERT OR UPDATE ON public.gp_defense_plays
FOR EACH ROW EXECUTE FUNCTION public.gp_defense_error_code_flag();

UPDATE public.gp_defense_plays
SET error_flag = true
WHERE coalesce(error_flag,false) = false
  AND result IS NOT NULL
  AND btrim(result) ~* '^e\s*-?\s*[1-9]$';