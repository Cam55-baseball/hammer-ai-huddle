-- Add scout role to app_role enum (must be in separate transaction)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'scout') THEN
    ALTER TYPE app_role ADD VALUE 'scout';
  END IF;
END $$;