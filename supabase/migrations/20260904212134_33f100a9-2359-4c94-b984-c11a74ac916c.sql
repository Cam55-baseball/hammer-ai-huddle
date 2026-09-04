ALTER TABLE public.wk_movement_catalog DROP COLUMN game_day_eligible;
ALTER TABLE public.wk_movement_catalog
  ADD COLUMN game_day_eligible boolean GENERATED ALWAYS AS (game_day_legal) STORED;
COMMENT ON COLUMN public.wk_movement_catalog.game_day_legal IS
  'CANONICAL game-day legality. Only an explicit false blocks selection; NULL means untagged. Enforced identically at generation (wk-generate-daily eligibleWith) and at publish (bat-speed/speed certifiers).';
COMMENT ON COLUMN public.wk_movement_catalog.game_day_eligible IS
  'DEPRECATED mirror of game_day_legal (generated). Do not write. Read game_day_legal.';