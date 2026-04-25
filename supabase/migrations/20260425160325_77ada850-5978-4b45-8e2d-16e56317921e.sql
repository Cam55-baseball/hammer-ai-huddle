CREATE TABLE IF NOT EXISTS public.user_nn_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.custom_activity_templates(id) ON DELETE CASCADE,
  score numeric(4,3) NOT NULL,
  completion_rate numeric(4,3) NOT NULL,
  total_completions_14d int NOT NULL DEFAULT 0,
  consistency_streak int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','accepted','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_nn_sugg_user_status
  ON public.user_nn_suggestions (user_id, status);

ALTER TABLE public.user_nn_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own NN suggestions"
  ON public.user_nn_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own NN suggestions"
  ON public.user_nn_suggestions FOR UPDATE
  USING (auth.uid() = user_id);
-- No INSERT/DELETE policies — server-side service role only.

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_nn_suggestions;