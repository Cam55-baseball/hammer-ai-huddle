ALTER TABLE public.vault_vitamin_logs
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'supplement',
  ADD COLUMN IF NOT EXISTS unit text DEFAULT 'mg',
  ADD COLUMN IF NOT EXISTS purpose text;