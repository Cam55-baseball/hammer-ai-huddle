CREATE TABLE public.game_opponents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_name text NOT NULL,
  opponent_type text NOT NULL DEFAULT 'pitcher',
  last_faced_at timestamptz DEFAULT now(),
  times_faced int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.game_opponents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own opponents" ON public.game_opponents
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE UNIQUE INDEX idx_game_opponents_unique ON public.game_opponents(user_id, opponent_name, opponent_type);