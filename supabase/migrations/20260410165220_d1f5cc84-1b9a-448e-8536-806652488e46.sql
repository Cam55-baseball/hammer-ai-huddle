ALTER TABLE public.drills
ADD COLUMN instructions jsonb DEFAULT NULL;

COMMENT ON COLUMN public.drills.instructions IS
'Structured drill instructions: {purpose, setup, execution[], coaching_cues[], mistakes[], progression[]}';