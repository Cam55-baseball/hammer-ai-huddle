
-- 1. Create game_plan_days table
CREATE TABLE public.game_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.game_plan_days ENABLE ROW LEVEL SECURITY;

-- 2. RLS policies
CREATE POLICY "Users can read own game_plan_days"
  ON public.game_plan_days FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own game_plan_days"
  ON public.game_plan_days FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own game_plan_days"
  ON public.game_plan_days FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Day completion trigger function (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.update_game_plan_day_completion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.game_plan_days (user_id, date, is_completed, updated_at)
  VALUES (
    NEW.user_id,
    NEW.entry_date,
    NOT EXISTS (
      SELECT 1 FROM public.custom_activity_logs
      WHERE user_id = NEW.user_id
        AND entry_date = NEW.entry_date
        AND completed = false
    ),
    now()
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    is_completed = NOT EXISTS (
      SELECT 1 FROM public.custom_activity_logs
      WHERE user_id = NEW.user_id
        AND entry_date = NEW.entry_date
        AND completed = false
    ),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Trigger on custom_activity_logs
CREATE TRIGGER trigger_update_day_completion
AFTER INSERT OR UPDATE OF completed
ON public.custom_activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_game_plan_day_completion();

-- 5. Backfill existing data
INSERT INTO public.game_plan_days (user_id, date, is_completed)
SELECT
  cal.user_id,
  cal.entry_date,
  NOT EXISTS (
    SELECT 1 FROM public.custom_activity_logs cal2
    WHERE cal2.user_id = cal.user_id
      AND cal2.entry_date = cal.entry_date
      AND cal2.completed = false
  )
FROM public.custom_activity_logs cal
GROUP BY cal.user_id, cal.entry_date
ON CONFLICT (user_id, date) DO NOTHING;

-- 6. Updated_at trigger
CREATE TRIGGER trigger_game_plan_days_updated_at
BEFORE UPDATE ON public.game_plan_days
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_plan_days;
