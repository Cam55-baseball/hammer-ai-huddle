-- Add next_entry_date columns for time-locked entries
ALTER TABLE vault_performance_tests 
ADD COLUMN IF NOT EXISTS next_entry_date DATE;

ALTER TABLE vault_progress_photos
ADD COLUMN IF NOT EXISTS next_entry_date DATE;

-- Add comment explaining the purpose
COMMENT ON COLUMN vault_performance_tests.next_entry_date IS 'Date when next entry is allowed (6-week lock period)';
COMMENT ON COLUMN vault_progress_photos.next_entry_date IS 'Date when next entry is allowed (6-week lock period)';