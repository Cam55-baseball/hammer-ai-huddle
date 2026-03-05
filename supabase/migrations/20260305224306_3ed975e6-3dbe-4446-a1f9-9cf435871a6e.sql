ALTER TABLE public.games ADD COLUMN IF NOT EXISTS game_mode text DEFAULT 'team';
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS is_practice_game boolean DEFAULT false;