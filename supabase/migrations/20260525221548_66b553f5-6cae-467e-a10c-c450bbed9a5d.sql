CREATE POLICY "Athletes insert own events" ON public.asb_events FOR INSERT TO authenticated WITH CHECK (athlete_id = auth.uid() AND (actor_id IS NULL OR actor_id = auth.uid()));

CREATE POLICY "Athletes insert own lineage edges" ON public.asb_event_lineage FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.asb_events e WHERE e.event_id = asb_event_lineage.child_event_id AND e.athlete_id = auth.uid())
);