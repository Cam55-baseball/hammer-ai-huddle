-- Add bedtime_goal and wake_time_goal columns for Night Reflection sleep goals
ALTER TABLE vault_focus_quizzes 
ADD COLUMN IF NOT EXISTS bedtime_goal TIME,
ADD COLUMN IF NOT EXISTS wake_time_goal TIME;

-- Add comment for documentation
COMMENT ON COLUMN vault_focus_quizzes.bedtime_goal IS 'User planned bedtime for the next day (set in Night Reflection)';
COMMENT ON COLUMN vault_focus_quizzes.wake_time_goal IS 'User planned wake time for the next day (set in Night Reflection)';