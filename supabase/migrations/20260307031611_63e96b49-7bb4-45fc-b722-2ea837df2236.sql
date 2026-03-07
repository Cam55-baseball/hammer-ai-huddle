ALTER TABLE public.game_opponents 
  ADD COLUMN IF NOT EXISTS matchup_context text DEFAULT 'game';

ALTER TABLE public.game_opponents 
  ADD CONSTRAINT valid_opponent_type CHECK (opponent_type IN ('pitcher', 'hitter', 'team'));