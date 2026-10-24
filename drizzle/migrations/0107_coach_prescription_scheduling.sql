-- Coach prescription scheduling (owner request Oct 24, run 6).
-- Adds schedule shape (any day / specific dates / recurring), series grouping so a
-- recurring or multi-date send materializes as one row per player per day (the
-- existing Today inbox query keeps working unchanged), and sender edit/cancel of
-- future unanswered dates. No existing column, status value or safety rule changes.
ALTER TABLE public.coach_prescriptions
  ADD COLUMN schedule_type text NOT NULL DEFAULT 'date' CHECK (schedule_type IN ('any_day','date','dates','recurring')),
  ADD COLUMN series_id uuid NULL,
  ADD COLUMN recur_weekdays int[] NULL,
  ADD COLUMN recur_every_weeks int NULL,
  ADD COLUMN recur_monthly_ordinal int NULL,
  ADD COLUMN recur_monthly_weekday int NULL,
  ADD COLUMN recur_end date NULL,
  ADD COLUMN recur_count int NULL,
  ADD COLUMN cancelled_at timestamptz NULL;
COMMENT ON COLUMN public.coach_prescriptions.schedule_type IS 'any_day = player picks when (anchored at send date); date/dates = fixed days; recurring = weekdays every X weeks or monthly ordinal weekday, bounded by recur_end or recur_count.';
COMMENT ON COLUMN public.coach_prescriptions.series_id IS 'Groups all per-player-per-day rows materialized from one send (recurring, multi-date or team), so the coach can edit or cancel future dates together.';
COMMENT ON COLUMN public.coach_prescriptions.cancelled_at IS 'Set when the sender cancels a future unanswered date; cancelled rows never appear on Today or the calendar.';
CREATE INDEX coach_prescriptions_recipient_date ON public.coach_prescriptions(recipient_id, plan_date);
CREATE INDEX coach_prescriptions_series ON public.coach_prescriptions(series_id) WHERE series_id IS NOT NULL;
-- Senders can update (reschedule) or cancel their own future, still-unanswered sends.
CREATE POLICY "Sender can update own pending sends" ON public.coach_prescriptions FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() AND status = 'pending') WITH CHECK (sender_id = auth.uid());