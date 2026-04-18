ALTER TABLE public.block_exercises DROP CONSTRAINT IF EXISTS chk_block_exercises_reps;
ALTER TABLE public.block_exercises ADD CONSTRAINT chk_block_exercises_reps CHECK (reps >= 1 AND reps <= 30);