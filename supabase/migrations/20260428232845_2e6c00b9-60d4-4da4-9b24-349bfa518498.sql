-- Per-user Game Plan preferences (sort mode + saved orders)
CREATE TABLE IF NOT EXISTS public.game_plan_user_preferences (
  user_id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_mode             text NOT NULL DEFAULT 'auto' CHECK (sort_mode IN ('auto','manual','timeline')),
  timeline_order        text[] NOT NULL DEFAULT '{}'::text[],
  manual_order_checkin  text[] NOT NULL DEFAULT '{}'::text[],
  manual_order_training text[] NOT NULL DEFAULT '{}'::text[],
  manual_order_tracking text[] NOT NULL DEFAULT '{}'::text[],
  manual_order_custom   text[] NOT NULL DEFAULT '{}'::text[],
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_plan_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game plan preferences"
  ON public.game_plan_user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game plan preferences"
  ON public.game_plan_user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game plan preferences"
  ON public.game_plan_user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own game plan preferences"
  ON public.game_plan_user_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_game_plan_user_preferences_updated_at
  BEFORE UPDATE ON public.game_plan_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_plan_user_preferences;
ALTER TABLE public.game_plan_user_preferences REPLICA IDENTITY FULL;