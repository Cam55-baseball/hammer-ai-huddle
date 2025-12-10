-- Add supplement_goals column to vault_nutrition_goals
ALTER TABLE vault_nutrition_goals 
ADD COLUMN supplement_goals JSONB DEFAULT '[]'::jsonb;

-- Create vault_supplement_tracking table for daily checklist
CREATE TABLE vault_supplement_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplements_taken JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Enable RLS
ALTER TABLE vault_supplement_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for vault_supplement_tracking
CREATE POLICY "Users can view own supplement tracking"
ON vault_supplement_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supplement tracking"
ON vault_supplement_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supplement tracking"
ON vault_supplement_tracking FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own supplement tracking"
ON vault_supplement_tracking FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all supplement tracking"
ON vault_supplement_tracking FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_vault_supplement_tracking_updated_at
BEFORE UPDATE ON vault_supplement_tracking
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();