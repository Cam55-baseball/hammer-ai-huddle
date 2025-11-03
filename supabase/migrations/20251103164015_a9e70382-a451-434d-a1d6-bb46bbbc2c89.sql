-- Add RLS policies for admins to manage scout applications

-- Allow admins to view all scout applications
CREATE POLICY "Admins can view all applications"
ON scout_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update scout applications
CREATE POLICY "Admins can update applications"
ON scout_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));