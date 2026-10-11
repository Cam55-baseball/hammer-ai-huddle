CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  parent_copied boolean NOT NULL DEFAULT false,
  parent_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX coach_messages_athlete_idx ON public.coach_messages(athlete_id, created_at DESC);

CREATE POLICY "coach reads own sent" ON public.coach_messages FOR SELECT TO authenticated
  USING (coach_id = auth.uid());
CREATE POLICY "athlete reads unless parent only" ON public.coach_messages FOR SELECT TO authenticated
  USING (athlete_id = auth.uid() AND NOT parent_only);
CREATE POLICY "linked parent reads copies" ON public.coach_messages FOR SELECT TO authenticated
  USING ((parent_copied OR parent_only) AND public.is_authorizing_parent(auth.uid(), athlete_id));

CREATE OR REPLACE FUNCTION public.send_coach_message(_athlete uuid, _body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _u13 boolean; _minor boolean; _id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  IF _body IS NULL OR char_length(btrim(_body)) = 0 OR char_length(_body) > 2000 THEN
    RAISE EXCEPTION 'message_length'; END IF;
  IF NOT (public.is_coach_of(_me, _athlete) OR public.is_linked_coach(_me, _athlete)) THEN
    RAISE EXCEPTION 'not_your_player'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=_me AND b.blocked_id=_athlete) OR (b.blocker_id=_athlete AND b.blocked_id=_me)) THEN
    RAISE EXCEPTION 'not_your_player'; END IF;
  _u13 := public.is_under_13(_athlete);
  _minor := _u13 OR COALESCE((SELECT date_of_birth IS NOT NULL AND date_part('year', age(current_date, date_of_birth))::int < 18 FROM public.profiles WHERE id=_athlete), false);
  IF _minor AND NOT EXISTS (SELECT 1 FROM public.parent_athlete_links WHERE athlete_user_id=_athlete AND status='active' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'parent_link_required'; END IF;
  INSERT INTO public.coach_messages(coach_id, athlete_id, body, parent_copied, parent_only)
  VALUES (_me, _athlete, btrim(_body), _minor AND NOT _u13, _u13) RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.send_coach_message(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.send_coach_message(uuid, text) TO authenticated;