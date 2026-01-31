-- Add pain_scales JSONB column to store per-area pain levels
ALTER TABLE vault_focus_quizzes
ADD COLUMN IF NOT EXISTS pain_scales JSONB DEFAULT NULL;

COMMENT ON COLUMN vault_focus_quizzes.pain_scales IS 
'Maps body area IDs to their pain levels (1-10). Example: {"lower_abs": 3, "head_front": 7}';