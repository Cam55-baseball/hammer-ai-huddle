-- Fix training_data public access
DROP POLICY IF EXISTS "Everyone can view training data" ON public.training_data;

-- Create restrictive policy requiring authentication
CREATE POLICY "Authenticated users can view training data"
ON public.training_data
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create audit_log table for sensitive data access tracking
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only owners can view audit logs
CREATE POLICY "Owners can view audit logs"
ON public.audit_log
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- Service role can insert audit logs (from edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_table_name ON public.audit_log(table_name);