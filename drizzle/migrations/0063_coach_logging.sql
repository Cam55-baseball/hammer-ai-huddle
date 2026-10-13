ALTER TABLE public.arm_ledger_entries DROP CONSTRAINT arm_ledger_entries_throw_type_check;
ALTER TABLE public.arm_ledger_entries ADD CONSTRAINT arm_ledger_entries_throw_type_check CHECK (throw_type = ANY (ARRAY['catch_play','position_throws','infield_quick_release','infield_short_hops','outfield_crow_hop','long_toss','catcher_throwdowns','pitcher_warmup','pitcher_catch_play','pap_max_throws','pap_warmup','game_pitches_coach','game_throws_coach']));

CREATE TABLE public.coach_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.coach_lineup_players (
  lineup_id uuid NOT NULL REFERENCES public.coach_lineups(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL,
  jersey text NOT NULL CHECK (jersey ~ '^[0-9]{1,3}$'),
  PRIMARY KEY (lineup_id, athlete_id),
  UNIQUE (lineup_id, jersey)
);
CREATE TABLE public.coach_logged_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  coach_label text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('single','lineup')),
  lineup_id uuid,
  jersey text,
  kind text NOT NULL CHECK (kind IN ('game','practice')),
  entry_date date NOT NULL,
  opponent text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','flagged','undone')),
  flag_reason text,
  flag_note text,
  parent_present_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX coach_logged_entries_athlete ON public.coach_logged_entries(athlete_id, entry_date DESC);
GRANT SELECT ON public.coach_lineups, public.coach_lineup_players, public.coach_logged_entries TO authenticated;
GRANT ALL ON public.coach_lineups, public.coach_lineup_players, public.coach_logged_entries TO service_role;
ALTER TABLE public.coach_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_lineup_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_logged_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach sees own lineups" ON public.coach_lineups FOR SELECT TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "coach sees own lineup players" ON public.coach_lineup_players FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.coach_lineups l WHERE l.id = lineup_id AND l.coach_id = auth.uid()));
CREATE POLICY "player or coach sees entry" ON public.coach_logged_entries FOR SELECT TO authenticated USING (athlete_id = auth.uid() OR coach_id = auth.uid());

