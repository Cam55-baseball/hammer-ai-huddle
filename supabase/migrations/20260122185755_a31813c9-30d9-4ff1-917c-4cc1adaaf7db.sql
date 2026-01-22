-- Add new columns to vault_focus_quizzes table for enhanced check-ins
ALTER TABLE vault_focus_quizzes
ADD COLUMN IF NOT EXISTS weight_lbs numeric,
ADD COLUMN IF NOT EXISTS perceived_recovery integer,
ADD COLUMN IF NOT EXISTS reaction_time_ms integer,
ADD COLUMN IF NOT EXISTS reaction_time_score integer,
ADD COLUMN IF NOT EXISTS balance_duration_seconds integer,
ADD COLUMN IF NOT EXISTS pain_location text[],
ADD COLUMN IF NOT EXISTS pain_scale integer,
ADD COLUMN IF NOT EXISTS pain_increases_with_movement boolean,
ADD COLUMN IF NOT EXISTS training_intent text[],
ADD COLUMN IF NOT EXISTS mental_energy integer;

-- Add comments for documentation
COMMENT ON COLUMN vault_focus_quizzes.weight_lbs IS 'Morning check-in: daily weight in pounds';
COMMENT ON COLUMN vault_focus_quizzes.perceived_recovery IS 'Morning check-in: perceived recovery score 1-10';
COMMENT ON COLUMN vault_focus_quizzes.reaction_time_ms IS 'Pre-workout CNS: average reaction time in milliseconds';
COMMENT ON COLUMN vault_focus_quizzes.reaction_time_score IS 'Pre-workout CNS: normalized reaction score 0-100';
COMMENT ON COLUMN vault_focus_quizzes.balance_duration_seconds IS 'Pre-workout CNS: single-leg balance hold duration';
COMMENT ON COLUMN vault_focus_quizzes.pain_location IS 'Pre-workout: array of body areas with pain';
COMMENT ON COLUMN vault_focus_quizzes.pain_scale IS 'Pre-workout: overall pain severity 1-10';
COMMENT ON COLUMN vault_focus_quizzes.pain_increases_with_movement IS 'Pre-workout: does pain increase with movement';
COMMENT ON COLUMN vault_focus_quizzes.training_intent IS 'Pre-workout: array of training intentions (A,B,C,D)';
COMMENT ON COLUMN vault_focus_quizzes.mental_energy IS 'Pre-workout: mental energy level 1-5';