-- Add status column to user_roles for admin approval system
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add check constraint for valid status values
ALTER TABLE user_roles
ADD CONSTRAINT user_roles_status_check 
CHECK (status IN ('active', 'pending', 'rejected'));

-- Update existing roles to 'active' status
UPDATE user_roles SET status = 'active' WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_roles.status IS 'Status of the role assignment: active (approved), pending (awaiting approval), rejected (denied by owner)';