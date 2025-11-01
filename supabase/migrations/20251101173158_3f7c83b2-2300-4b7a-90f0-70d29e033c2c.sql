-- Create app_settings table for global configuration
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view app settings (public configuration)
CREATE POLICY "Everyone can view app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Only owners can insert app settings
CREATE POLICY "Owners can insert app settings"
ON public.app_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'owner'));

-- Only owners can update app settings
CREATE POLICY "Owners can update app settings"
ON public.app_settings
FOR UPDATE
USING (has_role(auth.uid(), 'owner'));

-- Add initial setting for rankings visibility (enabled by default)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('rankings_visible', '{"enabled": true}'::jsonb);