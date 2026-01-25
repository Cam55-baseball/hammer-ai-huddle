-- Drop the existing unique constraint to allow multiple notes per day
ALTER TABLE vault_free_notes DROP CONSTRAINT IF EXISTS vault_free_notes_user_id_entry_date_key;

-- Create an index for efficient querying (replaces the unique constraint's implicit index)
CREATE INDEX IF NOT EXISTS idx_vault_free_notes_user_date 
  ON vault_free_notes(user_id, entry_date);