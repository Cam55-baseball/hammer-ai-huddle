CREATE TABLE public.schedule_timeline_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tag text NOT NULL CHECK (tag IN ('SEASON','GAME','TOURNAMENT','PRACTICE','CANCELLED','PAIN','HOLD','EVENT','GOAL','NOTE','RESUME')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  dates date[] NULL,
  source text NOT NULL DEFAULT 'inbox' CHECK (source IN ('inbox','ask_hammer')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  linked_ref text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  undone_at timestamptz NULL,
  CHECK (end_date >= start_date)
);
GRANT SELECT, INSERT, UPDATE ON public.schedule_timeline_entries TO authenticated;
GRANT ALL ON public.schedule_timeline_entries TO service_role;
ALTER TABLE public.schedule_timeline_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes read own timeline" ON public.schedule_timeline_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Athletes add own timeline" ON public.schedule_timeline_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Athletes edit own timeline" ON public.schedule_timeline_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX schedule_timeline_entries_user_dates ON public.schedule_timeline_entries (user_id, start_date, end_date) WHERE undone_at IS NULL;

-- Atomic save with dedupe: same tag + same source + overlapping dates merges.
CREATE OR REPLACE FUNCTION public.tell_hammers_save(
  p_tag text, p_start date, p_end date, p_dates date[], p_source text, p_payload jsonb, p_summary text, p_linked_ref text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.schedule_timeline_entries;
  v_merged boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text || ':' || p_tag || ':' || p_source));
  SELECT * INTO v_row FROM public.schedule_timeline_entries
   WHERE user_id = v_uid AND tag = p_tag AND source = p_source AND undone_at IS NULL
     AND start_date <= p_end AND end_date >= p_start
   ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.schedule_timeline_entries SET
      start_date = LEAST(start_date, p_start),
      end_date = GREATEST(end_date, p_end),
      dates = CASE WHEN dates IS NULL AND p_dates IS NULL THEN NULL
                   ELSE (SELECT array_agg(DISTINCT d ORDER BY d) FROM unnest(coalesce(dates,'{}'::date[]) || coalesce(p_dates,'{}'::date[])) d) END,
      payload = payload || coalesce(p_payload,'{}'::jsonb),
      summary = p_summary,
      linked_ref = coalesce(p_linked_ref, linked_ref),
      updated_at = now(),
      created_at = now()
    WHERE id = v_row.id RETURNING * INTO v_row;
    v_merged := true;
  ELSE
    INSERT INTO public.schedule_timeline_entries (user_id, tag, start_date, end_date, dates, source, payload, summary, linked_ref)
    VALUES (v_uid, p_tag, p_start, p_end, p_dates, p_source, coalesce(p_payload,'{}'::jsonb), p_summary, p_linked_ref)
    RETURNING * INTO v_row;
  END IF;
  RETURN jsonb_build_object('merged', v_merged, 'entry', to_jsonb(v_row));
END $$;

CREATE OR REPLACE FUNCTION public.tell_hammers_undo(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.schedule_timeline_entries SET undone_at = now(), updated_at = now()
   WHERE id = p_id AND user_id = auth.uid() AND undone_at IS NULL AND created_at > now() - interval '24 hours';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
GRANT EXECUTE ON FUNCTION public.tell_hammers_save(text, date, date, date[], text, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tell_hammers_undo(uuid) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_timeline_entries;