-- One connection rule for coach tools on a player.
CREATE OR REPLACE FUNCTION public.coach_connected_to(_me uuid, _athlete uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _me IS NOT NULL AND _me <> _athlete AND (
    public.is_coach_of(_me, _athlete) OR public.is_linked_coach(_me, _athlete)
    OR EXISTS (SELECT 1 FROM organization_members m WHERE m.user_id = _athlete AND m.status = 'active'
               AND m.removed_at IS NULL AND public.is_org_admin(m.organization_id, _me)))
$$;

CREATE OR REPLACE FUNCTION public._coach_log_throws(_athlete uuid, _date date, _stats jsonb, _sign int) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p int := coalesce((_stats->>'pitches')::int,0); t int := coalesce((_stats->>'position_throws')::int,0);
BEGIN
  IF p > 0 THEN
    INSERT INTO arm_ledger_entries (user_id, entry_date, source, throw_type, count) VALUES (_athlete, _date, 'pitching', 'game_pitches_coach', greatest(0, _sign*p))
    ON CONFLICT (user_id, entry_date, throw_type) DO UPDATE SET count = greatest(0, arm_ledger_entries.count + _sign*p), updated_at = now();
  END IF;
  IF t > 0 THEN
    INSERT INTO arm_ledger_entries (user_id, entry_date, source, throw_type, count) VALUES (_athlete, _date, 'position', 'game_throws_coach', greatest(0, _sign*t))
    ON CONFLICT (user_id, entry_date, throw_type) DO UPDATE SET count = greatest(0, arm_ledger_entries.count + _sign*t), updated_at = now();
  END IF;
END $$;
REVOKE ALL ON FUNCTION public._coach_log_throws(uuid,date,jsonb,int) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.coach_save_lineup(_name text, _players jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _id uuid; r jsonb;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(_players) <> 'array' OR jsonb_array_length(_players) = 0 THEN RAISE EXCEPTION 'Add at least one player'; END IF;
  INSERT INTO coach_lineups (coach_id, name) VALUES (_me, _name) RETURNING id INTO _id;
  FOR r IN SELECT * FROM jsonb_array_elements(_players) LOOP
    IF NOT public.coach_connected_to(_me, (r->>'athlete_id')::uuid) THEN RAISE EXCEPTION 'A connection with every player is required' USING ERRCODE='42501'; END IF;
    INSERT INTO coach_lineup_players (lineup_id, athlete_id, jersey) VALUES (_id, (r->>'athlete_id')::uuid, r->>'jersey');
  END LOOP;
  RETURN _id;
END $$;

-- Save one coach entry. Wrong-player guard: the caller must send the locked player's id twice
-- (page lock + confirm), and in lineup mode the tapped jersey must belong to that player.
CREATE OR REPLACE FUNCTION public.coach_log_entry(_athlete uuid, _confirm_athlete uuid, _kind text, _date date, _opponent text,
  _stats jsonb, _parent_present boolean DEFAULT false, _lineup uuid DEFAULT NULL, _jersey text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _dob date; _name text; _k text; _v jsonb; _id uuid; _label text;
BEGIN
  IF _athlete IS NULL OR _confirm_athlete IS DISTINCT FROM _athlete THEN
    RAISE EXCEPTION 'Wrong player: the confirmed player does not match' USING ERRCODE='42501';
  END IF;
  IF NOT public.coach_connected_to(_me, _athlete) THEN RAISE EXCEPTION 'A connection with this player is required' USING ERRCODE='42501'; END IF;
  IF _lineup IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM coach_lineups WHERE id = _lineup AND coach_id = _me) THEN RAISE EXCEPTION 'Not your lineup' USING ERRCODE='42501'; END IF;
    IF NOT EXISTS (SELECT 1 FROM coach_lineup_players WHERE lineup_id = _lineup AND athlete_id = _athlete AND jersey = _jersey) THEN
      RAISE EXCEPTION 'Wrong player: jersey % is not this player', _jersey USING ERRCODE='42501';
    END IF;
  END IF;
  IF _kind NOT IN ('game','practice') THEN RAISE EXCEPTION 'kind must be game or practice'; END IF;
  IF _date IS NULL OR _date > current_date + 1 OR _date < current_date - 365 THEN RAISE EXCEPTION 'Pick a date in the last year'; END IF;
  IF jsonb_typeof(_stats) <> 'object' THEN RAISE EXCEPTION 'stats must be an object'; END IF;
  FOR _k, _v IN SELECT * FROM jsonb_each(_stats) LOOP
    IF _k NOT IN ('ab','hits','rbi','bb','so','runs','sb','pitches','strikes','innings_outs','position_throws') THEN RAISE EXCEPTION 'Unknown stat %', _k; END IF;
    IF jsonb_typeof(_v) <> 'number' OR (_v)::text::numeric < 0 OR (_v)::text::numeric > 300 OR (_v)::text::numeric <> trunc((_v)::text::numeric) THEN RAISE EXCEPTION 'Stat % must be a whole number 0–300', _k; END IF;
  END LOOP;
  IF coalesce((_stats->>'hits')::int,0) > coalesce((_stats->>'ab')::int,0) THEN RAISE EXCEPTION 'Hits cannot be more than at-bats'; END IF;
  SELECT date_of_birth INTO _dob FROM profiles WHERE id = _athlete;
  IF (_dob IS NULL OR age(_dob) < interval '13 years') AND NOT coalesce(_parent_present,false) THEN
    RAISE EXCEPTION 'Under 13: the parent must be present and agree' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(nullif(trim(full_name),''),'Coach') INTO _name FROM profiles WHERE id = _me;
  _label := 'Coach-entered · ' || _name || ' · ' || to_char(_date,'Mon DD, YYYY');
  INSERT INTO coach_logged_entries (athlete_id, coach_id, coach_label, mode, lineup_id, jersey, kind, entry_date, opponent, stats, parent_present_confirmed_at)
  VALUES (_athlete, _me, _label, CASE WHEN _lineup IS NULL THEN 'single' ELSE 'lineup' END, _lineup, _jersey, _kind, _date,
          nullif(trim(coalesce(_opponent,'')),''), _stats, CASE WHEN _parent_present THEN now() END)
  RETURNING id INTO _id;
  PERFORM public._coach_log_throws(_athlete, _date, _stats, 1);
  INSERT INTO coach_messages (athlete_id, coach_id, body, parent_copied)
  VALUES (_athlete, _me, _name || ' logged your ' || _kind || ' on ' || to_char(_date,'Mon DD') || '. Open My games to confirm it or flag it if something is wrong.', true);
  RETURN jsonb_build_object('id', _id, 'label', _label);
END $$;

CREATE OR REPLACE FUNCTION public.coach_undo_entry(_entry uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e coach_logged_entries;
BEGIN
  SELECT * INTO e FROM coach_logged_entries WHERE id = _entry AND coach_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Nothing to undo' USING ERRCODE='42501'; END IF;
  IF now() - e.created_at > interval '15 seconds' THEN RAISE EXCEPTION 'Undo time has passed'; END IF;
  UPDATE coach_logged_entries SET status = 'undone', resolved_at = now() WHERE id = _entry;
  PERFORM public._coach_log_throws(e.athlete_id, e.entry_date, e.stats, -1);
END $$;

CREATE OR REPLACE FUNCTION public.player_resolve_coach_entry(_entry uuid, _confirm boolean, _reason text DEFAULT NULL, _note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e coach_logged_entries;
BEGIN
  SELECT * INTO e FROM coach_logged_entries WHERE id = _entry AND status IN ('pending','flagged')
    AND (athlete_id = auth.uid() OR public.is_parent_of(auth.uid(), athlete_id));
  IF NOT FOUND THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF _confirm THEN
    UPDATE coach_logged_entries SET status = 'confirmed', resolved_at = now(), flag_reason = NULL WHERE id = _entry;
  ELSE
    IF _reason NOT IN ('not_me','wrong_numbers','other') THEN RAISE EXCEPTION 'Pick a reason'; END IF;
    UPDATE coach_logged_entries SET status = 'flagged', flag_reason = _reason, flag_note = left(_note, 500), resolved_at = NULL WHERE id = _entry;
    IF _reason = 'not_me' AND e.status = 'pending' THEN PERFORM public._coach_log_throws(e.athlete_id, e.entry_date, e.stats, -1); END IF;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.coach_save_lineup(text,jsonb), public.coach_log_entry(uuid,uuid,text,date,text,jsonb,boolean,uuid,text),
  public.coach_undo_entry(uuid), public.player_resolve_coach_entry(uuid,boolean,text,text), public.coach_connected_to(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_save_lineup(text,jsonb), public.coach_log_entry(uuid,uuid,text,date,text,jsonb,boolean,uuid,text),
  public.coach_undo_entry(uuid), public.player_resolve_coach_entry(uuid,boolean,text,text), public.coach_connected_to(uuid,uuid) TO authenticated;